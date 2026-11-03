# Conditional and repeated update parts

Independent review found six ways that the initial composition typing accepted
an invalid combination. These were candidate defects found before publication.

## Reproduced failures

1. Choosing between an ordinary exhaustive update and a focused stage could
   hide the exhaustive branch. Adding another exhaustive update then passed
   checking but failed graph acquisition with two routing anchors.
2. Choosing between an already composed complete update and a focused stage
   could incorrectly produce a complete result when one branch had no anchor.
3. A variable-length array of exhaustive updates could disappear from the
   recursive tuple count, permitting repeated routing anchors.
4. A valid focused stage could mask another branch whose Plan annotation had
   erased its channel metadata. The composed type then lost a real Command
   handler requirement.
5. A composed contextual update could mask an ordinary alternative requiring a
   Context argument that the Definition declares optional.
6. A variable-length array of emitting record stages could disappear from the
   competing-OutMessage check even though entries may repeat.

The public fixture and internal Context/channel fixtures first failed with six
unused rejection directives against the original typing. The independent
unannotated probes also accepted the invalid expressions. Their direct runtime
reproduction confirmed the routing-anchor acquisition failure.

## Repair

Metadata, routing, and Context classification now inspect each union
alternative. A composed result has a consistent count of zero or one complete
update. Tuple tails account for unbounded arrays rather than dropping them;
variable-length collections are accepted only when their entries are focused
and cannot emit competing OutMessages.

The positive public fixture preserves exact Command requirements for conditional
focused updates and repeated silent focused updates. A choice between ordinary
and composed complete updates remains accepted. Optional, default, and rest
Context checks are retained.

The source checks pass after the repair. The independent probes reject all six
invalid expressions for their intended metadata, routing, Context, or emission
reasons. Emitted and source-free relocated verification and unchanged compiler
budgets are rerun against the final declarations.

This repair changes types only. SHA-256 comparisons establish that all 350 core
JavaScript files are byte-identical before and after the rebuild. The existing
runtime, coverage, packed three-browser, and matched rendering results retain
their exact runtime scope; declaration verification has its own final receipt.

Local evidence:

- `/private/tmp/foldkit-update-alternatives-before.log`
- `/private/tmp/foldkit-update-alternatives-context-before.log`
- `/private/tmp/foldkit-update-alternatives-after.log`
- `/private/tmp/foldkit-update-alternatives-context-after.log`
- `/private/tmp/foldkit-core-js-alternatives-equivalence.json`
- `/private/tmp/foldkit-review-update-unions/`
