import type { HtmlBuilder } from 'foldkit/html'

// Every view receives `h`, the typed Html builder, as its last argument.
// Reach for `h.` to access elements, attributes, and event handlers.
// Every callback is typed against your Message union, so `h.OnClick(...)`
// only accepts your variants.
const greeting = (name: string, h: HtmlBuilder<Message>) =>
  h.div(
    [h.Class('flex flex-col gap-2')],
    [
      h.h1([h.Class('text-2xl font-bold')], [`Hello, ${name}`]),
      h.button([h.OnClick(ClickedRefresh())], ['Refresh']),
    ],
  )
