import { Effect, Match as M, Option } from 'effect'
import { Html } from 'foldkit/html'
import filesBySlug from 'virtual:playground-files'

import {
  AriaLabel,
  Class,
  Href,
  Id,
  OnInsertEffect,
  a,
  div,
  keyed,
  main,
} from '../html'
import { Icon } from '../icon'
import { FailedPlaygroundEmbed, SucceededPlaygroundEmbed } from '../message'
import { exampleDetailRouter, examplesRouter } from '../route'
import { type ExampleMeta, findBySlug } from './example/meta'

const backToExampleButton = (maybeMeta: Option.Option<ExampleMeta>): Html =>
  Option.match(maybeMeta, {
    onNone: () =>
      a(
        [Href(examplesRouter()), Class('cta-secondary')],
        [Icon.chevronLeft('w-4 h-4'), 'All Examples'],
      ),
    onSome: meta =>
      a(
        [
          Href(exampleDetailRouter({ exampleSlug: meta.slug })),
          Class('cta-secondary'),
        ],
        [Icon.chevronLeft('w-4 h-4'), `Back to ${meta.title}`],
      ),
  })

const messageView = (
  heading: string,
  body: string,
  maybeMeta: Option.Option<ExampleMeta>,
): Html =>
  div(
    [Class('flex-1 flex items-center justify-center px-6 py-20 text-center')],
    [
      div(
        [Class('max-w-md flex flex-col items-center')],
        [
          div(
            [
              Class(
                'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2',
              ),
            ],
            [heading],
          ),
          div([Class('text-sm text-gray-600 dark:text-gray-400 mb-6')], [body]),
          backToExampleButton(maybeMeta),
        ],
      ),
    ],
  )

// NOTE: We don't wire OnDestroy here. The StackBlitz SDK maintains an internal
// `connections` array that isn't exposed for cleanup — once an embed succeeds,
// its Connection object lives for the page's lifetime. Snabbdom already removes
// the iframe from the DOM on unmount; there is no additional cleanup hook the
// SDK accepts. The resulting per-visit leak is a few KB of JS state — negligible
// for a docs site, tracked as a follow-up to request a public teardown method.
const embedView = (meta: ExampleMeta, files: Record<string, string>): Html => {
  const embedPlayground = (element: Element) => {
    if (!(element instanceof HTMLElement)) {
      return Effect.succeed(
        FailedPlaygroundEmbed({
          reason: 'Playground requires an HTMLElement host.',
        }),
      )
    }
    return Effect.tryPromise(() =>
      import('@stackblitz/sdk').then(({ default: sdk }) =>
        sdk.embedProject(
          element,
          {
            title: meta.title,
            description: meta.description,
            template: 'node',
            files,
          },
          {
            height: '100%',
            hideNavigation: true,
            openFile: 'src/main.ts',
            view: 'default',
          },
        ),
      ),
    ).pipe(
      Effect.as(SucceededPlaygroundEmbed()),
      Effect.catchAll(error =>
        Effect.succeed(
          FailedPlaygroundEmbed({
            reason: error instanceof Error ? error.message : String(error),
          }),
        ),
      ),
    )
  }

  return div(
    [Class('flex-1 min-h-0')],
    [div([OnInsertEffect(embedPlayground)], [])],
  )
}

export const view = (
  slug: string,
  isChromium: boolean,
  playgroundError: Option.Option<string>,
): Html => {
  const maybeMeta = findBySlug(slug)
  const maybeFiles = Option.fromNullable(filesBySlug[slug])

  const content = M.value({
    isChromium,
    maybeMeta,
    maybeFiles,
    playgroundError,
  }).pipe(
    M.withReturnType<Html>(),
    M.when(
      ({ isChromium }) => !isChromium,
      () =>
        messageView(
          'Playground requires a Chromium browser',
          'The editable playground runs on WebContainers, which requires Chrome, Edge, Brave, or another Chromium-based browser. You can still see the example running on its detail page.',
          maybeMeta,
        ),
    ),
    M.when(
      ({ playgroundError }) => Option.isSome(playgroundError),
      ({ playgroundError }) =>
        messageView(
          'Playground failed to load',
          Option.getOrElse(playgroundError, () => 'An unknown error occurred.'),
          maybeMeta,
        ),
    ),
    M.orElse(() =>
      Option.match(Option.all([maybeMeta, maybeFiles]), {
        onNone: () =>
          messageView(
            'Playground coming soon',
            'This example is not yet available in the embedded playground. Open it on the example page to see it running.',
            maybeMeta,
          ),
        onSome: ([meta, { files }]) => embedView(meta, files),
      }),
    ),
  )

  return keyed('div')(
    `playground-${slug}`,
    [Class('flex flex-col h-screen')],
    [
      main(
        [
          Id('main-content'),
          Class('flex-1 flex flex-col min-h-0'),
          AriaLabel('Playground'),
        ],
        [content],
      ),
    ],
  )
}
