# Shared Step organization

## Adopted convention

The migration starts from `abc1a0c1b6ad2ee9727a3e22a76ca2daf5e5f39b`.
It changes application organization, not the framework's Step API.

- `update.ts` maps local Messages to handlers and Steps.
- `composition.ts` owns Binding registration and child OutMessage policy.
- `steps.ts` owns reusable Steps shared by update, composition, or init.
- Larger shared modules use responsibility files under `steps/`, with an
  explicit `steps/index.ts` barrel.

Ownership follows the Model being transformed. A Step used by only one
responsibility stays with that code. Named Steps and purposeful Step factories
retain their `Step` suffix. Shared modules do not import the owning update or
completed Block.

## Consumer adoption

The audit covered example applications, Website, and Typing Game. The eligible
cross-responsibility transitions are migrated as follows:

| Owner                  | Shared module                                                                   | Consumers and retained behavior                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace root         | `examples/workspace/src/steps/issueData.ts` and `issueMove.ts`, explicit barrel | Update and child policies share snapshot, save, comment, and move Steps. Composition retains all Bindings, registration, and OutMessage decisions.             |
| Workspace IssueDetail  | `examples/workspace/src/issueDetail/steps.ts`                                   | Draft editing belongs to this child's Model and is shared by its update and listbox policies. The save-in-progress guard remains.                              |
| Pixel-art root         | `examples/pixel-art/src/steps.ts`                                               | Tool/color selection and grid-size changes are shared by update and child policies. Confirmation, canvas-save ordering, and pending-size behavior remain.      |
| Route-transitions root | `examples/route-transitions/src/steps.ts`                                       | Init and ChangedUrl share the transition coordinator formerly in `transition.ts`. ChangedUrl still writes the next Route before applying the transition Steps. |
| Typing Game root       | `packages/typing-game/client/src/steps.ts`                                      | Startup and route changes share `initRoomStep`. Both retain `Option.some(roomId)` initializer arguments.                                                       |

### Intentional exceptions

Website's `applyThemePreferenceStep` remains beside its sole child policy.
Website search clearing and URL handling remain update-local. Workspace's
`update/initChildrenStep.ts`, issue-result reconciliation, and rollback helpers
remain update-local. UI showcase's demo handlers stay with their demonstrations.
Compact Blocks do not acquire otherwise unused structural modules.

Typing Game's Home policy initializes a newly joined Room with `Option.none()`;
it is distinct from the existing-room `Option.some(roomId)` startup and route
flow. That policy is not merged into `initRoomStep`. The shared helper keeps its
existing Model-first initialization-result contract, including startup's
deferred `makeStep` wrapper.

### Module initialization

Workspace's shared Steps reference NotificationCenter and IssueBoard Bindings
from Composition. Pixel-art's shared grid-size Step references the confirmation
Dialog Binding. Those modules have intentional live-binding import cycles:
every cyclic Binding read happens inside a deferred Step producer or policy
callback, after module initialization. No Binding operation is invoked eagerly.
The migrated source, Story tests, production builds, and Workspace declaration
checks exercise those consumers. This is not a claim that the examples contain
no circular imports.

Typing Game imports RoomBinding directly from `composition/room`, avoiding a
cycle through the Composition barrel. Registration stays in Composition in all
applications.

## Guidance

Active Website update, init, Block, and Project Organization pages describe or
link the convention. The file-layout snippet shows both shared-module forms.
Root and scaffold agent guidance, scaffold `FOLDKIT.md`, and the consumer
generation/audit skills agree. The skills plugin advances from `0.18.57` to
`0.18.58`; the scaffold documentation has a CLI patch changeset. Historical
published material is unchanged.

The separate [general Step Message inference assessment](step-message-context-assessment-20261027.md)
retains the current API and precise Message annotations after the prototype
fails an unchanged compiler ceiling. This organization migration does not ship
that prototype or claim to improve general `makeStep` contextual inference.

## Verification

All listed adopted-migration checks pass:

- Direct source typechecks for Workspace, Pixel-art, Route-transitions, and
  Typing Game client.
- Focused Story tests: Workspace root and IssueDetail, 53; Pixel-art, 24;
  Route-transitions, 10; Typing Game, 13.
- Full Workspace suite, 154 tests.
- Production builds for all four migrated applications and Website.
- CLI build/template generation and all 18 CLI tests.
- Application and Effect lint for all 19 changed consumer source files,
  with the appropriate application configuration and warnings denied.
- Existing circular-dependency gate for Website and Typing Game. Its scope
  excludes the example applications and their intentional deferred cycles.
- Full actual Workspace root declaration emission, followed by strict
  relocation with application source absent and `skipLibCheck: false`.
  All 156 declaration files are copied to the isolated consumer. Exact Model
  and Message checks pass; erasing Model in the negative control makes the
  expected rejection directive unused, and restoring the fixture passes.
- Skill version gate, targeted formatting, and whitespace checks.

The Workspace declaration run reports 998,464 Types and 15,052,758
instantiations, using 967,147 KB. These are whole-program compiler diagnostics,
not editor timings. The unchanged six compiler fixtures pass on the restored
framework; the rejected inference candidate's counters and patch are retained
in its separate assessment. No framework source or compiler budget changes
are included in this migration.

Raw logs, source checks, build results, the declaration relocation fixture,
and audit notes are in `/private/tmp/foldkit-step-context-20261027`. The initial
audit's speculation about startup Room arguments is superseded by the verified
`Option.some(roomId)` source contract recorded above.

Website's production build still reports existing API-documentation warnings.
No fresh native editor, runtime benchmark, packed release cohort, or security
review is claimed for this organization change. The user's development server
is left running. This work does not publish or promote a preview snapshot.
