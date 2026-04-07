"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api";
import type { User } from "@supabase/supabase-js";

export default function KeysPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<
    {
      id: string;
      label: string;
      created_at: string;
      last_used: string | null;
      revoked: boolean;
    }[]
  >([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadKeys = useCallback(async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      const data = await listApiKeys(token);
      setKeys(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (user) loadKeys();
  }, [user, loadKeys]);

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/keys` },
    });
  }

  async function handleCreate() {
    setError(null);
    setCreating(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const result = await createApiKey(label || "default", token);
      setNewKey(result.key);
      setLabel("");
      loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      await revokeApiKey(id, token);
      loadKeys();
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-2 font-serif text-2xl text-text">API Keys</h1>
      <p className="mb-8 text-sm text-text-muted">
        Generate keys for programmatic access via the REST API or MCP server.
      </p>

      {!user ? (
        <div className="rounded-lg border border-border bg-surface px-6 py-12 text-center">
          <p className="mb-4 text-sm text-text-secondary">
            Sign in with GitHub to manage API keys.
          </p>
          <button
            onClick={signIn}
            className="rounded-lg border border-gold/40 px-6 py-2.5 font-mono text-sm text-gold transition-all hover:border-gold hover:bg-gold-glow"
          >
            Sign in with GitHub
          </button>
        </div>
      ) : (
        <>
          {/* Create new key */}
          <div className="mb-8 rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-text-muted">
              Create new key
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label (e.g. my-agent)"
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text placeholder:text-text-muted transition-colors focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20"
              />
              <button
                onClick={handleCreate}
                disabled={creating}
                className="shrink-0 rounded-lg border border-gold/40 px-5 py-2.5 font-mono text-sm text-gold transition-all hover:border-gold hover:bg-gold-glow disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Creating..." : "Generate"}
              </button>
            </div>

            {error && (
              <p className="mt-3 text-sm text-negative">{error}</p>
            )}

            {newKey && (
              <div className="mt-4 rounded-lg border border-gold/30 bg-gold-glow p-4">
                <p className="mb-2 font-mono text-xs font-medium uppercase tracking-wider text-gold">
                  Copy this key now — it won&apos;t be shown again
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded bg-background px-3 py-2 font-mono text-xs text-text">
                    {newKey}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newKey);
                    }}
                    className="shrink-0 rounded border border-border px-3 py-2 font-mono text-xs text-text-secondary transition-colors hover:bg-surface"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Existing keys */}
          <div>
            <h2 className="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-text-muted">
              Your keys
            </h2>
            {keys.length === 0 ? (
              <p className="text-sm text-text-muted">No keys yet.</p>
            ) : (
              <div className="space-y-2">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                      k.revoked
                        ? "border-border/50 bg-surface/50 opacity-60"
                        : "border-border bg-surface"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-text">
                          {k.label}
                        </span>
                        {k.revoked && (
                          <span className="rounded bg-negative/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-negative">
                            revoked
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex gap-4 font-mono text-xs text-text-muted">
                        <span>
                          Created{" "}
                          {new Date(k.created_at).toLocaleDateString()}
                        </span>
                        {k.last_used && (
                          <span>
                            Last used{" "}
                            {new Date(k.last_used).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {!k.revoked && (
                      <button
                        onClick={() => handleRevoke(k.id)}
                        className="shrink-0 font-mono text-xs text-text-muted transition-colors hover:text-negative"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
