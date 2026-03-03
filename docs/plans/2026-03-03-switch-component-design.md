# Switch Component Design

An accessible toggle control (`role="switch"`) for Foldkit UI. Simplest UI component — on/off state with keyboard support and form integration.

## Model

```ts
Model = S.Struct({
  id: S.String,
  isChecked: S.Boolean,
})
```

## Messages

- `Toggled` — user toggled the switch (click or Space)
- `NoOp` — placeholder

## Init

```ts
InitConfig = { id: string, isChecked?: boolean }
```

## Update

- `Toggled` → flip `isChecked`, no commands
- `NoOp` → passthrough

## View

```ts
ViewConfig<Message> = {
  model: Model
  toMessage: (message: Toggled | NoOp) => Message
  label: string
  description?: string
  isDisabled?: boolean
  name?: string
  value?: string          // hidden input value, default "on"
  className?: string
  buttonClassName?: string
  labelClassName?: string
}
```

### Rendered structure

```html
<div data-checked data-disabled>
  <button
    role="switch"
    aria-checked="true|false"
    aria-labelledby="{id}-label"
    aria-describedby="{id}-description"  <!-- when description provided -->
    tabindex="0"
    data-checked
    data-disabled
  />
  <label id="{id}-label" onclick="toggle">...</label>
  <p id="{id}-description">...</p>       <!-- when description provided -->
  <input type="hidden" name value />      <!-- when name provided -->
</div>
```

### ARIA attributes

- `role="switch"` on the button
- `aria-checked` reflecting `isChecked`
- `aria-labelledby` pointing to the label element
- `aria-describedby` pointing to the description element (when provided)
- `aria-disabled` when disabled

### Keyboard interactions

- **Space** — toggle the switch
- **Enter** — no action (browser default: submit parent form)
- **Tab** — standard focus navigation

### Data attributes

- `data-checked` — on wrapper and button when checked
- `data-disabled` — on wrapper and button when disabled

### Form integration

When `name` is provided, render a hidden `<input>` with:
- `type="hidden"`
- `name` from config
- `value` from config (default `"on"`) when checked, empty string when unchecked

## Not applicable to Foldkit

These HeadlessUI features are React-specific:

- **`as` prop** — Foldkit uses ViewConfig callback pattern
- **Render props** — Foldkit exposes state via model
- **`defaultChecked` / controlled vs uncontrolled** — Foldkit's Elm Architecture is always controlled
- **`SwitchGroup`** — label is built into the component
- **`data-focus`, `data-hover`, `data-active`** — CSS `:focus`, `:hover`, `:active` pseudo-classes (consistent with Menu and Listbox parity decisions)
- **`data-changing`** — transient animation state, not needed without transitions
