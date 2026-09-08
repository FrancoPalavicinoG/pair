import { serve } from "@hono/node-server";
import { Hono } from "hono";
import "./env";
import { oauthRoutes } from "./oauth/routes";

const app = new Hono();
app.route("/", oauthRoutes);

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`apps/mcp listening on http://localhost:${info.port}`);
});
