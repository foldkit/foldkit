# Packed SSR consumer fixture

`check-packed-ssr-consumer.ts` copies this project into a temporary directory,
installs packed npm tarballs, and builds it without workspace aliases.

The driver generates `package.json` so the packed tarball paths and dependency
versions remain explicit. It substitutes named `{{...}}` tokens in the fixture
files. Every other consumer project file is copied without modification.

The files under `probes/` run in the browser but are not copied into the
consumer project. The page fragments under `pages/` extend rendered test pages.

The default consumer uses the repository's exact Effect and browser-platform
development versions. Use `--effect-version=4.0.6` and
`--platform-browser-version=4.0.6` to test that supported pair. The
`check:effect-compatibility` command builds the packages once and runs the
4.0.0 and 4.0.6 consumers.

Use `--keep-consumer` to retain a temporary project for diagnosis or mutation
checks. The driver prints its path; ordinary and CI runs remove it.

Installation uses strict peer resolution, without workspace overrides or
`--legacy-peer-deps`. All seven Foldkit packages with Effect peers are installed.
The runtime probe checks the npm dependency tree, one physical Effect install,
and identical Effect resolution from Foldkit and the platform packages. The
type fixture checks every public package namespace and an Effect-backed Command
with `skipLibCheck: false`; the SSR and hydration checks exercise the packed
implementation.

The development-server probe starts the installed Vite plugin, waits for its
Crypto-backed MCP relay, and sends a runtime-list request. This covers relay
initialization separately from the production SSR build hooks.
