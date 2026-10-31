# @foldkit/oxlint-plugin

Oxlint rules for Foldkit applications. Extend `recommended.json` for the supported convention set, or `all.json` for every rule. Both presets enable every rule at error severity, turn `foldkit/no-nonportable-server-globals` on only for server files, turn `foldkit/no-impure-call-at-decision-time` off for server and entry files, and turn off the rules that police application definitions in test files.

```json
{
  "extends": ["./node_modules/@foldkit/oxlint-plugin/recommended.json"]
}
```

## Rules

| Rule                                                 | What it enforces                                                                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `foldkit/acquire-release-constructs-in-acquire-body` | Construct resources inside the `Effect.acquireRelease` acquire Effect instead of returning eager or captured handles.              |
| `foldkit/block-name-matches-variable`                | Name a Block class after its Block id and its Layer `<BlockId>Live`.                                                               |
| `foldkit/command-define-pascal-const`                | Name Commands with a literal PascalCase string assigned to a const of the same name.                                               |
| `foldkit/keyed-required-for-mapped-rows`             | Wrap identity-bearing mapped row elements in `keyed` so the runtime patches the right rows.                                        |
| `foldkit/lazy-view-stable-references`                | Keep lazy slots and their view functions referentially stable so the lazy cache can hit.                                           |
| `foldkit/mount-factory-must-use-element`             | Require a Mount handler to use its live element.                                                                                   |
| `foldkit/no-array-index-view-keys`                   | Key rows and Block instances by stable Model identifiers instead of map callback array indexes.                                    |
| `foldkit/no-disabling-dev-guardrails`                | Keep the `slow` dev guardrail enabled in Program options.                                                                          |
| `foldkit/no-duplicate-onmount-per-element`           | Attach at most one `OnMount` attribute per element.                                                                                |
| `foldkit/no-empty-children-array`                    | Omit the children argument on elements that have no children.                                                                      |
| `foldkit/no-empty-commands-array`                    | Omit a literal empty `commands` property from an update result.                                                                    |
| `foldkit/no-empty-object-tagged-call`                | Call no-field variant constructors with no arguments.                                                                              |
| `foldkit/no-hand-rolled-command-struct`              | Create Commands with `Command.define` and transform them with the `Command.map*` helpers instead of hand-building Command structs. |
| `foldkit/no-hardcoded-route-strings`                 | Call Routers as printers instead of hardcoding route strings in navigation calls.                                                  |
| `foldkit/no-impure-call-at-decision-time`            | Keep direct time and randomness calls inside deferred Effect and lifecycle execution callbacks.                                    |
| `foldkit/no-module-level-mutable-state`              | Keep state in the Model instead of module-level `let`/`var` bindings.                                                              |
| `foldkit/no-nonportable-server-globals`              | Avoid browser-only globals in files that run across Foldkit server targets.                                                        |
| `foldkit/no-noop-message`                            | Use meaningful Messages instead of generic `NoOp` Messages.                                                                        |
| `foldkit/no-prevent-default-in-stream-operator`      | Disallow unreliable `preventDefault` calls inside Stream operator callbacks.                                                       |
| `foldkit/no-raw-dom-event-attributes`                | Dispatch events through typed `On*` attribute constructors instead of raw `on*` DOM attributes.                                    |
| `foldkit/no-route-query-constructor-default`         | Avoid `Schema.withConstructorDefault` on `Route.query` fields because it has no effect on parsing.                                 |
| `foldkit/no-spread-in-modify-fields`                 | Use a nested `modifyFields` instead of spreading a record inside a `modifyFields` field updater.                                   |
| `foldkit/no-switch-on-message-tag`                   | Dispatch on tagged Messages and state with the union's `match` helper or Effect `Match` instead of switching on `_tag`.            |
| `foldkit/prefer-callable-message-constructor`        | Construct Messages through their callable Schema constructor instead of typing or casting an object literal.                       |
| `foldkit/prefer-command-mapmessage`                  | Lift a Command result Message with `Command.mapMessage` or `Command.mapMessages` so Story and Scene resolve can recover it.        |
| `foldkit/prefer-effect-module-names`                 | Use Effect module names without import aliases.                                                                                    |
| `foldkit/prefer-option-over-nullable-in-model`       | Model absence with `Schema.Option` instead of nullable or optional fields.                                                         |
| `foldkit/require-rel-for-external-link`              | Require a protective `Rel` value alongside `Target('_blank')` attributes.                                                          |
| `foldkit/selection-block-factory-at-module-scope`    | Create selection Block factories such as `Listbox.makeBlock<Item>()` once as module-scope variable initializers.                   |

