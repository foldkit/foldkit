import { Url } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'

import { LoadExternal, NavigateInternal } from '../command'
import { ApplicationComposition } from '../composition'
import { Message } from '../message'
import { changeRoute } from './changeRoute'

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedLink: ({ request }) =>
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
    ChangedUrl: ({ url }) => changeRoute(model, url),
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
    CompletedNavigateToRoom: () => ({ model }),
  }),
)
