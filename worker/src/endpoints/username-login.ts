import type { Env } from '../env';
import { errorResponse, jsonResponse, methodNotAllowed, phpTrim } from '../http';
import { getAuthEmailForUsername, passwordSignIn, SupabaseRequestError } from '../supabase';

const MAX_BODY_BYTES = 4096;
const MAX_PASSWORD_BYTES = 1024;
const encoder = new TextEncoder();

const tooLarge = () => errorResponse(413, 'invalidrequest', 'The sign-in request is too large.');
const badCredentials = () => errorResponse(401, 'invalidcredentials', 'The username or password is incorrect.');
const authUnavailable = () => errorResponse(503, 'authunavailable', 'Sign-in is temporarily unavailable.');

// Takes a password: never log the body.
export async function handleUsernameLogin(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed('POST', 'Use POST for username sign-in.');

  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY_BYTES) return tooLarge();
  const text = await request.text();
  if (encoder.encode(text).length > MAX_BODY_BYTES) return tooLarge();

  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return errorResponse(400, 'invalidrequest', 'Invalid sign-in request.');
  }

  const fields = typeof input === 'object' && input !== null && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const username = typeof fields.username === 'string' ? phpTrim(fields.username).toLowerCase() : '';
  const password = typeof fields.password === 'string' ? fields.password : '';
  if (!/^[a-z0-9]{1,64}$/.test(username) || password === '' || encoder.encode(password).length > MAX_PASSWORD_BYTES) {
    return errorResponse(400, 'invalidrequest', 'Enter a valid username and password.');
  }

  let email: string | null;
  try {
    email = await getAuthEmailForUsername(env, username);
  } catch (error) {
    if (!(error instanceof SupabaseRequestError)) throw error;
    return authUnavailable();
  }
  if (email === null) return badCredentials();

  let session;
  try {
    session = await passwordSignIn(env, email, password);
  } catch (error) {
    if (!(error instanceof SupabaseRequestError)) throw error;
    return authUnavailable();
  }
  if (session === null) return badCredentials();

  return jsonResponse({ access_token: session.access_token, refresh_token: session.refresh_token });
}
