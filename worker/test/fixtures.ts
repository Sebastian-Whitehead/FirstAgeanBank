import { mockSupabase, type Route } from './helpers';

export const DID = '123456789012345678';
export const STEAM = '76561198000000001';
export const USER = '/auth/v1/user';
export const IDENT = '/rest/v1/identities_player';
export const rpcPath = (fn: string) => `/rest/v1/rpc/${fn}`;

const authUser = {
  id: 'u1',
  email: 'p@x.co',
  user_metadata: { username: 'player1' },
  identities: [{ provider: 'discord', identity_data: { sub: DID } }]
};
const row = { steam_id: STEAM, discord_id: DID, alias: 'Alias' };

// Mocks auth + identity + one RPC. `/rest/v1/rpc/<fn>` calls other than `fn` throw (unmocked).
export function setupRpc(fn: string, rpc: Route) {
  return mockSupabase({ [USER]: { body: authUser }, [IDENT]: { body: [row] }, [rpcPath(fn)]: rpc });
}

export function formRequest(url: string, fields: Record<string, string>, opts: { method?: string; auth?: string | null } = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  const auth = opts.auth === undefined ? 'Bearer tok' : opts.auth;
  const method = opts.method ?? 'POST';
  return new Request(url, {
    method,
    body: method === 'POST' ? form : undefined,
    headers: auth ? { Authorization: auth } : {}
  });
}

export const rpcCalls = (calls: Request[], fn: string) => calls.filter((c) => new URL(c.url).pathname === rpcPath(fn));
export { testEnv } from './helpers';
