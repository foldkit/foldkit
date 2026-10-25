import { Array, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { Transition } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'

import { LoadCatalog, LoadPainting, SaveDraft } from './command'
import { ApplicationDefinition } from './definition'
import { type LoggedTransition, type Model, PaintingStatus } from './model'
import { type ApplicationRoute } from './route'

const MAX_LOGGED_TRANSITIONS = 20

export type AppTransition = Transition.Transition<typeof ApplicationRoute.Type>

const nextSequenceNumber = (
  transitionLog: ReadonlyArray<typeof LoggedTransition.Type>,
): number =>
  Option.match(Array.head(transitionLog), {
    onNone: () => 1,
    onSome: newestEntry => newestEntry.sequenceNumber + 1,
  })

const logTransition = (transition: AppTransition) =>
  ApplicationDefinition.makeFieldsStep(() => ({
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

const loadCatalogOnGalleryEntry = (transition: AppTransition) =>
  ApplicationDefinition.makeStep(model =>
    Transition.isEntering(transition, 'Gallery') &&
    model.catalogStatus !== 'Loading'
      ? {
          model: modifyFields(model, { catalogStatus: () => 'Loading' }),
          commands: [LoadCatalog()],
        }
      : { model },
  )

const keepModel = ApplicationDefinition.makeNoopStep()

const loadPainting = (paintingId: number) =>
  ApplicationDefinition.makeStep(model => ({
    model: modifyFields(model, {
      paintingStatus: () => PaintingStatus.Loading({ paintingId }),
    }),
    commands: [LoadPainting({ paintingId })],
  }))

type PaintingRouteStep = typeof keepModel | ReturnType<typeof loadPainting>

const reconcilePaintingRoute = (transition: AppTransition) =>
  Transition.matchOrElse<PaintingRouteStep>()(
    transition,
    'Painting',
    {
      Entered: ({ paintingId }) => loadPainting(paintingId),
      Stayed: ({ previousRoute, nextRoute }) =>
        previousRoute.paintingId === nextRoute.paintingId
          ? keepModel
          : loadPainting(nextRoute.paintingId),
    },
    () => keepModel,
  )

const saveDraftOnStudioExit = (transition: AppTransition) =>
  ApplicationDefinition.makeCommandsStep(model =>
    Array.filter(
      [SaveDraft({ draft: model.studioDraft })],
      () =>
        Transition.isExiting(transition, 'Studio') && model.studioDraft !== '',
    ),
  )

export const handleTransition = (
  model: typeof Model.Type,
  transition: AppTransition,
) =>
  Update.combineSteps(model, [
    logTransition(transition),
    loadCatalogOnGalleryEntry(transition),
    reconcilePaintingRoute(transition),
    saveDraftOnStudioExit(transition),
  ])
