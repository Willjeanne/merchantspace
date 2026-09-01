import type { CallToolResult } from "@modelcontextprotocol/server";

/** Wraps a successful tool result as MCP text content (JSON-serialized). */
export function jsonResult(data: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data ?? { ok: true }, null, 2) }],
  };
}

/** Wraps a thrown error (VtexApiError, VtexConfigError, or anything else) as an MCP tool error. */
export function errorResult(err: unknown): CallToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

/**
 * Wraps a VTEX wrapper function call so its result/error is returned as a
 * `CallToolResult` instead of resolving/throwing directly — every tool
 * callback in this directory is built from this.
 */
export function safe<Args, R>(
  fn: (args: Args) => Promise<R>
): (args: Args) => Promise<CallToolResult> {
  return async (args: Args) => {
    try {
      return jsonResult(await fn(args));
    } catch (err) {
      return errorResult(err);
    }
  };
}

/** Same as `safe`, for tools with no input (no `inputSchema` registered). */
export function safeNoArgs<R>(fn: () => Promise<R>): () => Promise<CallToolResult> {
  return async () => {
    try {
      return jsonResult(await fn());
    } catch (err) {
      return errorResult(err);
    }
  };
}
