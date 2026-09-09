import type { Html, HtmlBuilder } from 'foldkit/html'

const artworkCardView = (artwork: Artwork, h: HtmlBuilder<Message>): Html =>
  h.a(
    [h.Href(artworkRouter({ artworkId: artwork.id }))],
    [
      h.div(
        [
          h.Class('aspect-square rounded-xl'),
          h.Style({ viewTransitionName: `artwork-${artwork.id}` }),
        ],
        [],
      ),
    ],
  )

// The hero keeps the card's aspect ratio. A transition interpolates the two
// snapshots while it interpolates the box, so a square growing into a wider
// box visibly stretches mid-flight.
const artworkHeroView = (artwork: Artwork, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Class('aspect-square w-full rounded-2xl'),
      h.Style({ viewTransitionName: `artwork-${artwork.id}` }),
    ],
    [],
  )
