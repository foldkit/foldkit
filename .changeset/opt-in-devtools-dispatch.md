---
'foldkit': minor
'@foldkit/devtools': patch
'@foldkit/devtools-mcp': patch
'create-foldkit-app': patch
---

Make external DevTools Message dispatch an explicit Program option. Replace the root Message Schema passed by hand:

```ts
// Before
Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container,
  devTools: { Message },
})

// After
Program.make(Application, {
  layer: ApplicationLive,
  container,
  devTools: { dispatch: true },
})
```

The Program derives the dispatch Schema from the root Block. A Message for a child Block instance is addressed as `{ _tag: 'BlockMessage', path, message }`. Omitting `devTools`, passing an empty object, or leaving `dispatch` false keeps development inspection enabled while Message Schema discovery and external dispatch stay disabled. `devTools: false` disables DevTools entirely. MCP dispatch is limited to payloads the bridge can represent as JSON.

New projects opt into external dispatch in their generated browser entry.
