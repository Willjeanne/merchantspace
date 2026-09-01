# Create Product — MCP App UI

Source for the interactive form rendered by the `vtex_create_product` /
`vtex_open_create_product_form` MCP tools (see
[extensions/apps overview](https://modelcontextprotocol.io/extensions/apps/overview)).

This is a **standalone** Vite project, isolated from the main Next.js app on
purpose:

- The main app's MCP server uses the newer `@modelcontextprotocol/server` (v2)
  SDK. The official `@modelcontextprotocol/ext-apps` package's client-side `App`
  class (used here, in the browser) is fine with that, but its peer dependency
  is still `@modelcontextprotocol/sdk` (v1) — pulling that into the main app's
  `package.json` isn't needed and isn't worth the churn for one UI.
- The bundled output has to be a single self-contained HTML string embedded in
  server code (see below) — Vite's `vite-plugin-singlefile` does that, but
  running Vite as a step in `next build` would be more moving parts than this
  one form needs.

This folder is excluded from the root `tsconfig.json` — its `include` glob
would otherwise try to typecheck this against the main app's dependencies.

## Rebuilding after an edit

```bash
cd lib/mcp/apps/create-product-ui
npm install
npm run build          # → dist/mcp-app.html (single bundled file)
```

Then regenerate the TypeScript constant the server actually serves:

```bash
node -e '
const fs = require("fs");
const html = fs.readFileSync("dist/mcp-app.html", "utf-8");
const out = "// AUTO-GENERATED — do not hand-edit.\n" +
  "// Rebuilt from lib/mcp/apps/create-product-ui/ via: INPUT=mcp-app.html npx vite build\n" +
  "// See lib/mcp/apps/create-product-ui/README.md for the rebuild steps.\n" +
  "export const CREATE_PRODUCT_APP_HTML: string = " + JSON.stringify(html) + ";\n";
fs.writeFileSync("../create-product-app-html.ts", out);
'
```

`lib/mcp/apps/create-product-app-html.ts` is what `lib/mcp/apps/register.ts`
actually imports and serves as the `ui://catalog/create-product.html`
resource — it's the only artifact from this folder that ships with the app.
