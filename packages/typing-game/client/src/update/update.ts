import { Url } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'

import { LoadExternal, NavigateInternal } from '../command'
import { ApplicationComposition } from '../composition'
import { ApplicationDefinition } from '../definition'
import { changeRoute } from './changeRoute'

export const update = ApplicationComposition.makeUpdate({
  ClickedLink: (model, { request }) =>
    UrlRequest.match(request, {
      Internal: ({ url }) => ({
        model,
        commands: [NavigateInternal({ url: Url.toString(url) })],
      }),
      External: ({ href }) => ({
        model,
        commands: [LoadExternal({ href })],
      }),
    }),
  ChangedUrl: (model, { url }) => changeRoute(model, url),
  CompletedNavigateInternal: ApplicationDefinition.makeNoopStep(),
  CompletedLoadExternal: ApplicationDefinition.makeNoopStep(),
  CompletedNavigateToRoom: ApplicationDefinition.makeNoopStep(),
})
