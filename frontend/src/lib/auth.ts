import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';
import { requestJson } from './api';

const pendingSignupKey = 'fab.pendingSignup';

function playerLookupError(result: { error?: string; message?: string }): Error {
  if (result.error === 'identitynotfound') {
    return new Error('That Discord account is not linked to an existing player identity.');
  }
  return new Error(result.message || 'Your existing player account could not be found.');
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isEmailIdentifier(identifier: string): boolean {
  return identifier.includes('@');
}

function validUsername(username: string): boolean {
  return /^[a-z0-9]{1,64}$/.test(username);
}

export async function signInWithIdentifier(identifier: string, password: string): Promise<void> {
  const client = getSupabaseClient();
  const normalizedIdentifier = identifier.trim();
  if (isEmailIdentifier(normalizedIdentifier)) {
    const { error } = await client.auth.signInWithPassword({
      email: normalizeEmail(normalizedIdentifier),
      password
    });
    if (error) throw error;
    return;
  }

  const username = normalizeUsername(normalizedIdentifier);
  if (!validUsername(username)) {
    throw new Error('Enter your username or email address.');
  }
  const result = await requestJson('/api/username-login.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (result.error) {
    throw new Error(result.message || 'The username or password is incorrect.');
  }
  if (
    typeof result.access_token !== 'string'
    || typeof result.refresh_token !== 'string'
  ) {
    throw new Error('Username sign-in returned an invalid response.');
  }
  const { error } = await client.auth.setSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token
  });
  if (error) throw error;
}

export async function signInWithDiscord(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${window.location.origin}/`,
      scopes: 'identify email'
    }
  });
  if (error) throw error;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${window.location.origin}/reset-password/`
  });
  if (error) throw error;
}

export async function beginSignup(
  username: string,
  email: string,
  password: string,
  displayName: string,
  discordId: string
): Promise<boolean> {
  const client = getSupabaseClient();
  const normalizedUsername = normalizeUsername(username);
  const normalizedDisplayName = displayName.trim();
  if (!validUsername(normalizedUsername)) {
    throw new Error('Username may contain only letters and numbers, up to 64 characters.');
  }
  if (!normalizedDisplayName || normalizedDisplayName.length > 100) {
    throw new Error('Enter a name no longer than 100 characters.');
  }
  if (!/^[0-9]{17,19}$/.test(discordId)) {
    throw new Error('Enter a valid Discord user ID.');
  }
  const normalizedEmail = normalizeEmail(email);
  localStorage.setItem(pendingSignupKey, JSON.stringify({
    username: normalizedUsername,
    email: normalizedEmail,
    discordId
  }));
  const { data, error } = await client.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        username: normalizedUsername,
        display_name: normalizedDisplayName
      },
      emailRedirectTo: `${window.location.origin}/signup/`
    }
  });
  if (error) {
    localStorage.removeItem(pendingSignupKey);
    throw error;
  }
  if (!data.session) return false;
  const isDiscordLinked = await continuePendingSignup(
    client,
    normalizedUsername,
    normalizedEmail,
    discordId
  );
  if (!isDiscordLinked) return true;
  await finishPendingSignup(client, normalizedUsername, normalizedEmail, discordId);
  return true;
}

async function continuePendingSignup(
  client: ReturnType<typeof getSupabaseClient>,
  username: string,
  email: string,
  discordId: string
): Promise<boolean> {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (
    !data.user
    || normalizeEmail(data.user.email || '') !== email
    || normalizeUsername(data.user.user_metadata?.username || '') !== username
  ) {
    throw new Error('The authenticated account does not match the pending signup.');
  }
  const linkedDiscordId = discordIdForUser(data.user);
  if (linkedDiscordId === discordId) {
    return true;
  }
  if (linkedDiscordId) {
    throw new Error('This username is already linked to a different Discord account.');
  }

  const { data: linkData, error: linkError } = await client.auth.linkIdentity({
    provider: 'discord',
    options: { redirectTo: `${window.location.origin}/signup/`, scopes: 'identify' }
  });
  if (linkError) {
    if (linkError.message.toLowerCase().includes('manual linking is disabled')) {
      throw new Error(
        'Discord linking is disabled in this Supabase project. Enable manual identity linking in the Supabase Auth settings, then return to this page to continue signup.'
      );
    }
    throw linkError;
  }
  if (!linkData.url) throw new Error('Supabase did not return a Discord authorization URL.');
  window.location.assign(linkData.url);
  return false;
}

async function finishPendingSignup(
  client: ReturnType<typeof getSupabaseClient>,
  username: string,
  email: string,
  discordId: string
): Promise<void> {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (
    !data.user
    || normalizeEmail(data.user.email || '') !== email
    || normalizeUsername(data.user.user_metadata?.username || '') !== username
  ) {
    throw new Error('The authenticated account does not match the pending signup.');
  }
  if (discordIdForUser(data.user) !== discordId) {
    throw new Error('Discord verification did not match the ID entered during signup.');
  }

  const result = await requestJson('/api/state.php');
  if (!result.authenticated) throw playerLookupError(result);
  await registerUsernameEmail();
  localStorage.removeItem(pendingSignupKey);
}

async function registerUsernameEmail(): Promise<void> {
  const result = await requestJson('/api/username-link.php', {
    method: 'POST'
  });
  if (!result.success) {
    throw new Error(result.message || 'Could not save your username.');
  }
}

function discordIdForUser(user: User): string | null {
  const identity = user.identities?.find((item) => item.provider === 'discord');
  if (!identity) return null;

  const identityData = identity.identity_data;
  if (!identityData || typeof identityData !== 'object') return null;
  const data = identityData as Record<string, unknown>;
  const discordId = data.sub ?? data.id;
  return typeof discordId === 'string' || typeof discordId === 'number'
    ? String(discordId)
    : null;
}

export async function completePendingSignup(): Promise<'none' | 'awaiting-email' | 'completed'> {
  const pendingSignup = localStorage.getItem(pendingSignupKey);
  if (!pendingSignup) return 'none';

  let pending: { username: string; email: string; discordId: string };
  try {
    pending = JSON.parse(pendingSignup);
  } catch {
    localStorage.removeItem(pendingSignupKey);
    throw new Error('The pending signup could not be read. Please start again.');
  }

  const client = getSupabaseClient();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return 'awaiting-email';

  const isDiscordLinked = await continuePendingSignup(
    client,
    pending.username,
    normalizeEmail(pending.email),
    pending.discordId
  );
  if (!isDiscordLinked) return 'awaiting-email';
  await finishPendingSignup(
    client,
    pending.username,
    normalizeEmail(pending.email),
    pending.discordId
  );
  return 'completed';
}

export async function resendPendingSignupConfirmation(): Promise<void> {
  const pendingSignup = localStorage.getItem(pendingSignupKey);
  if (!pendingSignup) {
    throw new Error('No pending signup was found. Start signup again.');
  }

  let pending: { email: string };
  try {
    pending = JSON.parse(pendingSignup);
  } catch {
    localStorage.removeItem(pendingSignupKey);
    throw new Error('The pending signup could not be read. Please start again.');
  }
  if (typeof pending.email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(pending.email)) {
    localStorage.removeItem(pendingSignupKey);
    throw new Error('The pending signup does not contain a valid email address. Please start again.');
  }

  const { error } = await getSupabaseClient().auth.resend({
    type: 'signup',
    email: normalizeEmail(pending.email),
    options: { emailRedirectTo: `${window.location.origin}/signup/` }
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.updateUser({ password });
  if (error) throw error;
}
