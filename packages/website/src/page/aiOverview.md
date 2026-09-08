# AI

## Architecture and Source Context

AI coding agents work best in a Foldkit project when they can see both its predictable architecture and its current source.

The architecture gives every part of the program a clear role. The Model holds state. Messages record facts. update decides the next Model and which Commands to return. view describes the UI. The Runtime starts and manages outside work described by Commands, Subscriptions, Mounts, Flags, Resources, and ManagedResource entries.

An agent can follow that loop from an interaction to a Message, through update, and back to the rendered result. It can also see where a Submodel owns behavior and how an OutMessage carries a fact to its parent.

Architecture is only half of the context. APIs and conventions change, so the agent also needs a current copy of Foldkit's source, examples, and documentation.

## Vendoring the Foldkit Repository

Vendor the Foldkit repository into your project as a git subtree, pinned to the release you have installed:

::Snippet{name="aiOverviewAddSubtree" label="vendor the Foldkit repository"}

Each stable release publishes a `foldkit@<version>` git tag, and the command reads the installed version from `node_modules`, so the vendored copy describes the APIs your app compiles against. Vendoring `main` instead can hand an agent examples and docs from a release you have not installed. A canary install has no tag; its version names its source commit (`0.156.0-canary.<commit>`), and the full hash of that commit is the ref to pin instead. GitHub expands the short hash at `https://github.com/foldkit/foldkit/commit/<commit>`.

The subtree gives an agent local access to the framework source, runnable examples, this documentation site, and the production apps built with Foldkit. Treat it as read-only reference material. Application imports should still come from the installed npm packages.

Unlike a submodule, a subtree is committed with your repository. Teammates, CI runners, and cloud agents receive the reference source with a normal clone. Projects created with `create-foldkit-app` include a `FOLDKIT.md` that points agents to these references, an `AGENTS.md` for your own instructions, and a `.ignore` file that keeps `repos/` out of the editor file tree.

The subtree does not move on its own. After upgrading your Foldkit packages, re-pin it to the release you now have:

::Snippet{name="aiOverviewRefreshSubtree" label="refresh the Foldkit repository"}

## Keeping FOLDKIT.md Current

`create-foldkit-app` writes `FOLDKIT.md` when it creates the project, and the conventions in it change with the framework. A stale copy can steer an agent toward APIs the installed packages no longer export.

Replace the whole file when you upgrade Foldkit. If you vendor the repository, re-pin the subtree to the new release and copy `repos/foldkit/packages/create-foldkit-app/templates/base/FOLDKIT.md` over it. Otherwise take the template from GitHub at the tag matching the installed version: `https://github.com/foldkit/foldkit/blob/foldkit@<version>/packages/create-foldkit-app/templates/base/FOLDKIT.md`. There is nothing to merge, because your own instructions live in `AGENTS.md`, which the upgrade leaves alone.

## Foldkit Skills

Foldkit ships [agent skills](/ai/skills) for Claude Code, Codex, the ChatGPT desktop app, and OpenCode. The skills encode repeatable workflows for building and auditing Foldkit applications. They also direct the agent to the vendored repository when the live source is more authoritative than a written guide.

## DevTools MCP

Skills and source help an agent understand the code. The [DevTools MCP server](/ai/mcp) exposes an application that is currently running. An agent can inspect the current or historical Model, query Message history, compare states, replay the UI, and dispatch Schema-validated Messages.

## Reading This Site as Data

An agent does not have to scrape these pages. Every page is available as Markdown by appending `.md` to its URL or by requesting it with `Accept: text/markdown`, [llms.txt](https://foldkit.dev/llms.txt) indexes the whole site, and [llms-full.txt](https://foldkit.dev/llms-full.txt) is every page in one file.

For structured access there is a read-only JSON [Content API](/api): the page index, one document per page with its Markdown, the documentation sections, the example applications, and the blog. It is versioned, has a published deprecation policy, advertises its rate limit on every response, and answers failures as RFC 9457 problem documents. Every endpoint is described with a typed schema in [openapi.json](https://foldkit.dev/openapi.json), which is what an agent needs to call it as a tool.
