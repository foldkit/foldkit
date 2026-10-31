// Before: a UI Block rendered through its Binding.
h.block(
  DialogBinding.embedView({
    model: model.dialog,
    viewInputs: {
      toView: ({ dialog, panel, title, closeButton, isVisible }) =>
        h.dialog(
          [...dialog],
          isVisible
            ? [
                h.div(
                  [...panel],
                  [
                    h.h2([...title], ['Delete this project?']),
                    h.button([...closeButton], ['Cancel']),
                  ],
                ),
              ]
            : [],
        ),
    },
  }),
)
