const APALEO_IDENTITY_URL = 'https://identity.apaleo.com/connect/token';
const APALEO_API_URL = 'https://api.apaleo.com';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;
// One in-flight refresh shared by all concurrent callers, so a burst of
// requests (webhook / booking-create) doesn't fire N parallel identity calls
// when the token is missing or expired.
let inflightRefresh: Promise<string> | null = null;

// 1. Get access token from Apaleo (returns the token and its real lifetime)
export async function getApaleoAccessToken(): Promise<{ accessToken: string; expiresIn: number }> {
  const clientId = process.env.APALEO_CLIENT_ID;
  const clientSecret = process.env.APALEO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('APALEO_CLIENT_ID and APALEO_CLIENT_SECRET are required');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(APALEO_IDENTITY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  return { accessToken: data.access_token, expiresIn };
}

// 2. Get or refresh token (cached, with concurrent-refresh coalescing)
export async function getOrRefreshToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  if (!inflightRefresh) {
    inflightRefresh = (async () => {
      try {
        const { accessToken, expiresIn } = await getApaleoAccessToken();
        cachedToken = accessToken;
        // Honour the server-provided lifetime with a 60s safety buffer, so we
        // never serve a token that's already dead server-side.
        tokenExpiry = Date.now() + Math.max(60, expiresIn - 60) * 1000;
        return accessToken;
      } finally {
        inflightRefresh = null;
      }
    })();
  }

  return inflightRefresh;
}

// 3. Make request to Apaleo API
export async function Fetch<T>(
  endpoint: string, 
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
  },
  retry: boolean = true
): Promise<T> {
  const token = await getOrRefreshToken();

  const response = await fetch(`${APALEO_API_URL}${endpoint}`, {
    method: options?.method || 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      ...(options?.body && { 'Content-Type': 'application/json' }),
    },
    ...(options?.body && { body: JSON.stringify(options.body) }),
  });
  
  // Handle 204 No Content - return empty object/array
  if (response.status === 204) return {} as T;

  // If 401 and we haven't retried yet, refresh token and retry
  if (response.status === 401 && retry) {
    console.log('Token expired (401), refreshing and retrying...');
    cachedToken = null; // Force token refresh
    return Fetch<T>(endpoint, options, false); // Retry once
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(`Apaleo API error ${response.status}:`, errorData);
    throw new Error(`Apaleo API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  return await response.json();
}