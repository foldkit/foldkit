# Switch Component Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an accessible toggle switch (`role="switch"`) as a Foldkit UI component with keyboard support and form integration.

**Architecture:** Simplest UI component — two-field Model (`id`, `isChecked`), two Messages (`Toggled`, `NoOp`), pure update with no commands, and a view rendering a button with `role="switch"` plus optional label, description, and hidden input for forms. No new html attributes needed — `AriaChecked`, `Role`, `AriaLabelledBy`, `AriaDescribedBy`, `AriaDisabled`, `DataAttribute` all exist.

**Tech Stack:** Effect Schema, Effect Match, Foldkit html DSL, vitest

**Design doc:** `docs/plans/2026-03-03-switch-component-design.md`

---

### Task 1: Switch — Tests

**Files:**
- Create: `packages/foldkit/src/ui/switch/index.test.ts`

**Step 1: Write tests for init and update**

```ts
import { describe, expect, it } from 'vitest'

import { init, NoOp, Toggled, update } from './index'

describe('Switch', () => {
  describe('init', () => {
    it('defaults isChecked to false', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isChecked: false,
      })
    })

    it('accepts isChecked override', () => {
      expect(init({ id: 'test', isChecked: true })).toStrictEqual({
        id: 'test',
        isChecked: true,
      })
    })
  })

  describe('update', () => {
    it('toggles from unchecked to checked on Toggled', () => {
      const model = init({ id: 'test' })
      const [result, commands] = update(model, Toggled())
      expect(result.isChecked).toBe(true)
      expect(commands).toHaveLength(0)
    })

    it('toggles from checked to unchecked on Toggled', () => {
      const model = init({ id: 'test', isChecked: true })
      const [result, commands] = update(model, Toggled())
      expect(result.isChecked).toBe(false)
      expect(commands).toHaveLength(0)
    })

    it('returns same model reference on NoOp', () => {
      const model = init({ id: 'test' })
      const [result, commands] = update(model, NoOp())
      expect(result).toBe(model)
      expect(commands).toHaveLength(0)
    })
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter foldkit test -- --run src/ui/switch/index.test.ts`
Expected: FAIL — `./index` module not found

**Step 3: Commit**

```
git add packages/foldkit/src/ui/switch/index.test.ts
git commit -m "test(switch): add init and update tests"
```

---

### Task 2: Switch — Implementation

**Files:**
- Create: `packages/foldkit/src/ui/switch/index.ts`

**Step 1: Implement Model, Messages, init, update, view**

