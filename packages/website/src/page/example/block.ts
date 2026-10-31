import { Effect, Layer, Option, pipe } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import {
  LoadExampleSources,
  SOURCE_FILE_TABS_ID,
  type ViewInputs,
  isSourceAvailable,
  maybeFirstSourceFilePath,
  view,
} from './example'
import { SourceFileTabs } from './fileTabs'
import { Message } from './message'
import { CurrentSourcesAsyncData, Model } from './model'
import { ObserveExampleUrlMessages, observeExampleUrlMessages } from './mount'
import { type ExampleSources, loadSourcesForSlug } from './sources'

const NO_EXAMPLE_KEY = 'none'

type ExampleDetailArgs = Readonly<{
  maybeInitialSlug: Option.Option<string>
  maybeExampleSources: Option.Option<ExampleSources>
}>

export class ExampleDetail extends Block<
  ExampleDetail,
  ExampleDetailArgs,
  ViewInputs
>()('ExampleDetail', {
  Model,
  Message,
  Command: [LoadExampleSources],
  Mount: [ObserveExampleUrlMessages],
}) {}

export const ExampleDetailLive = ExampleDetail.make(
  Effect.fn(function* (_id, { maybeInitialSlug, maybeExampleSources }) {
    const sourceFileTab = yield* SourceFileTabs.each('sourceFileTabs', {
      id: SOURCE_FILE_TABS_ID,
    })

    const maybeAvailableSlug = Option.filter(
      maybeInitialSlug,
      isSourceAvailable,
    )

    const initialFields = {
      sourceFileTabs: sourceFileTab(
        Option.getOrElse(maybeAvailableSlug, () => NO_EXAMPLE_KEY),
      ),
      maybeActiveSourceFilePath: Option.none(),
      maybeExampleUrl: Option.none(),
      isLivePreviewOpen: true,
      currentSources: CurrentSourcesAsyncData.Idle(),
    }

    const initialModel = Option.match(maybeAvailableSlug, {
      onNone: () => initialFields,
      onSome: () =>
        Option.match(maybeExampleSources, {
          onNone: () => ({
            ...initialFields,
            currentSources: CurrentSourcesAsyncData.Loading(),
          }),
          onSome: sources => ({
            ...initialFields,
            maybeActiveSourceFilePath: maybeFirstSourceFilePath(sources),
            currentSources: CurrentSourcesAsyncData.Success({ data: sources }),
          }),
        }),
    })

    const initialCommands = pipe(
      maybeAvailableSlug,
      Option.filter(() => Option.isNone(maybeExampleSources)),
      Option.map(slug => LoadExampleSources({ slug })),
      Option.toArray,
    )

    const changeExampleRoute = (model: Model, slug: string) => {
      const resetModel = modifyFields(model, {
        sourceFileTabs: () => sourceFileTab(slug),
        maybeActiveSourceFilePath: () => Option.none(),
        maybeExampleUrl: () => Option.none(),
      })

      if (isSourceAvailable(slug)) {
        return {
          model: modifyFields(resetModel, {
            currentSources: () => CurrentSourcesAsyncData.Loading(),
          }),
          commands: [LoadExampleSources({ slug })],
        }
      } else {
        return {
          model: modifyFields(resetModel, {
            currentSources: () => CurrentSourcesAsyncData.Idle(),
          }),
        }
      }
    }

    return {
      model: initialModel,
      start: initialCommands,

      update: {
        InformedOfRouteChange: (model, { slug }) =>
          changeExampleRoute(model, slug),
        ChangedExampleUrl: (model, { url }) => ({
          model: modifyFields(model, {
            maybeExampleUrl: () => Option.some(url),
          }),
        }),
        ToggledLivePreview: (model, { isOpen }) => ({
          model: modifyFields(model, { isLivePreviewOpen: () => isOpen }),
        }),
        SucceededLoadExampleSources: (model, { sources }) => ({
          model: modifyFields(model, {
            maybeActiveSourceFilePath: () => maybeFirstSourceFilePath(sources),
            currentSources: () =>
              CurrentSourcesAsyncData.Success({ data: sources }),
          }),
        }),
        FailedLoadExampleSources: (model, { error }) => ({
          model: modifyFields(model, {
            currentSources: () => CurrentSourcesAsyncData.Failure({ error }),
          }),
        }),
        ...sourceFileTab.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeActiveSourceFilePath: () => Option.some(value),
            }),
          }),
        }),
      },

      commands: {
        LoadExampleSources: ({ slug }) =>
          Effect.tryPromise({
            try: () => loadSourcesForSlug(slug),
            catch: error =>
              error instanceof Error
                ? error.message
                : `Unknown example: ${slug}`,
          }).pipe(
            Effect.map(sources =>
              Message.SucceededLoadExampleSources({ sources }),
            ),
            Effect.catch(error =>
              Effect.succeed(Message.FailedLoadExampleSources({ error })),
            ),
          ),
      },

      mounts: {
        ObserveExampleUrlMessages: ({ element }) =>
          observeExampleUrlMessages(element),
      },

      view,
    }
  }),
).pipe(Layer.provide(SourceFileTabs.Live))
