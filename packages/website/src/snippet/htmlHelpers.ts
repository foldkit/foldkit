import { html } from 'foldkit/html'

// Bind the html factory to your Message type once at the top of each view
// function. Reach for `h.` to access elements, attributes, and event handlers.
// Every callback is typed against your Message union, so `h.OnClick(...)` only
// accepts your variants.
const greeting = (name: string) => {
  const h = html<Message>()

  return h.div(
    [h.Class('flex flex-col gap-2')],
    [
      h.h1([h.Class('text-2xl font-bold')], [`Hello, ${name}`]),
      h.button([h.OnClick(ClickedRefresh())], ['Refresh']),
    ],
  )
}
