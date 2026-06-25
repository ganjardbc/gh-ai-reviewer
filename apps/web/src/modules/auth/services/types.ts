import type { AuthUser } from '@gh-skeleton/shared-types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface MerchantInfo {
  slug: string;
  name: string;
  phone?: string;
  address?: string;
  logo?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  merchant: MerchantInfo;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
  rbac: any[];
}

export interface RegisterResponse extends AuthResponse {
  merchant: {
    id: string;
    name: string;
    slug: string;
  };
}
