import { type Fetcher } from '@cloudflare/workers-types';

interface Env {
  DB_DEMO_API: Fetcher;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/db-demo')) {
      const newPath = url.pathname.replace('/db-demo', '');
      const targetUrl = `${url.origin}${newPath}${url.search}`;
      const newRequest = new Request(targetUrl, request);
      return await env.DB_DEMO_API.fetch(newRequest);
    }

    return new Response('Not Found', { status: 404 });
  },
};
