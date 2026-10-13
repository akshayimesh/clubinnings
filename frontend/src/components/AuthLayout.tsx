import type { ReactNode } from 'react';

/** Centered card used by the login and signup pages. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="auth">
      <div className="card">
        <p className="brand">ClubInnings</p>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
      </div>
    </main>
  );
}
