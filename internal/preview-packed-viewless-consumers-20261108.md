# Packed viewless consumers

CI for `4ed89f750c75d568d3c8ac4594d4f111e124edc1` correctly rejected an
npm workspace consumer that completed a Block without a view. The Element
default makes that declaration require a view; this Model-only consumer needs
`view: false`. This was a candidate migration omission, not a bug in the
published Runtime.

The correction makes the workspace consumer and the packed Command-only
Effect compatibility fixture explicitly viewless. The latter authors through
`Foldkit.Block.make`, a qualified form outside the census script's current
`Block.make` pattern. A supplemental source search found that qualified
fixture and an intentionally invalid lint fixture. The lint case remains
unchanged. The packed Document fixtures remain explicit, the Element fixture
uses the new default, and the Schema-only DOM parity fixture keeps its legacy
assembly coverage.

The existing packed gate passed with `--skip-build --critical-browser-matrix
--keep-consumer`, using the current built packages and corrected fixture files.
It installs tarballs outside the monorepo, checks declarations and direct
entrypoints, executes the npm workspace consumer, verifies one Effect 4.1.0
runtime with matching platform packages, and exercises SSR in Chromium,
Firefox and WebKit. The original CI failure and the successful command, log,
consumer manifest and lockfile are retained in the
[packet](view-default-proof/measurements/packed-consumer-followup/manifest.json).
The gate cleaned its tarball staging directory; no retained tarball bytes are
claimed.

Foldkit's production source is unchanged from `4ed89f75`. The follow-up still
needs its own exact-commit review, normal push gate and new CI result. It makes
no rendering-performance claim and does not authorize publication or Daybreak.

The separate [Website readiness packet](preview-frame-cadence-20261108/measurements/website-readiness/README.md)
preserves the full hook's one five-second readiness failure, passing retry,
and the sole successful fresh-server run without retries. Its cause remains
unresolved; no timeout or source change was made for it.
