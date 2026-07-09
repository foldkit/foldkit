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

Import a component by name. Each import is a namespace that groups the component's `view` and, for stateful components, its `Model`, `Message`, `init`, and `update`.

```typescript
import { html } from 'foldkit/html'

import { Button } from '@foldkit/ui'

const view = () => {
  const h = html<Message>()

  return Button.view({
    onClick: ClickedSave(), // your Message
    toView: attributes =>
      h.button(
        [...attributes.button, h.Class('px-4 py-2 rounded-lg')],
        ['Save'],
      ),
  })
}
```

Components come in two shapes:

- **Render helpers** (Button, Input, Textarea, Select, RadioGroup, Checkbox, Switch, Disclosure, Fieldset) are stateless. Call their `view` directly with a typed config. The controlled helpers (RadioGroup, Checkbox, Switch, Disclosure) take the current value in through their config and dispatch a parent Message when the user changes it; you store that value in your own Model.
- **Submodels** (Combobox, Dialog, Listbox, Menu, Popover, and the like) own a Model. Embed them with `h.submodel`, drive them through their `update`, and consume their `OutMessage` in the parent.

Every component is also available as a subpath import:

```typescript
import { Button } from '@foldkit/ui/button'
```

When a component name collides with another import (for example core's `Calendar`), alias it:

```typescript
import { Calendar as UiCalendar } from '@foldkit/ui'
```

## Components

Animation, Button, Calendar, Checkbox, Combobox, DatePicker, Dialog, Disclosure, DragAndDrop, Fieldset, FileDrop, Input, Listbox, Menu, Popover, RadioGroup, Select, Slider, Switch, Tabs, Textarea, Toast, Tooltip, and VirtualList.

See the [component documentation](https://foldkit.dev/ui/overview) for the full API and a live example of each.

## License

MIT
