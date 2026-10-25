import { Update } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { Url, toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal } from './command'
import { ApplicationComposition, UiBinding } from './composition'
import { ApplicationDefinition } from './definition'
import { urlToApplicationRoute } from './route'

const stepRoute = (url: Url) =>
  ApplicationDefinition.makeFieldsStep(() => ({
    route: () => urlToApplicationRoute(url),
  }))

export const update = ApplicationComposition.makeUpdate({
  CompletedNavigateInternal: ApplicationDefinition.makeNoopStep(),
  CompletedLoadExternal: ApplicationDefinition.makeNoopStep(),

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
      stepRoute(url),
      UiBinding.requestCloseMobileMenu(),
    ]),

  ClickedOpenMobileMenu: UiBinding.requestOpenMobileMenu(),
})
