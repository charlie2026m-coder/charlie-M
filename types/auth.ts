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

export interface ApaleoTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}