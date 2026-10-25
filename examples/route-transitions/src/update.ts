import { Option } from 'effect'
import { UrlRequest } from 'foldkit/navigation'
import { Transition } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal } from './command'
import { ApplicationComposition } from './composition'
import { ApplicationDefinition } from './definition'
import { PaintingStatus } from './model'
import { urlToApplicationRoute } from './route'
import { handleTransition } from './transition'

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

  ChangedUrl: (model, { url }) => {
    const nextRoute = urlToApplicationRoute(url)
    const transition = Transition.make(model.route, nextRoute)
    return handleTransition(
      modifyFields(model, { route: () => nextRoute }),
      transition,
    )
  },

  CompletedLoadCatalog: ApplicationDefinition.makeFieldsStep(() => ({
    catalogStatus: () => 'Ready',
  })),

  CompletedLoadPainting: (model, { paintingId }) =>
    model.paintingStatus._tag === 'Loading' &&
    model.paintingStatus.paintingId === paintingId
      ? {
          model: modifyFields(model, {
            paintingStatus: () => PaintingStatus.Ready({ paintingId }),
          }),
        }
      : { model },

  UpdatedStudioDraft: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ studioDraft: () => value }),
  ),

  CompletedSaveDraft: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ draft }) => ({
      maybeSavedDraft: () => Option.some(draft),
    }),
  ),
})
