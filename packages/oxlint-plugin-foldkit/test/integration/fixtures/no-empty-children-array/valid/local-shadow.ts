const h = {
  div: (
    attributes: ReadonlyArray<unknown>,
    children: ReadonlyArray<unknown>,
  ): ReadonlyArray<unknown> => [...attributes, ...children],
}

export const divider = h.div([], [])
