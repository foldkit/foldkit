# Preview follow-up verification

The implementation was independently reviewed at
`29b3f80e4048996e43f3d3b1262870a96c3b005b`. The retained focused receipts are
under [measurements](measurements/retained-files.json). A final normal pre-push
run and protected integration remain requirements for the selected candidate;
these receipts do not replace either gate.

Verification log copies remove trailing whitespace and extra terminal blank
lines. The manifest records original and stored hashes. Timed benchmark logs,
preflights and input receipts retain their original bytes separately.

- All eight unchanged compiler workloads pass. The two Workspace counters are
  below their existing approved ceilings; none of the budgets or workload
  graphs was revised for this follow-up.
- Core/UI source, emitted and relocated declarations, native editor checks and
  actual Counters application emission pass.
- The otherwise-identical `InitArgs` positive control passes TypeScript 6 and 7,
  while the removed `Init` spelling is rejected at the actual contract property.
- The final focused Core selection passes 90 tests. Search and SnippetDisclosure
  pass 14 focused Story/Scene tests after their runner migration.
- Packed consumers pass public entrypoint, runtime and SSR checks, including
  critical Chromium, Firefox and WebKit paths. Generated-app smoke checks pass
  with one Effect runtime. These are local packed artifacts, not registry or
  deployed-release verification.
- The focused ephemeral-port and relay selection passes 38 tests with three
  existing skips. Disabling collision retry makes the new regression fail.
- Mutation controls for missing editor context and socket cleanup fail as
  intended, and the restored focused suites pass.

The [follow-up report](../../preview-followup-feedback-20261106.md) records the
application audit and deliberate low-level testing exceptions. The
[rendering comparison](../rendering/README.md) retains the whole-preview timing
and bundle costs with substantial host variability. Security review and
publication remain held for their separate approvals.
