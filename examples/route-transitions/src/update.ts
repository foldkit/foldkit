import { Option } from 'effect'
import { Update } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { Transition } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal } from './command'
import { ApplicationComposition } from './composition'
import { makeFieldsStep, makeNoopStep } from './definition'
import { PaintingStatus } from './model'
import { urlToApplicationRoute } from './route'
import { handleTransitionStep } from './steps'

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

  ChangedUrl: (model, { url }) => {
    const nextRoute = urlToApplicationRoute(url)
    const transition = Transition.make(model.route, nextRoute)
    return Update.combineSteps(model, [
      makeFieldsStep(() => ({ route: () => nextRoute })),
      handleTransitionStep(transition),
    ])
  },

  CompletedLoadCatalog: makeFieldsStep(() => ({
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

  UpdatedStudioDraft: makeFieldsStep.fromMessage(({ value }) => ({
    studioDraft: () => value,
  })),

  CompletedSaveDraft: makeFieldsStep.fromMessage(({ draft }) => ({
    maybeSavedDraft: () => Option.some(draft),
  })),
})
