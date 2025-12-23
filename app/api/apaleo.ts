const APALEO_IDENTITY_URL = 'https://identity.apaleo.com/connect/token';
const APALEO_API_URL = 'https://api.apaleo.com';

import { ApaleoTokenResponse } from '@/types/auth';

/**
 * Get Apaleo access token using OAuth2 Client Credentials flow
 * Uses Basic Authentication with client_id:client_secret encoded in base64
 */
export async function getApaleoAccessToken(): Promise<ApaleoTokenResponse> {
  const clientId = process.env.APALEO_CLIENT_ID;
  const clientSecret = process.env.APALEO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Apaleo client ID and secret are not set in environment variables');
  }

  // Create Basic Auth header: base64(client_id:client_secret)
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch(APALEO_IDENTITY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error getting Apaleo token:', errorText);
      throw new Error(`Failed to get Apaleo access token: ${response.status} ${response.statusText}`);
    }

    const data: ApaleoTokenResponse = await response.json();

    if (!data.access_token) {
      console.error('No access token in response:', data);
      throw new Error('No access token received from Apaleo');
    }

    return data;
  } catch (error) {
    console.error('Failed to get Apaleo access token:', error);
    throw error;
  }
}

// Token cache
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get cached or fresh Apaleo access token
 * Automatically refreshes if expired
 */
async function getCachedApaleoToken(): Promise<string> {
  const now = Date.now();
  
  // Check if token is expired or missing (with 60 second buffer)
  if (!cachedToken || now >= tokenExpiry - 60000) {
    const tokenData = await getApaleoAccessToken();
    cachedToken = tokenData.access_token;
    // expires_in is in seconds, convert to milliseconds
    tokenExpiry = now + (tokenData.expires_in * 1000);
  }

  return cachedToken;
}

/**
 * Make authenticated request to Apaleo API
 * Automatically handles token refresh and retries on 401
 */
export async function apaleoRequest<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: any,
  options?: {
    headers?: Record<string, string>;
    retryOn401?: boolean;
  }
): Promise<T> {
  const { headers: customHeaders = {}, retryOn401 = true } = options || {};

  try {
    const accessToken = await getCachedApaleoToken();

    // Make request
    const response = await fetch(`${APALEO_API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        ...customHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // If 401 and retry enabled, refresh token and retry once
    if (response.status === 401 && retryOn401) {
      // Clear cache and get new token
      cachedToken = null;
      tokenExpiry = 0;
      const newToken = await getCachedApaleoToken();

      // Retry request
      const retryResponse = await fetch(`${APALEO_API_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${newToken}`,
          ...customHeaders,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!retryResponse.ok) {
        const errorData = await retryResponse.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Apaleo API Error (retry):', JSON.stringify(errorData, null, 2));
        throw new Error(`Apaleo API Error: ${errorData.message || errorData.error || JSON.stringify(errorData)}`);
      }

      return await retryResponse.json();
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Apaleo API Error:', JSON.stringify(errorData, null, 2));
      throw new Error(`Apaleo API Error: ${errorData.message || errorData.error || JSON.stringify(errorData)}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Apaleo API request failed [${endpoint}]:`, error);
    throw error;
  }
}

