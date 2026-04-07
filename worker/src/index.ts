import { Hono } from "hono";
import { createCors } from "./middleware/cors";
import experiments from "./api/experiments";
import tags from "./api/tags";
import { handleMcp } from "./mcp/server";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use("*", async (c, next) => {
  const corsMiddleware = createCors(c.env.FRONTEND_ORIGIN);
  return corsMiddleware(c, next);
});

// Health check
app.get("/", (c) => c.json({ name: "terminus-api", version: "0.1.0" }));

// REST API
app.route("/api/experiments", experiments);
app.route("/api/tags", tags);

// MCP endpoint
app.post("/mcp", async (c) => {
  return handleMcp(c);
});

// 404 fallback
app.notFound((c) => c.json({ error: "Not found" }, 404));

// Error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
