import { cors } from "hono/cors";

export function createCors(frontendOrigin: string) {
  return cors({
    origin: [frontendOrigin, "https://terminus.ink", "https://terminus-ink.pages.dev"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });
}
