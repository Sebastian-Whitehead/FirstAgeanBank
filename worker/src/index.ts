import type { Env } from './env';
import { handleAccountAction } from './endpoints/account-action';
import { handleCreateAccount } from './endpoints/create-account';
import { handleState } from './endpoints/state';
import { handleTransfer } from './endpoints/transfer';
import { handleUsernameLink } from './endpoints/username-link';
import { handleUsernameLogin } from './endpoints/username-login';
import { errorResponse } from './http';

export type Handler = (request: Request, env: Env) => Promise<Response>;

export const routes: Record<string, Handler> = {
  '/api/state': handleState,
  '/api/username-link': handleUsernameLink,
  '/api/username-login': handleUsernameLogin,
  '/api/accounts/create': handleCreateAccount,
  '/api/accounts/action': handleAccountAction,
  '/api/transfer': handleTransfer
};

export function createRouter(table: Record<string, Handler>) {
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const { pathname } = new URL(request.url);
      const handler = table[pathname.replace(/\/+$/, '')]; // tolerate one trailing slash
      if (!handler) {
        if (pathname.startsWith('/api/')) return errorResponse(404, 'notfound', 'Not found.');
        return env.ASSETS.fetch(request); // safety net; run_worker_first only sends /api/* here
      }
      try {
        return await handler(request, env);
      } catch (error) {
        console.error('Unhandled API error', error instanceof Error ? error.message : 'unknown');
        return errorResponse(500, 'servererror', 'The request could not be completed.');
      }
    }
  } satisfies ExportedHandler<Env>;
}

export default createRouter(routes);
