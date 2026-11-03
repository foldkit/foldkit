# Website and Typing Game InMessage adoption

The four Website application Definitions and Typing Game Room now receive their
parent inputs through InMessages. This migrates six existing operation entries;
it adds no product behavior.

| Feature               | Received inputs                          | Generated Binding methods          |
| --------------------- | ---------------------------------------- | ---------------------------------- |
| Website Search        | `RequestedOpen`, `InformedOfRouteChange` | `requestOpen`, `informRouteChange` |
| Website ApiReference  | `InformedOfRouteChange`                  | `informRouteChange`                |
| Website ExampleDetail | `InformedOfRouteChange`                  | `informRouteChange`                |
| Website Playground    | `InformedOfSupport`                      | `informSupport`                    |
| Typing Game Room      | `InformedOfJoin`                         | `informJoin`                       |

The route and join method names are normalized explicitly. Their payloads and
argument order are unchanged. Local UI events, RPC replies, Command results,
Subscriptions, Models and provider selection remain with their existing owners.
Every constructor returns its Composition-authored receiver. These inputs emit
no OutMessages and need no additional public output bounds.

Search's focus Command and ApiReference's loading Command now live in their
owning `command.ts` modules. Their handler bodies and identities are preserved;
receive does not import update. ExampleDetail and Playground retain their
existing colocated implementation modules, with receive beside update.

Room declares one Schema-backed `Context` domain value and uses it in distinct
`Context` and `InMessageContext` tuples. The existing `recordJoinedPlayer`
transition lives in `steps.ts`, shared by the received join notification and
the local successful join reply. Its session persistence Command is unchanged.

## Verification

The final checks use Node 22.22.3 and the coordinated current core/UI artifacts,
including Dialog's local `CanceledDialog` fact.

| Check                                          | Result                                     |
| ---------------------------------------------- | ------------------------------------------ |
| Full Website source typecheck                  | Pass                                       |
| Full Typing Game client source typecheck       | Pass                                       |
| Website affected features and root Story suite | 75 tests in 12 files pass                  |
| Full Typing Game client suite                  | 30 tests in 3 files pass                   |
| Application lint for affected source and tests | Pass                                       |
| Existing Vitest assertion call trees           | All 150 preserved in order across 11 files |

The assertion comparison parses `expect` / `expectTypeOf` call trees from a
before snapshot and permits only the two method-name normalizations. Existing
Command and Scene assertions remain in place. Two added regressions exercise
Search input causes with its real focus/show/close Command identities, and Room's
received join using its own room context followed by a local Command completion.

Search's direct transition tests open through `Search.receive(RequestedOpen)`
and dismiss through the actual local `Dialog.Message.CanceledDialog` fact. They
do not place an InMessage inside a child Message envelope or acquire a second
child graph.

From `packages/website`:

```sh
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/vitest/vitest.mjs run src/search src/page/apiReference src/page/example src/page/playground src/story.test.ts
```

From `packages/typing-game/client`:

```sh
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/vitest/vitest.mjs run
```

The final logs are `/private/tmp/foldkit-inmessage-website-{source,tests}.log`,
`/private/tmp/foldkit-inmessage-typinggame-{source,tests}.log`, and
`/private/tmp/foldkit-inmessage-website-typinggame-lint.log`.
Assertion details are in
`/private/tmp/foldkit-inmessage-assertion-preservation.json`.
This checkpoint adds no production build, browser, emitted-declaration or
compiler-budget claim. Those remain with the integrated verification.
