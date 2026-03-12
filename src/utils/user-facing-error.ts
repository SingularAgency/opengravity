export interface UserFacingErrorOptions {
  hint?: string;
  details?: string;
  source?: string;
}

export class UserFacingError extends Error {
  hint?: string;
  details?: string;
  source?: string;

  constructor(message: string, options?: UserFacingErrorOptions) {
    super(message);
    this.name = "UserFacingError";
    this.hint = options?.hint;
    this.details = options?.details;
    this.source = options?.source;
  }

  toUserMessage() {
    let result = this.message;
    if (this.hint) {
      result += ` ${this.hint}`;
    }
    if (this.details) {
      result += ` Detalle técnico: ${this.details}.`;
    }
    if (this.source) {
      result += ` (Origen: ${this.source})`;
    }
    return result;
  }
}

export function formatUserFacingError(
  label: string,
  error: unknown
): string {
  if (error instanceof UserFacingError) {
    return error.toUserMessage();
  }

  const technical = error instanceof Error ? error.message : String(error);
  return `${label}. Detalle técnico: ${technical}. Revisa los logs locales para más contexto.`;
}
