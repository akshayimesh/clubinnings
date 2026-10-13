import { apiRequest } from './client';

export type Role = 'admin' | 'coach' | 'player';

export interface User {
  id: string;
  clubId: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Club {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  club: Club;
}

export interface SignupInput {
  clubName: string;
  clubSlug?: string;
  email: string;
  password: string;
}

export const authApi = {
  signup: (input: SignupInput) => apiRequest<AuthResponse>('/api/auth/signup', { method: 'POST', json: input }),
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>('/api/auth/login', { method: 'POST', json: { email, password } }),
  me: () => apiRequest<{ user: User; club: Club }>('/api/me'),
};
