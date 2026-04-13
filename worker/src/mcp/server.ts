import type { Context } from "hono";
import { createClient } from "@supabase/supabase-js";
import { verifyApiKey } from "@terminus/core";
import { hashApiKey } from "../auth/middleware";
import type { Env } from "../types";
import {
  submitExperiment,
  editExperiment,
  uploadImage,
  listExperimentsHandler,
  getExperimentHandler,
  searchByTagHandler,
  getTagsHandler,
} from "./tools";
import { postTweet, formatExperimentTweet } from "../twitter";

/**
 * MCP endpoint handler.
 * Implements a minimal JSON-RPC 2.0 subset for MCP Streamable HTTP transport.
 *
 * The MCP SDK's StreamableHTTPServerTransport expects standard HTTP POST
 * with JSON-RPC bodies. We implement the core protocol directly for
 * Workers compatibility and minimal bundle size.
 */
export async function handleMcp(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.method) {
    return c.json(jsonRpcError(body?.id, -32600, "Invalid JSON-RPC request"), 400);
  }

  const { id, method, params } = body;

  // Initialize request — return server capabilities
  if (method === "initialize") {
    return c.json(jsonRpcResult(id, {
      protocolVersion: "2025-03-26",
      capabilities: { tools: {} },
      serverInfo: {
        name: "terminus-ink",
        version: "0.1.0",
      },
      instructions: "terminus.ink — the open experiment log for the AI research era. Submit structured experiment results, browse experiments, search by tag.",
    }));
  }

  // List available tools
  if (method === "tools/list") {
    return c.json(jsonRpcResult(id, { tools: TOOL_DEFINITIONS }));
  }

  // Call a tool
  if (method === "tools/call") {
    const toolName = params?.name;
    const args = params?.arguments || {};

    const supabaseService = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const supabaseAnon = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

    // Write tools require auth
    if (toolName === "submit_experiment") {
      const authHeader = c.req.header("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return c.json(jsonRpcResult(id, {
          content: [{ type: "text", text: "Authentication required. Provide API key in Authorization header." }],
          isError: true,
        }));
      }

      const token = authHeader.slice(7);
      const keyHash = await hashApiKey(token);
      const authResult = await verifyApiKey(supabaseService, keyHash);

      if (!authResult) {
        return c.json(jsonRpcResult(id, {
          content: [{ type: "text", text: "Invalid API key" }],
          isError: true,
        }));
      }

      const result = await submitExperiment(supabaseService, args, authResult.userId);

      // Tweet about the new experiment (fire-and-forget)
      if (c.env.TWITTER_API_KEY && c.env.TWITTER_ACCESS_TOKEN && !result.isError) {
        try {
          const parsed = JSON.parse(result.content[0].text);
          if (parsed.slug) {
            const tweet = formatExperimentTweet({
              id: parsed.id,
              title: (args.title as string) || "",
              question: (args.question as string) || "",
              tags: (args.tags as string[]) || [],
              slug: parsed.slug,
            });
            postTweet(tweet, {
              apiKey: c.env.TWITTER_API_KEY,
              apiSecret: c.env.TWITTER_API_SECRET!,
              accessToken: c.env.TWITTER_ACCESS_TOKEN,
              accessTokenSecret: c.env.TWITTER_ACCESS_TOKEN_SECRET!,
            }).catch((err) => console.error("Failed to tweet:", err));
          }
        } catch { /* ignore parse errors */ }
      }

      return c.json(jsonRpcResult(id, result));
    }

    if (toolName === "edit_experiment") {
      const authHeader = c.req.header("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return c.json(jsonRpcResult(id, {
          content: [{ type: "text", text: "Authentication required. Provide API key in Authorization header." }],
          isError: true,
        }));
      }

      const token = authHeader.slice(7);
      const keyHash = await hashApiKey(token);
      const authResult = await verifyApiKey(supabaseService, keyHash);

      if (!authResult) {
        return c.json(jsonRpcResult(id, {
          content: [{ type: "text", text: "Invalid API key" }],
          isError: true,
        }));
      }

      const result = await editExperiment(supabaseService, args, authResult.userId);
      return c.json(jsonRpcResult(id, result));
    }

    if (toolName === "upload_image") {
      const authHeader = c.req.header("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return c.json(jsonRpcResult(id, {
          content: [{ type: "text", text: "Authentication required. Provide API key in Authorization header." }],
          isError: true,
        }));
      }

      const token = authHeader.slice(7);
      const keyHash = await hashApiKey(token);
      const authResult = await verifyApiKey(supabaseService, keyHash);

      if (!authResult) {
        return c.json(jsonRpcResult(id, {
          content: [{ type: "text", text: "Invalid API key" }],
          isError: true,
        }));
      }

      const result = await uploadImage(c.env.IMAGES, args);
      return c.json(jsonRpcResult(id, result));
    }

    // Read tools are public
    if (toolName === "list_experiments") {
      const result = await listExperimentsHandler(supabaseAnon, args);
      return c.json(jsonRpcResult(id, result));
    }

    if (toolName === "get_experiment") {
      const result = await getExperimentHandler(supabaseAnon, args);
      return c.json(jsonRpcResult(id, result));
    }

    if (toolName === "search_by_tag") {
      const result = await searchByTagHandler(supabaseAnon, args);
      return c.json(jsonRpcResult(id, result));
    }

    if (toolName === "get_tags") {
      const result = await getTagsHandler(supabaseAnon);
      return c.json(jsonRpcResult(id, result));
    }

    return c.json(jsonRpcError(id, -32601, `Unknown tool: ${toolName}`));
  }

  // Notifications (no response needed)
  if (method === "notifications/initialized") {
    return c.json(jsonRpcResult(id, {}));
  }

  return c.json(jsonRpcError(id, -32601, `Unknown method: ${method}`));
}

