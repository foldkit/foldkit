# Command declaration diagnostics

[#1776](https://github.com/foldkit/foldkit/issues/1776) reproduces on the current
API: an invalid attached handler can produce a diagnostic for the final no-args,
no-handler overload. The diagnostic blames valid `args` or `handler` fields as
`never` instead of showing the undeclared result Message or incompatible args.
The declaration remains rejected at compile time.

## Assessment

Moving the args-and-handler signature to the end improves both common errors in
source and relocated declarations. Accepted forms, including interruption,
still check. The comparison uses the optimized signatures before the separate
Program guard, which adds 21 Types to these fixtures. That reordered encoding
exceeds the unchanged Workspace Types ceilings:

| Candidate                                              | Workspace 4 Types | Ceiling |
| ------------------------------------------------------ | ----------------: | ------: |
| Current API                                            |           205,737 | 206,314 |
| Reordered signatures with direct field projection      |           206,939 | 206,314 |
| Reordered signatures with a private Message projection |           206,943 | 206,314 |

A private Message projection does not recover the cost; its Workspace 8 result
is also over budget at 281,736 Types against 280,523. A duplicate terminal
signature increases expansion further. An interrupt-parameter default reduces
some work but breaks contextual keyed-interruption inference, so it is rejected.

Retain the current signatures and budgets. The active Command guide explains
which contracts to inspect when the final-overload diagnostic is misleading.
This is a clarified diagnostic limitation, not an implemented compiler-error
improvement. These bounded experiments do not establish that every possible
diagnostic encoding would have the same cost.

Undeclared result Messages, incompatible handler args, invalid construction
requirements and missing providers must remain source and emitted compile-time
errors. Do not use a cast, wider Message protocol or runtime validation as a
repair for invalid handler wiring.

## Subsequent cancellation repair

The keyed-cancellation repair separates ordinary and keyed overloads and uses
`Schema.Struct.Type<Fields>` for decoded Command args. That contract-equivalent
normalization recovers the compiler cost of the required safety fix. It does not
adopt the reordered terminal handler signature assessed above, or establish that
all misleading final-overload diagnostics are repaired. Current accepted and
rejected cases remain checked through source and relocated declarations.
