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

export const ExampleDetailLive = ExampleDetail.toLayer(() => ({
  init: initModel,
  start: (_model, args) => initialCommands(args),

  update: {
    InformedOfRouteChange: (model, { slug }) => changeExampleRoute(model, slug),
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
    ...SourceFileTabs.on({
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
          error instanceof Error ? error.message : `Unknown example: ${slug}`,
      }).pipe(
        Effect.map(sources => Message.SucceededLoadExampleSources({ sources })),
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
})).pipe(Layer.provide(SourceFileTabs))

const sourceFileTabsFor = (slug: string) =>
  new SourceFileTabs(slug, { id: SOURCE_FILE_TABS_ID })

const maybeAvailableSlugOf = (maybeInitialSlug: Option.Option<string>) =>
  Option.filter(maybeInitialSlug, isSourceAvailable)

const initModel = ({
  maybeInitialSlug,
  maybeExampleSources,
}: ExampleDetailArgs): Model => {
  const maybeAvailableSlug = maybeAvailableSlugOf(maybeInitialSlug)

  const initialFields = {
    sourceFileTabs: sourceFileTabsFor(
      Option.getOrElse(maybeAvailableSlug, () => NO_EXAMPLE_KEY),
    ),
    maybeActiveSourceFilePath: Option.none(),
    maybeExampleUrl: Option.none(),
    isLivePreviewOpen: true,
    currentSources: CurrentSourcesAsyncData.Idle(),
  }

  return Option.match(maybeAvailableSlug, {
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
}

const initialCommands = ({
  maybeInitialSlug,
  maybeExampleSources,
}: ExampleDetailArgs) =>
  pipe(
    maybeAvailableSlugOf(maybeInitialSlug),
    Option.filter(() => Option.isNone(maybeExampleSources)),
    Option.map(slug => LoadExampleSources({ slug })),
    Option.toArray,
  )

const changeExampleRoute = (model: Model, slug: string) => {
  const resetModel = modifyFields(model, {
    sourceFileTabs: () => sourceFileTabsFor(slug),
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
