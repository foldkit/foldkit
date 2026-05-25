---
'@foldkit/devtools-mcp': minor
---

Republished against foldkit 0.102.0. No source change to the MCP server itself, but foldkit's perf overhaul and Submodel boundary restructure (see foldkit changelog) reshape the runtime that devtools-mcp talks to over the DevTools protocol. Pin foldkit and @foldkit/devtools-mcp together: this version of devtools-mcp expects foldkit 0.102.0 or later.
