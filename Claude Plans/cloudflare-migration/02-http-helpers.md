# Step 02: HTTP helpers

## Goal
Small, pure helpers that every endpoint uses. They replace `includes/http-response.inc.php` and the PHP input-reading idioms.

## File: `worker/src/http.ts`

```ts
export function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}): Response
// Content-Type: application/json; charset=utf-8; body = JSON.stringify(body)

export function errorResponse(status: number, error: string, message: string): Response
// jsonResponse({ error, message }, status)

export function formResult(redirect: string, error: string | null = null): Response
// Port of finishRequest() JSON mode:
// status 200 if error === null, else 422
// body { success: error === null, error, redirect }

export function methodNotAllowed(allowed: string, message: string): Response
// 405, header Allow: <allowed>, body { error: 'invalidrequest', message }

export function phpTrim(value: string): string
// Strip only PHP trim()'s default characters from both ends: " \t\n\r\0\x0B"
// Do NOT use String.prototype.trim (it strips more Unicode whitespace than PHP).

export function codePointLength(value: string): number
// [...value].length. Matches PHP preg_match_all('/./us').

export async function readForm(request: Request): Promise<FormData | null>
// Returns null if the body isn't valid multipart/urlencoded form data (catch the error).

export function formString(form: FormData, name: string): string | null
// Returns the value if it is a string, null if missing or a File.
```

Notes:
- The PHP code had a non-JSON "redirect" mode. The React app always sends `Accept: application/json`, so the Worker **always** answers JSON. Don't port the `Location:` redirect branch.
- `formResult` keeps the `redirect` field so the response shape matches PHP exactly.

## Tests to write: `worker/test/http.test.ts`
- `jsonResponse({a:1})` gives status 200, the JSON content type, and a body that parses to `{a:1}`.
- `errorResponse(503, 'x', 'y')` gives status 503 and body `{error:'x', message:'y'}`.
- `formResult('/accounts/?account=created')` gives 200 and `{success:true, error:null, redirect:'/accounts/?account=created'}`.
- `formResult('/transfer/?error=invalidamount', 'invalidamount')` gives 422 and `success:false`.
- `methodNotAllowed('POST', 'm')` gives 405, the `Allow: POST` header, and `error:'invalidrequest'`.
- `phpTrim`:
  - `'  a b \t\n'` → `'a b'`
  - `'\0\x0Ba\x0B'` → `'a'`
  - `' a '` → unchanged (PHP doesn't strip NBSP)
  - `''` → `''`
- `codePointLength`: `'abc'` → 3, `'💰💰'` → 2, `'é'` (precomposed) → 1.
- `readForm` on a `Request` with a `FormData` body returns the entries, and on a body of `'not a form'` with `Content-Type: application/json` it returns `null`.
- `formString`: a missing key gives `null`, a string gives the string, and a `File` entry gives `null`.

## Acceptance checks
- `npm test` passes. `npx tsc -p worker` is clean.
- No other files changed.
