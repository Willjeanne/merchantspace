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
 * The token is only ever read from the `Authorization: Bearer` header. A `?token=`
 * query-param fallback used to be accepted for connector UIs that take a bare URL,
 * but a token in a URL leaks into browser history, referrers and request logs, and
 * this one grants write access to the live catalog.
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
  const providedToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (providedToken !== expectedToken) {
    return unauthorized("Missing or invalid bearer token");
  }

  return mcpHandler(request);
}

export { authenticatedHandler as GET, authenticatedHandler as POST };
