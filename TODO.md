# TODO

## Documentation

- [ ] Document arrays of submodels with ID-based message routing
  - Common React pattern: `items.map(item => <ItemWithState key={item.id} />)`
  - Show Foldkit equivalent: `S.Array(Item.Model)` with messages containing item ID
  - Demonstrate routing messages to correct array element in update
  - Maybe we need an example app for this too?

- [ ] Changelog

- [ ] Search for the doc site (Cmd+K or similar)

- [ ] Document FieldValidation module on the website

## Foldkit

- [ ] Why does the html function not require a generic arg?

- [ ] Route.oneOf has overloads up to 10 args — consider making it truly variadic or documenting that users should chain oneOfs for more

- [ ] Foldkit UI — a port of Headless UI to Foldkit
  - Accessible, unstyled UI components as Model/Message/Update modules
  - Components: Dialog, Combobox, Listbox, Menu, Popover, Disclosure, Tabs, etc.
  - Each component exposes its own Model, Message, update, and view
  - Consumers compose them into their app's model and wire messages through update
  - [ ] Data attributes convention — every foldkit-ui component should emit `data-*` attributes reflecting its interactive state (e.g. `data-selected`, `data-disabled`, `data-active`, `data-checked`, `data-open`). Consumers style against these with CSS selectors or Tailwind's `data-[selected]:` modifiers instead of computing classNames from state. Design and implement this pattern on Tabs first (retrofitting `data-selected`, `data-disabled`), then apply consistently to all subsequent components.
  - [ ] Remaining components: Combobox, Switch, Radio Group, Checkbox, Input, Select, Textarea, Fieldset
  - [ ] `OnKeyDown` modifier keys (`shiftKey`, `ctrlKey`, `altKey`, `metaKey`) — useful for keyboard shortcuts, complex keyboard interactions, and potential future focus trap alternatives
  - [ ] General portal support for components that need to escape stacking contexts without native `<dialog>`

- [ ] Are we using Effect.Clock everywhere we should be in the examples, instead of Date.now()?

- [ ] Create `examples/foldkit-ui` example app — a standalone app with a page per UI component showing real integration patterns (model, message, init, update, view). To be done after all foldkit-ui components are built. Website links to this as the canonical usage reference.

- [ ] Example app with undo/redo, maybe a markdown previewer with undo/redo stack and WYSIWYG?

- [ ] Keying route views example should give a more realistic example of what it looks like, this is a crucial thing to get right

- [ ] Maybe show a better error if the user provides a container to run that does not exist?

- [ ] Communicating this idea somewhere on the website: "You can trust AI-written Foldkit code more that other frameworks, because the architecture makes correctness visible."

- [ ] Swap classnames for clsx across entire repo

- [ ] Write a manifesto — "Correctness You Can See" or similar. The core thesis: Foldkit's architecture makes correctness visible, not just achievable. Every state change and side effect lives in the update function. The same property that makes the code easy for humans to reason about makes it easy for LLMs to generate and review. This deserves a standalone page on the website, not just a README section.
