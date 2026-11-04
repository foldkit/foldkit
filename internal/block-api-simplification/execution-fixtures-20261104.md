# Executable browser and plugin fixtures

PR #1883's standalone VirtualList CI matrix could not mount its list. Its
handwritten development aliases omitted `foldkit/internal/block`, so Vite
returned a module-resolution error before application startup. An alias-only
control using the earlier application authorship passes the same Chromium
smoke case. The failure does not establish a layout or rendering regression.

The fixture now uses the shared `foldkitAliases` map, one passive Block and an
ordinary construction Layer, and the paired Program entry point. Its Binding
name mirrors `maybeList`; initialization uses an ordinary tuple literal. The
fixture's Model, Messages, initialization, update and view behavior are unchanged.

The first complete local matrix then passed 86 cases and failed one narrow
Window resize case, with the original 21 skips. Its retained trace shows that
the row-height check could already pass before the resized viewport measurement
arrived. All three alias-only and all three migrated focused repetitions passed;
they do not reproduce a baseline failure or establish a migration-specific cause.

The resize test now waits for Window's measured height of 640 and idle scrolling
before the next scroll request. Its existing row-height, row 120 anchor and
row 299 end-alignment assertions remain. Omitting only the resize fails at that
measurement check with expected 640 and received 664, under the original timeout.
Restoring it passes the complete unfiltered matrix: 87 tests and the same 21
existing skips across Chromium desktop/narrow, WebKit and Firefox. No assertion,
browser project or timeout was removed or relaxed.

The active plugin build, SSR development reevaluation and view-identity fixtures
also adopt the Block/Layer pair. The SSR fixture uses scoped `withBlock` acquisition
where it deliberately builds the executable handler Layer. Duplicate-handler
rejection and owner-identity assertions remain intact. All 16 execution fixture
modules pass their source check; the six directly affected Vite build, server
and runtime test files pass all 188 tests. The local server port is closed after
the checks. A separate occupied-port control rejects before starting Vite and
closes its own listener.

No framework runtime source changes in this follow-up. The retained rendering
batches remain the runtime measurements; the compiler-cost acceptance does not
accept their remaining rendering and bundle costs.

## Evidence

- `/private/tmp/foldkit-virtual-list-ci-20261104/` retains the original startup
  failure, alias-only control, both full matrices, focused repetitions, negative
  readiness control and behavior-preservation checks.
- `/private/tmp/foldkit-recovery-artifacts/scene-reviewed-push-fixed-20261104.log`
  records the completed mandatory full hook through `9c276260f9`.
- `/private/tmp/foldkit-recovery-artifacts/feedback-fixture-window-20261104/REPORT.md`
  records the fully paginated feedback refresh through 10:11 UTC. No new
  actionable issue, PR, comment, review or Discussion reply was found.

The fixture follow-up requires exact-commit review and the normal full push hook.
PR integration, release publication and Daybreak review remain separate states.
Publication and Daybreak source transfer remain held.