```ts
import { Match as M, Option, Schema as S } from 'effect'

import type { Command } from '../../command'
import { html } from '../../html'
import type { Html } from '../../html'
import { m } from '../../message'
import { evo } from '../../struct'

// MODEL

/** Schema for the switch component's state, tracking the toggle's checked status. */
export const Model = S.Struct({
  id: S.String,
  isChecked: S.Boolean,
})

export type Model = typeof Model.Type

// MESSAGE

/** Sent when the user toggles the switch via click or Space key. */
export const Toggled = m('Toggled')
/** Placeholder message used when no action is needed. */
export const NoOp = m('NoOp')

/** Union of all messages the switch component can produce. */
export const Message = S.Union(Toggled, NoOp)

export type Toggled = typeof Toggled.Type
export type NoOp = typeof NoOp.Type

export type Message = typeof Message.Type

// INIT

/** Configuration for creating a switch model with `init`. */
export type InitConfig = Readonly<{
  id: string
  isChecked?: boolean
}>

/** Creates an initial switch model from a config. Defaults to unchecked. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isChecked: config.isChecked ?? false,
})

// UPDATE

/** Processes a switch message and returns the next model and commands. */
export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      Toggled: () => [evo(model, { isChecked: isChecked => !isChecked }), []],
      NoOp: () => [model, []],
    }),
  )

// VIEW

/** Configuration for rendering a switch with `view`. */
export type ViewConfig<Message> = Readonly<{
  model: Model
  toMessage: (message: Toggled | NoOp) => Message
  label: string
  description?: string
  isDisabled?: boolean
  name?: string
  value?: string
  className?: string
  buttonClassName?: string
  labelClassName?: string
}>

const labelId = (id: string): string => `${id}-label`
const descriptionId = (id: string): string => `${id}-description`

/** Renders an accessible switch toggle with label, optional description, and optional hidden form input. */
export const view = <Message>(config: ViewConfig<Message>): Html => {
  const {
    button,
    div,
    input,
    label,
    p,
    AriaChecked,
    AriaDescribedBy,
    AriaDisabled,
    AriaLabelledBy,
    Class,
    DataAttribute,
    Id,
    Name,
    OnClick,
    OnKeyUpPreventDefault,
    Role,
    Tabindex,
    Type,
    Value,
  } = html<Message>()

  const {
    model: { id, isChecked },
    toMessage,
    label: labelText,
    description,
    isDisabled = false,
    name,
    value: formValue = 'on',
    className,
    buttonClassName,
    labelClassName,
  } = config

  const handleKeyUp = (key: string): Option.Option<Message> =>
    M.value(key).pipe(
      M.when(' ', () => Option.some(toMessage(Toggled()))),
      M.orElse(() => Option.none()),
    )

  const checkedAttributes = isChecked
    ? [DataAttribute('checked', '')]
    : []

  const disabledAttributes = isDisabled
    ? [AriaDisabled(true), DataAttribute('disabled', '')]
    : []

  const buttonAttributes = [
    Role('switch'),
    AriaChecked(isChecked),
    AriaLabelledBy(labelId(id)),
    Tabindex(0),
    ...checkedAttributes,
    ...disabledAttributes,
    ...(description ? [AriaDescribedBy(descriptionId(id))] : []),
    ...(buttonClassName ? [Class(buttonClassName)] : []),
    ...(isDisabled
      ? []
      : [OnClick(toMessage(Toggled())), OnKeyUpPreventDefault(handleKeyUp)]),
  ]

  const labelElement = label(
    [
      Id(labelId(id)),
      ...(labelClassName ? [Class(labelClassName)] : []),
      ...(isDisabled ? [] : [OnClick(toMessage(Toggled()))]),
    ],
    [labelText],
  )

  const descriptionElement = description
    ? [p([Id(descriptionId(id))], [description])]
    : []

  const hiddenInput = name
    ? [
        input([
          Type('hidden'),
          Name(name),
          Value(isChecked ? formValue : ''),
        ]),
      ]
    : []

  const wrapperAttributes = [
    ...checkedAttributes,
    ...(isDisabled ? [DataAttribute('disabled', '')] : []),
    ...(className ? [Class(className)] : []),
  ]

  return div(wrapperAttributes, [
    button(buttonAttributes, []),
    labelElement,
    ...descriptionElement,
    ...hiddenInput,
  ])
}
```

**Step 2: Run tests to verify they pass**

Run: `pnpm --filter foldkit test -- --run src/ui/switch/index.test.ts`
Expected: PASS (3 tests)

**Step 3: Commit**

```
git add packages/foldkit/src/ui/switch/index.ts
git commit -m "feat(switch): add Model, Messages, init, update, and view"
```

---

### Task 3: Switch — Public Exports and Package Configuration

**Files:**
- Create: `packages/foldkit/src/ui/switch/public.ts`
- Modify: `packages/foldkit/src/ui/index.ts`
- Modify: `packages/foldkit/package.json`

**Step 1: Create public.ts**

```ts
export { init, update, view, Model, Message } from './index'

export type {
  Toggled,
  NoOp,
  InitConfig,
  ViewConfig,
} from './index'
```

**Step 2: Add Switch to ui/index.ts**

Add in alphabetical order after `Menu`:

```ts
export * as Switch from './switch/public'
```

**Step 3: Add export entry to package.json**

Add after the `./ui/menu` entry:

```json
"./ui/switch": {
  "types": "./dist/ui/switch/public.d.ts",
  "import": "./dist/ui/switch/public.js"
},
```

**Step 4: Verify library builds**

Run: `pnpm --filter foldkit build`
Expected: Build succeeds

**Step 5: Verify all tests pass**

Run: `pnpm --filter foldkit test`
Expected: All tests pass

**Step 6: Commit**

```
git add packages/foldkit/src/ui/switch/public.ts packages/foldkit/src/ui/index.ts packages/foldkit/package.json
git commit -m "feat(switch): add public exports and package configuration"
```

---

### Task 4: Switch — Website Demo

**Files:**
- Create: `packages/website/src/page/foldkitUi/switch.ts`
- Modify: `packages/website/src/page/foldkitUi/model.ts`
- Modify: `packages/website/src/page/foldkitUi/message.ts`
- Modify: `packages/website/src/page/foldkitUi/init.ts`
- Modify: `packages/website/src/page/foldkitUi/update.ts`
- Modify: `packages/website/src/page/foldkitUi/view.ts`

**Step 1: Create switch.ts demo**

