# Accepted unified Block compiler baseline

The user accepted the measured Workspace compiler cost: about 1.7% more
instantiations for four groups and 10.7% for eight groups against their previous
ceilings. This accepts the measured API cost for further verification. It does
not approve publication or establish full application and family compatibility.

Following the existing budget policy, only two ceilings change, with no added
tolerance:

| Workload    | Previous instantiation ceiling | Accepted ceiling | Types ceiling |
| ----------- | -----------------------------: | ---------------: | ------------: |
| Workspace 4 |                      2,642,699 |        2,687,288 |       229,173 |
| Workspace 8 |                      4,515,010 |        4,999,644 |       299,721 |

All other budgets, fixture bodies, graph widths, domain logic, operation sources
and assertions are unchanged. The
[previous proof](./current-proof-20261104.md), receipts, hashes and patch remain
historical records of the comparison before acceptance.

The fresh original seven-workload gate passes. The retained four-graph driver
passes original and adapted Deep, Wide, Workspace 4 and Workspace 8. Counts equal
the preceding proof; only the two reviewed maxima changed. The adapted Workspace
runs reach their exact new instantiation ceilings. This is a reviewed baseline
change, not a new compiler optimization.

The runnable proof harness now selects Node from PATH, resolves the TypeScript 6
package's declared `tsc6` binary and checks its installed version against the
lockfile. It creates its log directory and exits nonzero when any check fails.
An isolated runner copy executes a failing command followed by a successful one:
its statuses are `[7, 0]` and its final exit is `1`. The copy is removed, the live
runner hash is unchanged by the control, and no Foldkit source or dist file is
mutated. The ordinary nine-check run then passes. Source proof mappings use
relative project paths. New harness hashes are recorded separately from the
frozen proof.

[Decision and verification receipt](./accepted-cost-20261104.json) records the
exact caps, source preservation, commands, counts, runner control and hashes.
[Explicit staging manifest](./accepted-cost-staging-20261104.json) lists source
proofs and harnesses without generated package copies or dependency links.

The next gates are the complete Workspace application and actual Query/UI-family
verification on this accepted baseline. Those earlier experiments are historical
until rerun. Broad migration, publication and Daybreak review remain held.
