const BEDS24_API = 'https://beds24.com/api/v2';
import { Beds24AccessToken, Beds24Tokens } from '@/types/auth';

export async function getTokensByInviteCode() {
  if (!process.env.BEDS24_INVITE_CODE) throw new Error('Beds24 invite code is not set')
  
  try {
    const response = await fetch(`${BEDS24_API}/authentication/setup`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'code': process.env.BEDS24_INVITE_CODE,
        'deviceName': 'development'
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error getting tokens from invite code, please check your invite code:', errorText);
      throw new Error(`Error getting tokens from invite code, please check your invite code: ${response.status} ${response.statusText}`);
    }

    const data:Beds24Tokens = await response.json();

    if (!data.token) {
      console.error('No token in response:', data);
      throw new Error('No token received from Beds24, please check your invite code');
    }

    return data;
  } catch (error) {
    console.error('Failed to get access token, please check your invite code:', error);
    throw error;
  }
};

export async function getAccessToken() {
  try {
    const refreshToken = process.env.BEDS24_REFRESH_TOKEN || (await getTokensByInviteCode()).refreshToken;
    if (!refreshToken) throw new Error('Error getting refresh token, please check your invite code');
    
    const response = await fetch(`${BEDS24_API}/authentication/token`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'refreshToken': refreshToken,
      },
    });


    if (!response.ok) {
      const errorText = await response.json();
      console.error('Failed to refresh token:', errorText);
      throw new Error(`Failed to refresh token: ${errorText.error}`);
    }

    const data: Beds24AccessToken = await response.json();

    if (!data.token) {
      throw new Error('No token in response');
    }

    return data;
  } catch (error) {
    console.error('Failed to get access token, please check your refresh token:', error);
    throw error;
  }
}

let cachedToken: string | null = null;
let tokenExpiry: number = 0;


export async function beds24Request<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<T> {
  try {
  // Check if token is expired or missing
    const now = Date.now();
    if (!cachedToken || now >= tokenExpiry) {
      const tokenData = await getAccessToken();
      cachedToken = tokenData.token;
      tokenExpiry = now + (tokenData.expiresIn * 1000);
    }

    console.log('cachedToken', cachedToken);
    // Make request
    const response = await fetch(`${BEDS24_API}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'token': cachedToken,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // If 401, refresh token and retry
    if (response.status === 401) {
      const tokenData = await getAccessToken();
      cachedToken = tokenData.token;
      tokenExpiry = now + (tokenData.expiresIn * 1000);

      // Retry request
      const retryResponse = await fetch(`${BEDS24_API}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'token': cachedToken,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        console.error('Error response:', errorText);
        throw new Error(`Beds24 API error: ${errorText}`);
      }

      return await retryResponse.json();
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Beds24 API error: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Beds24 API request failed [${endpoint}]:`, error);
    throw error;
  }
}