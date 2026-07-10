---
'@foldkit/ui': minor
---

Breaking: Tabs no longer stores the active tab. The parent Model owns the selected value, passes it in per render via `ViewInputs.selectedValue`, and folds the `Selected` OutMessage back into its own state. The component keeps only private interaction state (the roving keyboard-focus cursor and the activation mode), so there is no second copy of the selection to drift from parent truth. `InitConfig` drops `activeIndex`, and `selectTab` and `reflectSelectedTab` are removed; to change the active tab, update the parent-owned field directly. Part of #676.

### Migration

Add a field for the active tab to your Model and seed it in init:

```ts
// Before
const Model = S.Struct({
  tabs: Tabs.Model,
})

const init = () => ({
  tabs: Tabs.init({ id: 'framework-tabs', activeIndex: 0 }),
})
```

```ts
// After
const Model = S.Struct({
  tabs: Tabs.Model,
  activeFramework: Framework,
})

const init = () => ({
  tabs: Tabs.init({ id: 'framework-tabs' }),
  activeFramework: 'Foldkit',
})
```

In update, fold the `Selected` OutMessage into the parent-owned field:

```ts
GotTabsMessage: ({ message }) => {
  const [nextTabs, tabsCommands, maybeOutMessage] = FrameworkTabs.update(
    model.tabs,
    message,
  )

  const nextActiveFramework = Option.match(maybeOutMessage, {
    onNone: () => model.activeFramework,
    onSome: M.type<Tabs.OutMessage<Framework>>().pipe(
      M.tagsExhaustive({
        Selected: ({ value }) => value,
      }),
    ),
  })

  return [
    evo(model, {
      tabs: () => nextTabs,
      activeFramework: () => nextActiveFramework,
    }),
    Command.mapMessages(tabsCommands, message => GotTabsMessage({ message })),
  ]
}
```

In view, pass the parent-owned value back in:

```ts
h.submodel({
  slotId: model.tabs.id,
  model: model.tabs,
  view: FrameworkTabs.view,
  viewInputs: {
    tabs: frameworks,
    selectedValue: model.activeFramework,
    ariaLabel: 'Framework comparison',
    toView,
  },
  toParentMessage: message => GotTabsMessage({ message }),
})
```
