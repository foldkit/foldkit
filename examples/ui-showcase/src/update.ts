import { Update } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { Url, toString as urlToString } from 'foldkit/url'

import { makeFieldsStep, makeNoopStep } from './block'
import { LoadExternal, NavigateInternal } from './command'
import { ApplicationComposition, UiModelBinding } from './composition'
import { urlToApplicationRoute } from './route'

const setRoute = (url: Url) =>
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
      setRoute(url),
      UiModelBinding.requestCloseMobileMenu(),
    ]),

  ClickedOpenMobileMenu: UiModelBinding.requestOpenMobileMenu(),
})
