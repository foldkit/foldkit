const init: Runtime.ProgramInit<Model, Message, Flags> = flags => [
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
    toolRadioGroup: Ui.RadioGroup.init({
      id: 'tool-picker',
      selectedValue: 'Brush',
    }),
    errorDialog: Ui.Dialog.init({ id: 'export-error-dialog' }),
    themeListbox: Ui.Listbox.init({ id: 'theme-picker', selectedItem: '0' }),
    // ... all 20 fields initialized declaratively
  },
  [],
]

const program = Runtime.makeProgram({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root')!,
})

Runtime.run(program)
