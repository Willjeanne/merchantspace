import { createMcpHandler } from "mcp-handler";
import { registerVtexTools } from "@/lib/mcp/register";

const mcpHandler = createMcpHandler(
  (server) => {
    registerVtexTools(server);
  },
  {
    serverInfo: { name: "merchantspace-vtex", version: "0.1.0" },
  }
);

function unauthorized(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "content-type": "application/json", "www-authenticate": "Bearer" },
  });
}

/**
 * Static bearer-token gate in front of the MCP handler. This endpoint can create,
 * edit, and delete live VTEX seller data (products, prices, stock, warehouses...)
 * using this app's own App Key/Token — it must never be reachable without a secret.
 * Fails closed: if MCP_SERVER_TOKEN isn't configured, every request is rejected.
 *
 * Accepts the token via the standard `Authorization: Bearer` header, or via a
 * `?token=` query param — the latter exists because Claude.ai's custom connector
 * UI only accepts a bare URL for orgs without the (beta, org-gated) request-headers
 * option. Treat any URL containing the token as sensitive: it can end up in
 * browser history and request logs the same way the header would not.
 */
async function authenticatedHandler(request: Request): Promise<Response> {
  const expectedToken = process.env.MCP_SERVER_TOKEN;
  if (!expectedToken) {
    return new Response(
      JSON.stringify({ error: "MCP server is not configured: MCP_SERVER_TOKEN is not set" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  const authHeader = request.headers.get("authorization");
  const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const queryToken = new URL(request.url).searchParams.get("token") ?? undefined;
  const providedToken = headerToken ?? queryToken;

  if (providedToken !== expectedToken) {
    return unauthorized("Missing or invalid bearer token");
  }

  return mcpHandler(request);
}

export { authenticatedHandler as GET, authenticatedHandler as POST };
