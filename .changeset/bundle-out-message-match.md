---
'@foldkit/ui': minor
---

`create()` bundles for RadioGroup, Tabs, Menu, Listbox, and Combobox, including the multi-select variants, now expose `OutMessage.match` bound to the bundle's `Value`. A `Selected` handler receives that `Value`.

```ts
const foldThemeOutMessage = ThemeRadioGroup.OutMessage.match<
  Update.Step<Model, Message>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, { theme: () => value }),
    }),
})
```

`RadioGroup.OutMessage.match` still types `value` as `string`. Pass `RadioGroup.OutMessage<Theme>` as its second type argument when you match on that union directly.
