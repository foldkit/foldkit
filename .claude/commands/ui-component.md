Build a new foldkit UI component: **$ARGUMENTS**

## Research Phase

1. Study the Headless UI equivalent of this component — source code is available locally at `~/Repos/headlessui` (React implementation under `packages/@headlessui-react/src/components/`)
2. Read the WAI-ARIA Authoring Practices for the relevant pattern
3. Identify the key interactions: keyboard navigation, focus management, ARIA attributes, state transitions

## Planning Phase

Enter plan mode and design the component following these integration touchpoints:

### Library files (packages/foldkit/src/)

- `ui/{name}/index.ts` — Model, Messages, init, update, view (follow Dialog/Tabs patterns)
- `ui/{name}/index.test.ts` — tests for init, every update message handler, and any exported pure helpers (follow Menu/Dialog test patterns)
- `ui/{name}/public.ts` — public re-exports (follow Dialog/Tabs patterns)
- `ui/index.ts` — add `export * as {Name} from './{name}/public'`
- `html/index.ts` — add any new ARIA attributes needed (4 locations: tagged enum, destructured constructors, buildVNodeData matcher, HtmlAttributes type + htmlAttributes factory)
- `task/index.ts` — add any new Task helpers needed
- `ui/keyboard.ts` — reuse existing keyboard navigation utilities (wrapIndex, findFirstEnabledIndex, keyToIndex)

### Package configuration

- `packages/foldkit/package.json` — add export entry: `"./ui/{name}": { "types": "./dist/ui/{name}/public.d.ts", "import": "./dist/ui/{name}/public.js" }`

### Website demo (packages/website/src/page/foldkitUi/)

- `{name}.ts` — demo view file with styled example
- `model.ts` — add `{name}Demo: {Name}.Model`
- `message.ts` — add `Got{Name}DemoMessage` with `message: Ui.{Name}.Message`
- `init.ts` — add `{name}Demo: Ui.{Name}.init({ id: '{name}-demo' })`
- `update.ts` — add `Got{Name}DemoMessage` handler
- `view.ts` — add section after previous component, remove from `plannedComponents`

### Tracking

- `TODO.md` — update remaining components list

## Implementation Conventions

- Follow the four-group message layout: values, union, individual types, message type
- Use `m()` from `foldkit/schema` for all message constructors
- Use `evo()` from `foldkit/struct` for model updates
- Use `Effect.Match` with `M.tagsExhaustive` in update — never switch statements
- Use `M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>()`
- Destructure html elements/attributes from `html<Message>()` in view functions
- Use `Option` for optional model fields, not null/undefined
- Use `DataAttribute` for state-reflecting data attributes (data-open, data-active, data-disabled)
- Disabled items: no event handlers, `AriaDisabled(true)`, `DataAttribute('disabled', '')`
- Extract keyboard handlers into named functions at the view level
- Use `keyed` for all elements that need stable identity across renders
- Never use `as` type casting. If there's a type error, fix the root cause.

## Verification

1. `pnpm --filter foldkit build` — library compiles
2. `pnpm --filter foldkit test` — all tests pass, including new component tests
3. `pnpm --filter website build` — website builds and demo works
4. Manual testing of all keyboard interactions, ARIA attributes, and data attributes