// --- Tool definitions ---

const TOOL_DEFINITIONS = [
  {
    name: "submit_experiment",
    description: "Submit a structured experiment result to terminus.ink. Requires API key authentication.",
    inputSchema: {
      type: "object",
      required: ["title", "question", "setup", "results", "keyFindings", "tags"],
      properties: {
        title: { type: "string", description: "Experiment title, e.g. 'Byte-Level Statistical Analysis of SSM vs Transformer Outputs'", maxLength: 200 },
        question: { type: "string", description: "One sentence. What are you testing?", maxLength: 5000 },
        setup: { type: "string", description: "Dataset, hardware, config. Brief.", maxLength: 5000 },
        results: {
          type: "object",
          description: "Results table",
          required: ["headers", "rows"],
          properties: {
            headers: { type: "array", items: { type: "string" }, description: "Column headers" },
            rows: { type: "array", items: { type: "array", items: { type: "string" } }, description: "Data rows" },
          },
        },
        keyFindings: { type: "array", items: { type: "string" }, description: "3-5 bullet points. What did you learn?" },
        tags: { type: "array", items: { type: "string" }, description: "Topic tags, e.g. ['ssm', 'transformer', 'negative-result']" },
        lessonLearned: { type: "string", description: "Optional: what would you do differently?", maxLength: 5000 },
        toolsUsed: { type: "string", description: "Optional: declare AI assistance, hardware, frameworks", maxLength: 2000 },
        chainPrev: { type: "string", description: "Optional: slug of previous experiment in chain", maxLength: 200 },
      },
    },
  },
  {
    name: "edit_experiment",
    description: "Edit an existing experiment. Author-only, within 48 hours of creation. Requires API key authentication. Only include fields you want to change.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: {
        slug: { type: "string", description: "Slug of the experiment to edit" },
        title: { type: "string", maxLength: 200 },
        question: { type: "string", maxLength: 5000 },
        setup: { type: "string", maxLength: 5000 },
        results: {
          type: "object",
          properties: {
            headers: { type: "array", items: { type: "string" } },
            rows: { type: "array", items: { type: "array", items: { type: "string" } } },
          },
        },
        keyFindings: { type: "array", items: { type: "string" } },
        tags: { type: "array", items: { type: "string" } },
        lessonLearned: { type: "string", maxLength: 5000 },
        toolsUsed: { type: "string", maxLength: 2000 },
        chainPrev: { type: "string", maxLength: 200 },
      },
    },
  },
  {
    name: "upload_image",
    description: "Upload an image (chart, plot, diagram) and get a URL to include in experiment text fields. Requires API key authentication.",
    inputSchema: {
      type: "object",
      required: ["data", "mimeType"],
      properties: {
        data: { type: "string", description: "Base64-encoded image data (with or without data URL prefix)" },
        mimeType: { type: "string", description: "Image MIME type: image/png, image/jpeg, or image/webp", enum: ["image/png", "image/jpeg", "image/webp"] },
      },
    },
  },
  {
    name: "list_experiments",
    description: "Browse published experiments. Optionally filter by tag or author.",
    inputSchema: {
      type: "object",
      properties: {
        tag: { type: "string", description: "Filter by tag" },
        author: { type: "string", description: "Filter by author username" },
        limit: { type: "number", description: "Max results (default 20, max 100)" },
        offset: { type: "number", description: "Pagination offset (default 0)" },
      },
    },
  },
  {
    name: "get_experiment",
    description: "Get a single experiment by its slug.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: {
        slug: { type: "string", description: "Experiment slug, e.g. '2026-04-07-byte-level-statistical-analysis'" },
      },
    },
  },
  {
    name: "search_by_tag",
    description: "Find all experiments with a specific tag.",
    inputSchema: {
      type: "object",
      required: ["tag"],
      properties: {
        tag: { type: "string", description: "Tag to search for, e.g. 'ssm', 'negative-result'" },
      },
    },
  },
  {
    name: "get_tags",
    description: "List all tags with experiment counts.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// --- JSON-RPC helpers ---

function jsonRpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
