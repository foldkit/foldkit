---
'@foldkit/ui': minor
'@foldkit/devtools': patch
---

Gate `aria-describedby` on an explicit opt-in in Dialog, Input, Textarea, Select, Fieldset, Checkbox, Switch, and RadioGroup. These components previously emitted a reference on every render even when no description was rendered. Pass `hasDescription: true` when a component renders its description element; for RadioGroup, use `hasOptionDescription` to identify the described options.
