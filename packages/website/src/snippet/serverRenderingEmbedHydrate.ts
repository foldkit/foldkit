// Server: render each embedded program into its own root. The runtimeId is
// the id of the container the client passes to makeElement.
const rendered =
  yield *
  renderToString(panelServerConfig, {
    flags: { panelId: 'cart-panel' },
    runtimeId: 'cart-panel',
    isEmbedded: true,
  })

// Client: embed adopts the stamped container instead of rebuilding it.
const handle = Runtime.embed(
  makeElement({
    Model,
    Flags,
    flags: Effect.succeed({ panelId: 'cart-panel' }),
    init,
    update,
    view,
    container: document.getElementById('cart-panel'),
  }),
  {
    isHydratable: true,
    flags: Effect.succeed({ panelId: 'cart-panel' }),
  },
)
