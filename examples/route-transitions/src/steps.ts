import { Array, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { Transition } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'

import { LoadCatalog, LoadPainting, SaveDraft } from './command'
import {
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
  makeStep,
} from './definition'
import { type LoggedTransition, PaintingStatus } from './model'
import { type ApplicationRoute } from './route'

const MAX_LOGGED_TRANSITIONS = 20

export type AppTransition = Transition.Transition<ApplicationRoute>

const nextSequenceNumber = (
  transitionLog: ReadonlyArray<LoggedTransition>,
): number =>
  Option.match(Array.head(transitionLog), {
    onNone: () => 1,
    onSome: newestEntry => newestEntry.sequenceNumber + 1,
  })

const logTransitionStep = (transition: AppTransition) =>
  makeFieldsStep(() => ({
    transitionLog: transitionLog =>
      pipe(
        transitionLog,
        Array.prepend({
          sequenceNumber: nextSequenceNumber(transitionLog),
          maybePreviousRoute: transition.maybePreviousRoute,
          nextRoute: transition.nextRoute,
        }),
        Array.take(MAX_LOGGED_TRANSITIONS),
      ),
  }))

const loadCatalogOnGalleryEntryStep = (transition: AppTransition) =>
  makeStep(model =>
    Transition.isEntering(transition, 'Gallery') &&
    model.catalogStatus !== 'Loading'
      ? {
          model: modifyFields(model, { catalogStatus: () => 'Loading' }),
          commands: [LoadCatalog()],
        }
      : { model },
  )

const keepModelStep = makeNoopStep()

const loadPaintingStep = (paintingId: number) =>
  makeStep(model => ({
    model: modifyFields(model, {
      paintingStatus: () => PaintingStatus.Loading({ paintingId }),
    }),
    commands: [LoadPainting({ paintingId })],
  }))

type PaintingRouteStep =
  | typeof keepModelStep
  | ReturnType<typeof loadPaintingStep>

const reconcilePaintingRouteStep = (transition: AppTransition) =>
  Transition.matchOrElse<PaintingRouteStep>()(
    transition,
    'Painting',
    {
      Entered: ({ paintingId }) => loadPaintingStep(paintingId),
      Stayed: ({ previousRoute, nextRoute }) =>
        previousRoute.paintingId === nextRoute.paintingId
          ? keepModelStep
          : loadPaintingStep(nextRoute.paintingId),
    },
    () => keepModelStep,
  )

const saveDraftOnStudioExitStep = (transition: AppTransition) =>
  makeCommandsStep(model =>
    Array.filter(
      [SaveDraft({ draft: model.studioDraft })],
      () =>
        Transition.isExiting(transition, 'Studio') && model.studioDraft !== '',
    ),
  )

export const handleTransitionStep = (transition: AppTransition) =>
  Update.combineSteps([
    logTransitionStep(transition),
    loadCatalogOnGalleryEntryStep(transition),
    reconcilePaintingRouteStep(transition),
    saveDraftOnStudioExitStep(transition),
  ])
