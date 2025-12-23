export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  requiresEmailConfirmation?: boolean;
}

export interface Beds24Tokens {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Beds24AccessToken {
  token: string;
  expiresIn: number;
}

export interface ApaleoTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}