const dialogOpen = openDialog(model)

return {
  model: evo(dialogOpen.model, { isSubmitting: () => false }),
  // Type error: with exactOptionalPropertyTypes, this property must be
  // omitted when dialogOpen.commands is undefined.
  commands: dialogOpen.commands,
}
