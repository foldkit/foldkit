---
'foldkit': minor
'create-foldkit-app': minor
'@foldkit/vite-plugin': minor
'@foldkit/devtools-mcp': minor
---

Foldkit now targets Effect 4. **This is a breaking change.** For Effect 4's own breaking changes (Schema, Stream, Context.Service, etc.), see Effect's release notes.

## Upgrade

```bash
pnpm add effect@4.0.0-beta.59 foldkit@latest
pnpm add -D @foldkit/vite-plugin@latest @foldkit/devtools-mcp@latest
```

Pin `effect` to the exact version foldkit declares (`4.0.0-beta.59`). The pin is intentional during the v4 beta window — letting `effect` drift to a newer beta can break foldkit's runtime until foldkit re-pins.

## Foldkit changes

### Container element needs an `id`

The DOM element you pass as `container` to `Runtime.makeProgram` must have a non-empty `id` attribute. `Runtime.run` errors with a clear message if it's missing. Most apps already use `<div id="root"></div>`; if yours doesn't, add an id.

The id scopes HMR model preservation per-runtime. Foldkit's DevTools overlay manages its own container internally, so it doesn't conflict with your app. If you mount multiple Foldkit runtimes in the same page yourself, give each container a unique id.

### `@foldkit/vite-plugin` auto-includes Effect namespaces

The plugin now adds the full set of `effect/*` namespaces foldkit references to `optimizeDeps.include`. v4 promoted previously nested names (`SchemaIssue`, `SchemaTransformation`, `Result`, `Cause`) to top-level exports that consumers rarely mention by name, and Vite's optimizer scans only your source. Without the force-include, foldkit's transitive imports would be missing from the prebundle and crash at runtime in dev. The plugin handles it transparently — no `optimizeDeps.include` entries needed in your config.

### `@foldkit/devtools-mcp` resilience

The MCP server no longer dies on startup if no Foldkit dev server is running on the relay port. It boots regardless; tool calls return a clear "Not connected to a Foldkit dev server" error string until the relay is reachable. Restarting your dev server no longer requires manually reconnecting the MCP server in your host.

### `@foldkit/devtools-mcp` MCP tool registration fixed

Tool schemas now register correctly with strict MCP hosts (Claude Code, Cursor). Previously the server emitted a wrapper schema that hid `inputSchema.type === "object"` one level too deep, and hosts silently dropped every tool.

### `create-foldkit-app` optional flags

The `--name`, `--example`, and `--package-manager` CLI flags are now optional. Running with no flags drops into an interactive picker for each. Pass any subset of flags to skip the matching prompts.