## How rules recognize Blocks

Several rules look inside a Block implementation. A Block is a class that extends `Block<Self, ...>()('Name', contract)`, with `Block` imported from `foldkit` or `foldkit/block` (namespace imports and aliases included). A generic factory may bind the declaration to a const instead of declaring a class, as in `const TabsClass = Block<Tabs<Value>>()('Tabs', contract)`.

The implementation is the object returned by the constructor passed to that class's `make`. The constructor may be passed directly or through `Effect.fn(...)`, `Effect.fn('name')(...)`, or `Effect.fnUntraced(...)`:

```ts
export class Counter extends Block<Counter>()('Counter', {
  Model,
  Message,
  Mount: [FocusInput],
}) {}

export const CounterLive = Counter.make(
  Effect.fn(function* () {
    return {
      model: { count: 0 },
      update: {
        ClickedIncrement: model => ({ model: { count: model.count + 1 } }),
      },
      mounts: {
        FocusInput: ({ element }) => Effect.sync(() => element.focus()),
      },
      view: (model, h) => h.div([], [`${model.count}`]),
    }
  }),
)
```

The rules read the implementation's slots as follows:

- The second parameter of `view` is an HTML builder, so the view rules check `h.*` calls in it.
- `update` handlers, including OutMessage handlers spread in through `instance.on({ ... })`, and `view` run at decision time. `foldkit/no-impure-call-at-decision-time` reports `Date.now()`, `Math.random()` and similar calls in them even though they sit inside an `Effect.fn` constructor. Subscription `dependencies` are decision time too.
- `commands` and `mounts` handlers and Subscription `stream` functions run when the Runtime executes them, so time and randomness calls are allowed there.
- Each `mounts` handler must use the `element` it receives (`foldkit/mount-factory-must-use-element`).
- A factory from `yield* Child.each('field', args)` is a keyed instance factory. `foldkit/no-array-index-view-keys` reports a map callback index passed as its key.

The recognition is syntactic and file-local. A Block class imported from another module is not resolved, so a `make` call on an imported class is not checked. Constructors stored in a separate variable before being passed to `make` are not followed; pass the constructor inline.

## HTML builder recognition

Rules that inspect HTML builder calls recognize:

- A parameter annotated with `HtmlBuilder` (from `foldkit/html`, or `Html.HtmlBuilder` from `foldkit`), directly or through a local type alias.
- A type alias imported from a relative module that exports `type X = HtmlBuilder<...>`, followed through explicit re-export barrels. Declaration-like text in comments and string literals is ignored.
- The `h` parameter of a Block `view`.
- `inertHtml` members.

Package aliases, wildcard re-exports, JavaScript declarations, and declaration-only modules are not resolved. Annotate those helpers directly with `HtmlBuilder` when lint recognition is needed. Unrelated types named `*ViewBuilder` are left alone.

## Naming Blocks

`foldkit/block-name-matches-variable` requires a Block class declaration to carry its literal Block id as its name and to pass itself as the `Self` type. The Layer returned by `make`, including through `.pipe(...)`, is named `<BlockId>Live`:

```ts
export class Search extends Block<Search>()('Search', { Model, Message }) {}

export const SearchLive = Search.make(...)
```

A generic factory that binds the declaration to a const keeps its own local name, and its Layer still uses the Block id: `const TabsLive = TabsClass.make(...)`. Dynamic Block ids are left for the developer to review.

## Program options

`foldkit/no-disabling-dev-guardrails` checks the options object passed directly to `Program.make` or `Program.makeElement` from `foldkit` or `foldkit/program`, including namespace and import aliases. It reports `slow: false`. Tune the warnings with an object instead:

```ts
const program = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
  slow: { thresholdOverrides: { View: 32 } },
})
```
