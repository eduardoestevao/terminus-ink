import { cors } from "hono/cors";

export function createCors(frontendOrigin: string) {
  return cors({
    origin: [frontendOrigin, "https://terminus.ink"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });
}
