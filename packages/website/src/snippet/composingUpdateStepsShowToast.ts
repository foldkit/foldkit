export const showToast: {
  (variant: UiToast.Variant, message: string): (model: Model) => UpdateReturn
  (model: Model, variant: UiToast.Variant, message: string): UpdateReturn
} = dual(
  3,
  (model: Model, variant: UiToast.Variant, message: string): UpdateReturn => {
    const [nextToast, toastCommands] = Toast.show(model.toast, {
      variant,
      payload: { message },
    })

    return [
      evo(model, { toast: () => nextToast }),
      Command.mapMessages(toastCommands, message =>
        GotToastMessage({ message }),
      ),
    ]
  },
)
