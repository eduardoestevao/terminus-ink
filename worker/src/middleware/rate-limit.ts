import type { Context, Next } from "hono";
import type { Env } from "../types";

/**
 * Simple in-memory sliding window rate limiter.
 * Uses a Map keyed by IP. Entries expire after the window.
 *
 * Good enough for a single Worker instance. For multi-region,
 * swap to KV or Durable Objects.
 */

interface RateWindow {
  count: number;
  resetAt: number;
}

const windows = new Map<string, RateWindow>();

// Cleanup stale entries periodically (every 1000 requests)
let requestCount = 0;
function maybeCleanup() {
  if (++requestCount % 1000 !== 0) return;
  const now = Date.now();
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

function getClientIp(c: Context<{ Bindings: Env }>): string {
  return c.req.header("CF-Connecting-IP") || c.req.header("x-forwarded-for") || "unknown";
}

function checkRate(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  maybeCleanup();
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  existing.count++;
  const remaining = Math.max(0, maxRequests - existing.count);
  return {
    allowed: existing.count <= maxRequests,
    remaining,
    resetAt: existing.resetAt,
  };
}

/**
 * Rate limit writes: 5 requests per hour per IP.
 */
export function rateLimitWrite() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const ip = getClientIp(c);
    const { allowed, remaining, resetAt } = checkRate(
      `write:${ip}`,
      5,
      60 * 60 * 1000 // 1 hour
    );

    c.header("X-RateLimit-Limit", "5");
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

    if (!allowed) {
      return c.json({ error: "Rate limit exceeded. Max 5 submissions per hour." }, 429);
    }

    await next();
  };
}

/**
 * Rate limit reads: 60 requests per minute per IP.
 */
export function rateLimitRead() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const ip = getClientIp(c);
    const { allowed, remaining, resetAt } = checkRate(
      `read:${ip}`,
      60,
      60 * 1000 // 1 minute
    );

    c.header("X-RateLimit-Limit", "60");
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

    if (!allowed) {
      return c.json({ error: "Rate limit exceeded. Max 60 requests per minute." }, 429);
    }

    await next();
  };
}
