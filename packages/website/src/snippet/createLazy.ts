import { createLazy, html } from 'foldkit/html'

// Define the view function at module level for a stable reference.
// If defined inside the view, a new function is created each render,
// defeating the cache.
const statsView = (
  revenue: number,
  orderCount: number,
  topProducts: ReadonlyArray<string>,
) => {
  const h = html<Message>()

  return h.div(
    [],
    [
      h.h2([], ['Dashboard']),
      h.p([], [`Revenue: $${revenue}`]),
      h.p([], [`Orders: ${orderCount}`]),
      h.ul(
        [],
        topProducts.map(name => h.li([], [name])),
      ),
    ],
  )
}

// Create the lazy slot at module level. One slot per view.
const lazyStats = createLazy()

// In your view, wrap the call with the lazy slot.
// If revenue, orderCount, and topProducts are the same references
// as last render, the cached VNode is returned instantly.
// both VNode construction and subtree diffing are skipped.
const view = (model: Model) => {
  const h = html<Message>()

  return {
    title: 'Dashboard',
    body: h.div(
      [],
      [
        headerView(model),
        lazyStats(statsView, [
          model.revenue,
          model.orderCount,
          model.topProducts,
        ]),
        sidebarView(model),
      ],
    ),
  }
}
