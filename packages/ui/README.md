# @foldkit/ui

Headless, accessible UI components for [Foldkit](https://foldkit.dev).

Each component ships behavior, not markup: the ARIA attributes, keyboard navigation, focus management, and state machine. You provide the elements and the styling. Components follow The Elm Architecture, so they compose into a Foldkit app the same way the rest of your code does.

## Installation

```bash
pnpm add @foldkit/ui
# or
npm install @foldkit/ui
# or
yarn add @foldkit/ui
```

`@foldkit/ui` lists `foldkit` and `effect` as peer dependencies, so install those alongside it.

## Usage

Import a component namespace by name. Stateful components are completed Blocks: `Application.makeBinding(Dialog.block, config)` connects their state, Messages, public operations, view, and lifecycle effects to the parent. Stateless render helpers such as Button expose a view function.

```typescript
import type { HtmlBuilder } from 'foldkit/html'

import { Button } from '@foldkit/ui'

const view = (h: HtmlBuilder<Message>) =>
  Button.view(
    {
      onClick: Message.ClickedSave(),
      toView: attributes =>
        h.button(
          [...attributes.button, h.Class('px-4 py-2 rounded-lg')],
          ['Save'],
        ),
    },
    h,
  )
```

Components come in two shapes:

- **Render helpers** (Button, Input, Textarea, Select, Checkbox, Switch, Disclosure, Fieldset) are stateless. Call their `view` directly with a typed config. The controlled helpers (Checkbox, Switch, Disclosure) take the current value in through their config and dispatch a parent Message when the user changes it; you store that value in your own Model.
- **Blocks** (Combobox, Dialog, Listbox, Menu, Popover, RadioGroup, and the like) own a Model. Create a Binding through the parent authoring value, such as `const DialogBinding = Application.makeBinding(Dialog.block, config)`, include it in the Composition's `bindings`, and render its `embedView(...)` descriptor with `h.block`. The Binding also folds the child's Messages and OutMessages into the parent.

Component subpaths also expose domain helpers and types. Generic factories are separate exports: `Combobox.makeBlock(City)` returns a completed Block with Schema-refined payloads, and `Tabs.makeBlock<Tab>()` refines a type-only tab value. Import component ViewInputs and other helper types from their subpaths.

Stateless render helpers are also available as subpath namespaces:

```typescript
import * as Button from '@foldkit/ui/button'
```

When a component name collides with another import (for example core's `Calendar`), alias it:

```typescript
import { Calendar as UiCalendar } from '@foldkit/ui'
```

## Components

Animation, Button, Calendar, Checkbox, Combobox, DatePicker, Dialog, Disclosure, DragAndDrop, Fieldset, FileDrop, HoverIntent, Input, Listbox, Menu, Meter, Nav, Popover, Progress, RadioGroup, Select, Slider, Switch, Tabs, Textarea, Toast, Tooltip, and VirtualList.

See the [component documentation](https://foldkit.dev/ui/overview) for the full API and a live example of each.

## Anchor

`Anchor` is the positioning runtime the floating components share, exported at `@foldkit/ui/anchor`. It is neither a render helper nor a Block, so it is not in the list above. Reach for it when you need to anchor and portal a panel of your own from a Mount, and none of Listbox, Combobox, Menu, Popover, Tooltip, or DatePicker fits. See the [Anchor documentation](https://foldkit.dev/ui/anchor).

## License

MIT
