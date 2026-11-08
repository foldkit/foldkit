# Child-operation output precision

Both bounded prototypes preserve the tested output and graph contracts, but
exceed three of the nine unchanged compiler ceilings. Neither implementation
is adopted. The reported close/focus composition limitation remains open; this
is not an approved deferral.

The [experiment packet](measurements/experiments/README.md) contains both
complete patches against `7cc7d90e68`, source and runtime proof fixtures,
recorded emitted-consumer results, compiler costs and reproduction instructions.
Its manifest authenticates the stored and decompressed bytes. Raw command logs
were not retained, and the packet distinguishes that limit from the recorded
results.

The second representation recovers only 43, 63 and 43 type instantiations in
the failing workloads. It does not resolve the compiler cost or justify
weakening `combineSteps` OutMessage rejection. Existing conservative channel
checks stay in production.
