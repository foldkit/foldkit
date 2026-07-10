// src/main.ts

export const init: Runtime.ApplicationInit<Model, Message, Flags> = flags => [
  {
    grid: Option.match(flags.maybeSavedCanvas, {
      onNone: () => createEmptyGrid(DEFAULT_GRID_SIZE),
      onSome: ({ grid }) => grid,
    }),
    undoStack: [],
    redoStack: [],
    tool: 'Brush',
    mirrorMode: 'None',
    isDrawing: false,
    maybeHoveredCell: Option.none(),
    errorDialog: Dialog.init({ id: 'export-error-dialog' }),
    themeListbox: Listbox.init({ id: 'theme-picker' }),
    // remaining fields elided for brevity
  },
  [],
]

// src/entry.ts (imports Model, Flags, flags, init, update, view, subscriptions from ./main)

const application = Runtime.makeApplication({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
})

Runtime.run(application)
