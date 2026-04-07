import { Hono } from "hono";
import { createCors } from "./middleware/cors";
import { rateLimitRead, rateLimitWrite } from "./middleware/rate-limit";
import experiments from "./api/experiments";
import tags from "./api/tags";
import keys from "./api/keys";
import profile from "./api/profile";
import { handleMcp } from "./mcp/server";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use("*", async (c, next) => {
  const corsMiddleware = createCors(c.env.FRONTEND_ORIGIN);
  return corsMiddleware(c, next);
});

// Security headers
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
});

// Rate limiting
app.use("/api/*", rateLimitRead());
app.post("/api/experiments", rateLimitWrite());
app.post("/mcp", rateLimitWrite());

// Health check
app.get("/", (c) => c.json({ name: "terminus-api", version: "0.1.0" }));

// REST API
app.route("/api/experiments", experiments);
app.route("/api/tags", tags);
app.route("/api/keys", keys);
app.route("/api/profile", profile);

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
