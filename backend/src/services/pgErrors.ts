const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

interface PgError {
  code: string;
  constraint?: string;
}

function isPgError(err: unknown): err is PgError {
  return typeof err === 'object' && err !== null && typeof (err as { code?: unknown }).code === 'string';
}

/** The constraint name when `err` is a unique violation, otherwise undefined. */
export function uniqueViolation(err: unknown): string | undefined {
  return isPgError(err) && err.code === PG_UNIQUE_VIOLATION ? (err.constraint ?? '') : undefined;
}

export function isForeignKeyViolation(err: unknown): boolean {
  return isPgError(err) && err.code === PG_FOREIGN_KEY_VIOLATION;
}
