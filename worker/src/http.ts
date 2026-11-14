export function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  const h = new Headers(headers);
  h.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers: h });
}

export function errorResponse(status: number, error: string, message: string): Response {
  return jsonResponse({ error, message }, status);
}

export function formResult(redirect: string, error: string | null = null): Response {
  return jsonResponse({ success: error === null, error, redirect }, error === null ? 200 : 422);
}

export function methodNotAllowed(allowed: string, message: string): Response {
  return jsonResponse({ error: 'invalidrequest', message }, 405, { Allow: allowed });
}

// PHP trim() default characters only; String.prototype.trim strips more (e.g. NBSP).
export function phpTrim(value: string): string {
  return value.replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, '');
}

// Matches PHP preg_match_all('/./us').
export function codePointLength(value: string): number {
  return [...value].length;
}

export async function readForm(request: Request): Promise<FormData | null> {
  try {
    return await request.formData();
  } catch {
    return null;
  }
}

export function formString(form: FormData, name: string): string | null {
  const value = form.get(name);
  return typeof value === 'string' ? value : null;
}
