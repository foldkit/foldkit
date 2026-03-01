# TODO

## Documentation

- [x] Add "Model-as-Union" pattern documentation
  - Current "Scaling with Submodels" docs cover embedding child models as struct fields
  - Need to document the pattern where the Model itself is a union of exclusive states (e.g., `S.Union(LoggedOut.Model, LoggedIn.Model)`)
  - Covers: state transitions between variants, update returning result unions, guard checks
  - Reference: `examples/auth` demonstrates this pattern
  - Need to communicate the "rules of thumb" for this -- e.g. when to use OutgoingMessage, where to put that message organizationally, etc.

- [x] Document 3-tuple OutMessage pattern for child-to-parent communication
  - `[Model, Commands, Option<OutMessage>]` return type from update functions
  - When to use OutMessage vs Commands for signaling parent
  - How parent updates handle child OutMessages via Option.match
  - The mappedCommands pattern for lifting child commands to parent level
  - OutMessage should be a Schema union in message.ts (not just type alias)
  - Reference: `examples/auth` demonstrates the full flow

- [x] Document multiple instances with independent state
  - React devs expect `<Foo /> <Foo /> <Foo />` to give three isolated state slices
  - Show how to explicitly model this: `sideMenu1: SideMenu.Model, sideMenu2: SideMenu.Model, ...`
  - Explain the tradeoff: more explicit, but all state visible in model
  - Added as FAQ in "Coming from React" page with code snippet showing both patterns

- [ ] Document arrays of submodels with ID-based message routing
  - Common React pattern: `items.map(item => <ItemWithState key={item.id} />)`
  - Show Foldkit equivalent: `S.Array(Item.Model)` with messages containing item ID
  - Demonstrate routing messages to correct array element in update
  - Maybe we need an example app for this too?

- [x] Expand "Coming from React" tradeoffs section
  - Current "Component encapsulation" bullet mentions the tradeoff but doesn't show the alternative
  - Add concrete example of how you handle multiple instances in Foldkit vs React
  - Maybe the table with the React/Foldkit columns should be moved up to frame the comparison earlier?
  - Done: Added FAQ entry with submodel pattern explanation and code example

- [x] Update website examples page to include auth example

- [x] Add docs on errorView to website
  - Also add an example app showcasing usage

- [x] Add auth example to README

- [x] Clicking Foldkit logo in nav should probably link home?

- [x] Mobile menu improvements (scrollable nav, icons at bottom, fixed header)

- [ ] Changelog

- [ ] Search for the doc site (Cmd+K or similar)

- [ ] Document FieldValidation module on the website

- [x] Library reference docs that pull directly from code comments

## Tooling

- [x] Add auth example as starter template in `create-foldkit-app`

- [x] Upgrade node (Vite is complaining)

## Foldkit

- [ ] Why does the html function not require a generic arg?

- [ ] Route.oneOf has overloads up to 10 args — consider making it truly variadic or documenting that users should chain oneOfs for more

- [x] Noticed that Effect is not technically a dependency of Foldkit, seems wrong?
  - Moved `@effect/platform-browser` from dependency to peerDependency (alongside `effect`)
  - Both also listed in devDependencies for local dev/test

- [ ] Foldkit UI — a port of Headless UI to Foldkit
  - Accessible, unstyled UI components as Model/Message/Update modules
  - Components: Dialog, Combobox, Listbox, Menu, Popover, Disclosure, Tabs, etc.
  - Each component exposes its own Model, Message, update, and view
  - Consumers compose them into their app's model and wire messages through update
  - [x] Tabs: vertical orientation — support `orientation: 'vertical'` that swaps ArrowLeft/Right to ArrowUp/Down
  - [x] Tabs: manual activation mode — focus moves on arrow keys but selection only happens on Enter/Space
  - [x] Tabs: disabled tabs — individual tabs can be marked disabled (skipped in keyboard nav, not clickable)
  - [x] Tabs: panel persistence — option to keep inactive panels in the DOM (hidden) instead of unmounting, for preserving internal state
  - [x] Tabs: element polymorphism (`as` prop) — render tab/panel as arbitrary elements instead of fixed button/div
  - [x] Tabs: outer wrapper className — styling hook for the root container div
  - [ ] Data attributes convention — every foldkit-ui component should emit `data-*` attributes reflecting its interactive state (e.g. `data-selected`, `data-disabled`, `data-active`, `data-checked`, `data-open`). Consumers style against these with CSS selectors or Tailwind's `data-[selected]:` modifiers instead of computing classNames from state. Design and implement this pattern on Tabs first (retrofitting `data-selected`, `data-disabled`), then apply consistently to all subsequent components.
  - [x] Menu: dropdown menu with keyboard navigation, typeahead search, aria-activedescendant focus management
  - [ ] Remaining components: Listbox, Combobox, Popover, Switch, Radio Group, Checkbox, Input, Select, Textarea, Fieldset
  - [ ] `OnKeyDown` modifier keys (`shiftKey`, `ctrlKey`, `altKey`, `metaKey`) — useful for keyboard shortcuts, complex keyboard interactions, and potential future focus trap alternatives
  - [ ] General portal support for components that need to escape stacking contexts without native `<dialog>`

- [ ] Are we using Effect.Clock everywhere we should be in the examples, instead of Date.now()?

- [ ] Create `examples/foldkit-ui` example app — a standalone app with a page per UI component showing real integration patterns (model, message, init, update, view). To be done after all foldkit-ui components are built. Website links to this as the canonical usage reference.

- [x] Use Disclosure component for API reference disclosures and React page FAQ section

- [ ] Example app with undo/redo, maybe a markdown previewer with undo/redo stack and WYSIWYG?

- [ ] Keying route views example should give a more realistic example of what it looks like, this is a crucial thing to get right

- [ ] Maybe show a better error if the user provides a container to run that does not exist?

- [ ] Communicating this idea somewhere on the website: "You can trust AI-written Foldkit code more that other frameworks, because the architecture makes correctness visible."

- [ ] Swap classnames for clsx across entire repo
