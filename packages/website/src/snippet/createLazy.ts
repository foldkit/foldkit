import { createLazy, html } from 'foldkit/html'

const { div, h2, p, ul, li } = html<Message>()

// Define the view function at module level for a stable reference.
// If defined inside the view, a new function is created each render,
// defeating the cache.
const statsView = (
  revenue: number,
  orderCount: number,
  topProducts: ReadonlyArray<string>,
) =>
  div(
    [],
    [
      h2([], ['Dashboard']),
      p([], [`Revenue: $${revenue}`]),
      p([], [`Orders: ${orderCount}`]),
      ul(
        [],
        topProducts.map(name => li([], [name])),
      ),
    ],
  )

// Create the lazy slot at module level — one slot per view
const lazyStats = createLazy()

// In your view, wrap the call with the lazy slot.
// If revenue, orderCount, and topProducts are the same references
// as last render, the cached VNode is returned instantly —
// both VNode construction and subtree diffing are skipped.
const view = (model: Model) =>
  div(
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
  )
