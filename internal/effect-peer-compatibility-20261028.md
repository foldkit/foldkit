# Effect peer compatibility

## Published contract

Seven packages accept `effect: 4.0.0 || 4.0.6`: Foldkit, UI, Node, Markdown,
Vite plugin, DevTools and DevTools MCP. Foldkit and DevTools accept the same two
versions of `@effect/platform-browser`. Development and application pins,
workspace overrides and the Foldkit-to-Foldkit minimum peer versions are
unchanged.

The range names the tested releases. It does not accept unverified future 4.x
releases. Source checking found that the explicitly unstable Crypto UUID API
changed between these patches, so an unrestricted `^4.0.0` claim would exceed
the available compatibility evidence.

## Long-term direction

Effect's [published policy](https://github.com/Effect-TS/effect/blob/main/README.md#long-term-support)
reserves stable API breaks for majors, unstable API breaks for minors and
experimental API breaks for patches. Its
[4.0.3 release notes](https://github.com/Effect-TS/effect/releases/tag/effect%404.0.3)
record the Crypto property-to-function change. That observed patch
incompatibility does not establish permission for other unstable patch breaks.

The next support-policy target is a verified minor line, such as 4.0.x, with
oldest/newest supported patch checks and explicit assessment of each new minor.
Stable-only dependency paths can justify broader ranges. Foldkit also imports
unstable HTTP, process, persistence and platform APIs, so a whole-major promise
needs more evidence than the stability of Schema and Effect alone. Prefer
stable exports and keep necessary unstable calls behind small adapters. Adding
verified upstream compatibility is a Foldkit patch; dropping supported upstream
versions or changing Foldkit's public API requires a deliberate breaking change.

The discrete range in this preview is a temporary verified boundary, not an
automated policy for all future Effect releases. The complete read-only import
and stability inventory is `stability-policy.md` in the evidence directory.

## Platform constraints and runtime identity

Registry metadata shows platform 4.0.0 peers on Effect `^4.0.0`, while platform
4.0.6 requires Effect `^4.0.6`. The tested browser pairs are 4.0.0/4.0.0 and
4.0.6/4.0.6. Direct Node platform dependencies remain at 4.0.0, which accepts
both tested Effect versions.

The Node adapter additionally declares `@effect/platform-node-shared: 4.0.0`.
Without that constraint, platform-node 4.0.0's transitive `^4.0.0` range can
select a shared patch whose Effect peer excludes 4.0.0. Disposable resolution
controls demonstrate that difference. The workspace lockfile changes only by
adding that direct dependency to the Node importer.

Packed consumers install all seven peer packages with `--strict-peer-deps`,
without monorepo overrides, workspace links or `--legacy-peer-deps`. The runtime
probe checks one physical Effect entry in the npm lockfile, the selected
version, identical Effect paths from all seven Foldkit packages and three
platform packages, and a valid `npm ls --all` tree. This concerns the consumer
dependency graph; the separately executed MCP CLI has its own bundled process.

## Crypto compatibility repair

Effect 4.0.0 exposes `Crypto.randomUUIDv4` as an Effect value. Effect 4.0.6 exposes
it as a function returning an Effect. The Vite relay normalizes these two forms
inside a deferred Effect, preserving the provider receiver and PlatformError
channel. The public Foldkit API is unchanged.

The packed development-server probe starts the installed Vite plugin, requires
a published UUIDv4 relay identity, and requests its runtime list. The original
plugin passes this check with Effect 4.0.0 and fails it with 4.0.6; the repair
passes both. Production SSR alone did not exercise that development hook.
Active lint guidance demonstrates random-byte ID generation available in both
versions rather than prescribing one UUID API shape.

## Verification

Evidence is under `/private/tmp/foldkit-effect-peer-20261028`.

- Fresh builds of all nine public packages pass with the repository's pinned
  development dependencies.
- Both strict packed consumer runs pass public declaration checks, direct
  entrypoint checks, relay startup, server/client builds, SSR and Chromium
  hydration/ownership/refusal checks. The public type fixture checks all seven
  package namespaces and the platform namespaces with `skipLibCheck: false`.
- All seven production source trees pass against Effect 4.0.6 with strict
  library checking. All seven also pass with 4.0.0 when `ESNext.Disposable` is
  added to the temporary compiler's libraries: Effect 4.0.0 declarations require
  disposable globals absent from the repository's ES2022 library set. Packed
  consumer typechecks use ESNext. No repository compiler setting is weakened.
- The isolated Foldkit source check maps only Vitest's development declarations
  to the installed test framework. Its file graph confirms that every Effect
  declaration comes from the selected consumer installation, not the repository.
- Three UUID helper tests, 31 focused lint-rule tests, script/Website source
  checks and 34 CI planning/workflow tests pass. The new CI planning case fails
  before adding all peer-package inputs, then passes after the fix.
- The revised Crypto guidance compiles against both installed versions with
  TypeScript 6 and the native compiler. Website client and SSR builds pass.
- A same-version nested Effect copy beneath UI makes the runtime probe fail;
  it passes before and after removal. A deliberate broken UUID function branch
  fails the receiver test; restoring it passes.

CI runs the 4.0.6 packed consumer alongside the pinned baseline, and all seven
peer-package directories select that gate. `check:effect-compatibility` runs the
two consumers locally. Additional Effect releases require a fresh compatibility
check before their versions enter the published peers.

The existing Machine experimental-barrel compiler-budget failure remains the
separate release check recorded in the alias-adoption report. This update does
not alter its fixtures or ceilings. Publication is held for approval.
