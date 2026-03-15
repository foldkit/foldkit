import { html } from 'foldkit/html'
import * as M from 'foldkit/match'

const { div, keyed } = html<Message>()

const view = (model: Model): Html =>
  M.value(model.route).pipe(
    M.tagsExhaustive({
      Landing: () => keyed('div')('landing', [], [heroView(), featuresView()]),
      Docs: () =>
        keyed('div')('docs', [], [sidebarView(), docsContentView(model)]),
      Dashboard: () =>
        keyed('div')('dashboard', [], [dashboardNavView(), panelsView(model)]),
    }),
  )
