import { Update } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { Url, toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal } from './command'
import { ApplicationComposition, UiBinding } from './composition'
import { makeFieldsStep, makeNoopStep } from './definition'
import { urlToApplicationRoute } from './route'

const setRouteStep = (url: Url) =>
  makeFieldsStep(() => ({
    route: () => urlToApplicationRoute(url),
  }))

export const update = ApplicationComposition.makeUpdate({
  CompletedNavigateInternal: makeNoopStep(),
  CompletedLoadExternal: makeNoopStep(),

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

  ChangedUrl: (model, { url }) =>
    Update.combineSteps(model, [
      setRouteStep(url),
      UiBinding.requestCloseMobileMenu(),
    ]),

  ClickedOpenMobileMenu: UiBinding.requestOpenMobileMenu(),
})
