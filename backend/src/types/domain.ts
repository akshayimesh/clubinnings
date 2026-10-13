export const ROLES = ['admin', 'coach', 'player'] as const;
export type Role = (typeof ROLES)[number];

export const PLANS = ['free', 'pro', 'academy'] as const;
export type Plan = (typeof PLANS)[number];

export interface Club {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  createdAt: Date;
}

export interface User {
  id: string;
  clubId: string;
  email: string;
  role: Role;
  createdAt: Date;
}

/** Identity attached to authenticated requests by requireAuth. */
export interface AuthContext {
  userId: string;
  clubId: string;
  role: Role;
}
