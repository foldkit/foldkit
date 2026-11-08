# Rejected MakeLayer projection checkpoint

The prototype names one internal `AcquiredImplementationProjection` for the record-form `MakeLayer` overload. It retains the existing validators, outer `NoInfer` tuple, `NoInfer<Body>` return projection, selected facts, host definitions, acquisition errors and Services. The custom Effect overload is unchanged.

## Allocation result

Counts are fixture totals minus each twin's own source-mode baseline.

| Fixture                  | Current instantiations | Candidate instantiations | Current types | Candidate types |   Change |
| ------------------------ | ---------------------: | -----------------------: | ------------: | --------------: | -------: |
| layered-composition-6    |              1,000,347 |                1,000,321 |       100,204 |         100,202 | -26 / -2 |
| deep-composition-8       |                727,244 |                  727,244 |        66,763 |          66,763 |    0 / 0 |
| wide-composition-100     |              1,456,835 |                1,456,835 |        94,322 |          94,322 |    0 / 0 |
| command-requirements-200 |                406,677 |                  406,677 |        77,320 |          77,320 |    0 / 0 |
| wide-subscriptions-100   |                433,376 |                  433,376 |       -11,399 |         -11,399 |    0 / 0 |
| workspace-composition-4  |              1,501,026 |                1,501,026 |       105,927 |         105,927 |    0 / 0 |
| workspace-composition-8  |              2,660,494 |                2,660,494 |       147,808 |         147,808 |    0 / 0 |
| machine-search           |              2,504,911 |                2,504,911 |       308,048 |         308,048 |    0 / 0 |
| attribute-bundles-200    |                112,867 |                  112,867 |        28,240 |          28,240 |    0 / 0 |

The raw candidate baseline moved by -51 instantiations, -11 types and +4 symbols. After baseline subtraction, layered-composition-6 moved by -26 instantiations, -2 types and 0 symbols. This is not a material improvement.

These source-mode counts are not the published-declaration 2,707,124-instantiation / 336,291-type workload and do not measure or imply editor latency.

## Contract checks

The candidate passed the source configs for record completion, constructor-union ownership, host-handler selection, unified-root selection, Program portability and Binding relationships. These retain record and Effect constructors, portable inline and extracted plans, wrong-graph and partial-union rejection, constructor errors and Services, host-handler selection, selected provider facts, Commands and Service channels.

No dist build, declaration emission, LSP timing or browser work ran for this rejected prototype. The projection should not be adopted.
