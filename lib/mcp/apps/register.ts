import type { McpServer } from "@modelcontextprotocol/server";
import { CREATE_PRODUCT_APP_HTML } from "./create-product-app-html";

/**
 * MIME type MCP Apps hosts look for on a `ui://` resource — matches
 * `RESOURCE_MIME_TYPE` from `@modelcontextprotocol/ext-apps`, kept as a local
 * constant so the server doesn't need that package (and its v1 SDK peer dep)
 * as a runtime dependency. See lib/mcp/apps/create-product-ui/README.md.
 */
const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app";

export const CREATE_PRODUCT_RESOURCE_URI = "ui://catalog/create-product.html";

/**
 * Registers the interactive "create product" MCP App: the `ui://` resource
 * serving its bundled HTML, plus a trigger tool the model calls to open it.
 * The form itself calls the existing `vtex_create_product` tool (see
 * registerCatalogTools) once the user submits — that tool's `_meta.ui` links
 * it to the same resource so it's usable by both the model directly and by
 * this app's own submit button.
 */
export function registerCreateProductApp(server: McpServer) {
  server.registerResource(
    "Create Product Form",
    CREATE_PRODUCT_RESOURCE_URI,
    { mimeType: MCP_APP_MIME_TYPE },
    async () => ({
      contents: [
        {
          uri: CREATE_PRODUCT_RESOURCE_URI,
          mimeType: MCP_APP_MIME_TYPE,
          text: CREATE_PRODUCT_APP_HTML,
        },
      ],
    })
  );

  server.registerTool(
    "vtex_open_create_product_form",
    {
      title: "Open create-product form",
      description:
        "Opens an interactive form for creating a product + first SKU in the seller catalog — category and brand pickers, dimensions, pricing inputs. Prefer this over vtex_create_product when the user wants to fill in the details themselves rather than dictating every field in chat.",
      _meta: {
        ui: {
          resourceUri: CREATE_PRODUCT_RESOURCE_URI,
          visibility: ["model"],
        },
      },
    },
    async () => ({
      content: [{ type: "text", text: "Product creation form ready." }],
    })
  );
}
