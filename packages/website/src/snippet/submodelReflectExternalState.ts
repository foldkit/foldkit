ChangedUrl: ({ route }) => [
  evo(model, {
    // The URL owns the filter, so reflect it onto the Listbox. reflectSelectedItem
    // returns Model (point-free in evo) and emits nothing, so it can't echo the
    // route back and loop.
    colorFilter: ColorListbox.reflectSelectedItem(route.maybeColor),
  }),
  [],
]
