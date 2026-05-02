---
'foldkit': minor
'create-foldkit-app': minor
'@foldkit/vite-plugin': minor
'@foldkit/devtools-mcp': minor
---

Foldkit now targets Effect 4. Pin `effect@4.0.0-beta.59` (the version foldkit is built against). For Effect 4's own breaking changes (Schema, Stream, Context.Service, etc.), see Effect's release notes.

## Upgrade

```bash
pnpm add effect@4.0.0-beta.59 foldkit@latest
pnpm add -D @foldkit/vite-plugin@latest @foldkit/devtools-mcp@latest
```

## Foldkit changes

### `container.id` is now required

`Runtime.makeProgram` errors at startup if its `container` has no `id`. Most apps already pass `<div id="root"></div>`; if yours doesn't, add an id.

The id is used to scope HMR model preservation per-runtime, so multiple Foldkit runtimes mounted in the same page (your app and the DevTools overlay) no longer clobber each other on hot-reload. Each runtime's id only needs to be unique among runtimes mounted in the same page.

### `@foldkit/vite-plugin` auto-includes Effect namespaces

The plugin now adds the full set of `effect/*` namespaces foldkit references to `optimizeDeps.include`. v4 promoted previously nested names (`SchemaIssue`, `SchemaTransformation`, `Result`, `Cause`) to top-level exports that consumers rarely mention by name, and Vite's optimizer scans only your source. Without the force-include, foldkit's transitive imports were missing from the prebundle and crashed at runtime in dev.

If you added `optimizeDeps.include` entries as a workaround, remove them. The plugin handles it.

### `@foldkit/devtools-mcp` resilience

The MCP server no longer dies on startup if no Foldkit dev server is running on the relay port. It boots regardless; tool calls return a clear "Not connected to a Foldkit dev server" error string until the relay is reachable. Restarting your dev server no longer requires manually reconnecting the MCP server in your host.

### `@foldkit/devtools-mcp` MCP tool registration fixed

Tool schemas now register correctly with strict MCP hosts (Claude Code, Cursor). Previously the server emitted a wrapper schema that hid `inputSchema.type === "object"` one level too deep, and hosts silently dropped every tool.

### `create-foldkit-app` optional flags

The `--name`, `--example`, and `--package-manager` CLI flags are now optional. Running with no flags drops into an interactive picker for each. Pass any subset of flags to skip the matching prompts.

### `m` / `r` / `ts` callable wrappers (transparent)

The `m`, `r`, `ts` wrappers from `foldkit/message`, `foldkit/route`, `foldkit/schema` now return a Proxy targeting a function so callable construction (`Foo({ ... })`) keeps working under v4 — `S.TaggedStruct` is no longer directly callable in Effect 4. No code change required if you used these wrappers. If you used `S.TaggedStruct` directly as a constructor, switch to `Foo.make({ ... })` or wrap with `m()` / `ts()`.
