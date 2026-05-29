export interface ErrorBody {
  error: string;
  code?: string;
  details?: unknown;
}

export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(status: number, message: string, options: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function jsonResponse(body: unknown, init: ResponseInit | number = 200): Response {
  const responseInit = typeof init === 'number' ? { status: init } : init;
  const headers = new Headers(responseInit.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json; charset=utf-8');
  }

  return new Response(JSON.stringify(body), {
    ...responseInit,
    headers,
  });
}

export function errorResponse(
  status: number,
  message: string,
  options: Omit<ErrorBody, 'error'> = {}
): Response {
  return jsonResponse(
    {
      error: message,
      ...options,
    },
    status
  );
}

export function responseFromError(error: unknown): Response {
  if (error instanceof HttpError) {
    return errorResponse(error.status, error.message, {
      code: error.code,
      details: error.details,
    });
  }

  return errorResponse(500, 'Internal server error');
}
