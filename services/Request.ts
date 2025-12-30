const APALEO_IDENTITY_URL = 'https://identity.apaleo.com/connect/token';
const APALEO_API_URL = 'https://api.apaleo.com';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

// 1. Get access token from Apaleo
export async function getApaleoAccessToken(): Promise<string> {
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
  return data.access_token;
}

// 2. Get or refresh token (with cache)
export async function getOrRefreshToken(): Promise<string> {
  const now = Date.now();

  // If token is expired or missing, get new one
  if (!cachedToken || now >= tokenExpiry) {
    cachedToken = await getApaleoAccessToken();
    tokenExpiry = now + (3600 * 1000); // 1 hour
  }

  return cachedToken;
}

// 3. Make request to Apaleo API
export async function Fetch<T>(
  endpoint: string, 
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
  }
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

  if (!response.ok) {
    throw new Error(`Apaleo API error: ${response.status}`);
  }

  return await response.json();
}