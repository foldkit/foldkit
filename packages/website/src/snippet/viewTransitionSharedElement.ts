const artworkCardView = (artwork: Artwork): Html => {
  const h = html<Message>()

  return h.a(
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
}

const artworkHeroView = (artwork: Artwork): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class('aspect-video w-full rounded-2xl'),
      h.Style({ viewTransitionName: `artwork-${artwork.id}` }),
    ],
    [],
  )
}
