import { UrlRequest } from 'foldkit/navigation'
import { toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal } from './command'
import { ApplicationComposition } from './composition'
import { makeFieldsStep, makeNoopStep } from './definition'
import * as Route from './route'

export const update = ApplicationComposition.makeUpdate({
  ClickedLink: (model, { request }) =>
    UrlRequest.match(request, {
      Internal: ({ url }) => ({
        model,
        commands: [NavigateInternal({ url: urlToString(url) })],
      }),
      External: ({ href }) => ({
        model,
        commands: [LoadExternal({ href })],
      }),
    }),
  ChangedUrl: makeFieldsStep.fromMessage(({ url }) => {
    const nextRoute = Route.urlToApplicationRoute(url)
    return { route: () => nextRoute }
  }),
  CompletedNavigateInternal: makeNoopStep(),
  CompletedLoadExternal: makeNoopStep(),
})
