import { Option } from 'effect'
import { UrlRequest } from 'foldkit/navigation'
import { Transition } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal } from './command'
import { ApplicationComposition } from './composition'
import { Message } from './message'
import { PaintingStatus } from './model'
import { urlToApplicationRoute } from './route'
import { handleTransition } from './transition'

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),

    ClickedLink: ({ request }) =>
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

    ChangedUrl: ({ url }) => {
      const nextRoute = urlToApplicationRoute(url)
      const transition = Transition.make(model.route, nextRoute)
      return handleTransition(
        modifyFields(model, { route: () => nextRoute }),
        transition,
      )
    },

    CompletedLoadCatalog: () => ({
      model: modifyFields(model, { catalogStatus: () => 'Ready' }),
    }),

    CompletedLoadPainting: ({ paintingId }) =>
      model.paintingStatus._tag === 'Loading' &&
      model.paintingStatus.paintingId === paintingId
        ? {
            model: modifyFields(model, {
              paintingStatus: () => PaintingStatus.Ready({ paintingId }),
            }),
          }
        : { model },

    UpdatedStudioDraft: ({ value }) => ({
      model: modifyFields(model, { studioDraft: () => value }),
    }),

    CompletedSaveDraft: ({ draft }) => ({
      model: modifyFields(model, {
        maybeSavedDraft: () => Option.some(draft),
      }),
    }),
  }),
)
