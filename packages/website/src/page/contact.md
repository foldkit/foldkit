# Contact Foldkit

## Where to Reach Us

Foldkit is an open source project developed on GitHub. Every conversation happens in public, so the fastest way to reach the maintainers is also the way that helps the next person with the same question.

- **Bugs and feature requests:** [open an issue](https://github.com/foldkit/foldkit/issues). Include the Foldkit version, a description of what you expected, and a small reproduction if you have one.
- **Questions and discussion:** [join the Discord](https://discord.gg/kav8VNxqGm). Architecture questions, review of an approach, and "is this the idiomatic way" belong here.
- **Announcements:** [@devinjameson on X](https://x.com/devinjameson) posts releases and short write-ups.
- **Release mail:** the [newsletter](/newsletter) sends new releases, patterns, and the occasional deep dive.

## Reporting a Security Issue

Report a suspected vulnerability privately through [GitHub Security Advisories](https://github.com/foldkit/foldkit/security/advisories/new) rather than in a public issue. Include the affected package and version, what an attacker can do with the issue, and the steps to reproduce it. Advisories are published once a fix has shipped.

## Contributing

Pull requests are welcome. [CONTRIBUTING.md](https://github.com/foldkit/foldkit/blob/main/CONTRIBUTING.md) covers the local setup, the conventions the codebase follows, and the checks that run before a change can merge. Open an issue first for anything large, so the design can be settled before the code is written.

## What to Expect

Foldkit is maintained by a small number of people, so response times vary. Issues with a reproduction get looked at first. A question that turns out to be a documentation gap usually becomes a documentation change, which is the most useful kind of report we get.

## For Agents

An agent integrating with Foldkit does not need to contact anyone. The [Content API](/api) describes the site's machine-readable surface, [llms.txt](https://foldkit.dev/llms.txt) indexes every page, and the [DevTools MCP server](/ai/mcp) connects an agent to a running Foldkit application.
