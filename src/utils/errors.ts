export function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function assertNever(value: never): never {
  throw new Error(`unsupported action: ${String(value)}`);
}
