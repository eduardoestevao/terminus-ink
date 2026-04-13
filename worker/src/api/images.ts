import { Hono } from "hono";
import { requireAuth, type AuthContext } from "../auth/middleware";
import type { Env } from "../types";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const app = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

// POST /api/images — upload an image (auth required)
app.post("/", requireAuth, async (c) => {
  const contentType = c.req.header("Content-Type") || "";

  let fileBytes: ArrayBuffer;
  let mimeType: string;

  if (contentType.includes("multipart/form-data")) {
    // Form upload (browser)
    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }
    mimeType = file.type;
    fileBytes = await file.arrayBuffer();
  } else if (contentType === "application/json") {
    // Base64 upload (MCP / agents)
    const body = await c.req.json().catch(() => null);
    if (!body?.data || !body?.mimeType) {
      return c.json({ error: "Provide { data: base64string, mimeType: 'image/png' }" }, 400);
    }
    mimeType = body.mimeType;
    fileBytes = base64ToArrayBuffer(body.data);
  } else {
    return c.json({ error: "Use multipart/form-data or application/json with base64" }, 400);
  }

  // Validate type
  const ext = ALLOWED_TYPES[mimeType];
  if (!ext) {
    return c.json({ error: `Unsupported type: ${mimeType}. Allowed: png, jpg, webp` }, 400);
  }

  // Validate size
  if (fileBytes.byteLength > MAX_SIZE) {
    return c.json({ error: `File too large (${(fileBytes.byteLength / 1024 / 1024).toFixed(1)}MB). Max 5MB.` }, 400);
  }

  // Generate random filename
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", fileBytes)))
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const key = `${hash}.${ext}`;

  // Upload to R2
  try {
    await c.env.IMAGES.put(key, fileBytes, {
      httpMetadata: { contentType: mimeType },
    });
  } catch (err) {
    console.error("R2 upload failed:", err);
    return c.json({ error: "Failed to upload image" }, 500);
  }

  const url = `https://api.terminus.ink/images/${key}`;
  return c.json({ url, key }, 201);
});

// GET /images/:key — serve an image from R2 (public, cached)
app.get("/:key", async (c) => {
  const key = c.req.param("key");

  // Validate filename format
  if (!/^[a-f0-9]+\.(png|jpg|webp)$/.test(key)) {
    return c.json({ error: "Not found" }, 404);
  }

  const object = await c.env.IMAGES.get(key);
  if (!object) {
    return c.json({ error: "Not found" }, 404);
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "image/png");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag);

  return new Response(object.body, { headers });
});

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Strip data URL prefix if present
  const clean = base64.replace(/^data:[^;]+;base64,/, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export default app;