```ts
import { Ui } from 'foldkit'

import { Class, div, span } from '../../html'
import type { TableOfContentsEntry } from '../../main'
import type { Message as ParentMessage } from '../../main'
import { GotSwitchDemoMessage, type Message } from './message'
import type { Model } from './model'

// TABLE OF CONTENTS

export const switchHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'switch',
  text: 'Switch',
}

// DEMO CONTENT

const wrapperClassName =
  'flex items-center gap-3'

const buttonClassName =
  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer bg-gray-300 dark:bg-gray-600 data-[checked]:bg-blue-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const knobClassName =
  'inline-block h-4 w-4 rounded-full bg-white transition-transform translate-x-1'

const knobCheckedClassName =
  'inline-block h-4 w-4 rounded-full bg-white transition-transform translate-x-6'

const labelClassName =
  'text-sm font-medium text-gray-900 dark:text-white cursor-pointer select-none'

// VIEW

export const switchDemo = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
) => [
  div([Class('mt-6 space-y-4')], [
    div([Class(wrapperClassName)], [
      Ui.Switch.view({
        model: model.switchDemo,
        toMessage: message =>
          toMessage(GotSwitchDemoMessage({ message })),
        label: 'Enable notifications',
        buttonClassName,
        labelClassName,
        className: wrapperClassName,
      }),
    ]),
  ]),
]
```

Note: The knob styling inside the button will need to be done via CSS targeting `[role="switch"]` and `[data-checked]` since the Switch view renders an empty button. The demo may need adjustment based on how the actual styled knob is achieved — the simplest approach is using CSS `::after` pseudo-element on the button for the toggle knob, styled with `data-[checked]` for position.

**Step 2: Update model.ts**

Add import:
```ts
import { Dialog, Disclosure, Listbox, Menu, Switch, Tabs } from 'foldkit/ui'
```

Add field in alphabetical position:
```ts
switchDemo: Switch.Model,
```

**Step 3: Update message.ts**

Add message constructor (in alphabetical position among the `m()` declarations):
```ts
export const GotSwitchDemoMessage = m('GotSwitchDemoMessage', {
  message: Ui.Switch.Message,
})
```

Add to `S.Union(...)`:
```ts
GotSwitchDemoMessage,
```

**Step 4: Update init.ts**

Add initialization:
```ts
switchDemo: Ui.Switch.init({ id: 'switch-demo' }),
```

**Step 5: Update update.ts**

Add import of `GotSwitchDemoMessage`.

Add handler in `M.tagsExhaustive`:
```ts
GotSwitchDemoMessage: ({ message }) => {
  const [nextSwitchDemo, switchCommands] = Ui.Switch.update(
    model.switchDemo,
    message,
  )

  return [
    evo(model, {
      switchDemo: () => nextSwitchDemo,
    }),
    switchCommands.map(
      Effect.map(message => GotSwitchDemoMessage({ message })),
    ),
  ]
},
```

**Step 6: Update view.ts**

Add import:
```ts
import * as Switch from './switch'
```

Add to `tableOfContents` array (before `...plannedComponents`):
```ts
Switch.switchHeader,
```

Add demo section in the main view before the planned components `div`, after the Listbox demos:
```ts
heading('h2', Switch.switchHeader.id, Switch.switchHeader.text),
para(
  'A toggle switch for on/off states with accessible labeling, keyboard support, and optional form integration via a hidden input.',
),
...Switch.switchDemo(model, toMessage),
```

Remove Switch from `plannedComponents` array (the entry with `id: 'switch'`).

**Step 7: Verify website builds**

Run: `pnpm build:website`
Expected: Build succeeds

**Step 8: Commit**

```
git add packages/website/src/page/foldkitUi/switch.ts packages/website/src/page/foldkitUi/model.ts packages/website/src/page/foldkitUi/message.ts packages/website/src/page/foldkitUi/init.ts packages/website/src/page/foldkitUi/update.ts packages/website/src/page/foldkitUi/view.ts
git commit -m "feat(website): add Switch component demo"
```

---

### Task 5: Switch — TODO Update and Final Verification

**Files:**
- Modify: `TODO.md`

**Step 1: Update remaining components list in TODO.md**

Change line 29:
```
  - [ ] Remaining components: Combobox, Switch, Radio Group, Checkbox, Input, Select, Textarea, Fieldset
```
To:
```
  - [ ] Remaining components: Combobox, Radio Group, Checkbox, Input, Select, Textarea, Fieldset
```

**Step 2: Run full library tests**

Run: `pnpm --filter foldkit test`
Expected: All tests pass

**Step 3: Run full website build**

Run: `pnpm build:website`
Expected: Build succeeds

**Step 4: Commit**

```
git add TODO.md
git commit -m "chore: remove Switch from remaining components list"
```
