// Cloudflare Pages Function Adapter
// Forwards all requests directly to the Hono application
import app from '../server/index';

export const onRequest: PagesFunction = async (context) => {
  return app.fetch(context.request, context.env, context);
};
