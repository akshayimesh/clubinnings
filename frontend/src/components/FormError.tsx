import { ApiError } from '../api/client';

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const details = Array.isArray(err.details)
      ? (err.details as { message?: string }[]).map((d) => d.message).filter(Boolean)
      : [];
    return details.length > 0 ? details.join('. ') : err.message;
  }
  return 'Could not reach the server. Is the API running?';
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="error" role="alert">
      {message}
    </p>
  );
}
