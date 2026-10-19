// functions/api/[[path]].ts
// Cloudflare Pages Function routing all /api/* requests to Hono with D1 & R2 bindings
import app from '../../server/index';

export const onRequest: PagesFunction = async (context) => {
  return app.fetch(context.request, context.env, context);
};
