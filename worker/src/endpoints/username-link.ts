import { requirePlayer } from '../auth';
import type { Env } from '../env';
import { errorResponse, jsonResponse, methodNotAllowed } from '../http';
import { registerAuthUsername, SupabaseRequestError } from '../supabase';

// The request body is ignored: username and email come only from the verified token user.
export async function handleUsernameLink(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed('POST', 'Use POST to save the username.');

  const player = await requirePlayer(request, env);
  if (player instanceof Response) return player;

  let success: boolean;
  try {
    success = await registerAuthUsername(env, player.username, player.email);
  } catch (error) {
    if (!(error instanceof SupabaseRequestError)) throw error;
    return errorResponse(503, 'usernameunavailable', 'Could not save your username.');
  }
  if (!success) return errorResponse(409, 'usernametaken', 'That username is already in use.');
  return jsonResponse({ success: true });
}
