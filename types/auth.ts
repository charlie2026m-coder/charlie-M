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