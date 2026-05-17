import { Effect, Match as M, Option, Schema as S } from 'effect'
import { Mount } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import filesBySlug from 'virtual:playground-files'

import { Icon } from '../icon'
import type { Message } from '../message'
import { exampleDetailRouter, examplesRouter } from '../route'
import { type ExampleMeta, findBySlug } from './example/meta'

export const SucceededPlaygroundEmbed = m('SucceededPlaygroundEmbed')
export const FailedPlaygroundEmbed = m('FailedPlaygroundEmbed', {
  reason: S.String,
})

const PlaygroundEmbed = Mount.define(
  'PlaygroundEmbed',
  {
    title: S.String,
    description: S.String,
    files: S.Record(S.String, S.String),
  },
  SucceededPlaygroundEmbed,
  FailedPlaygroundEmbed,
)(
  ({ title, description, files }) =>
    element =>
      Effect.gen(function* () {
        if (!(element instanceof HTMLElement)) {
          return FailedPlaygroundEmbed({
            reason: 'Playground requires an HTMLElement host.',
          })
        }
        yield* Effect.tryPromise(() =>
          import('@stackblitz/sdk').then(({ default: sdk }) =>
            sdk.embedProject(
              element,
              {
                title,
                description,
                template: 'node',
                files,
              },
              {
                height: '100%',
                hideNavigation: true,
                openFile: 'src/main.ts',
                showSidebar: true,
                view: 'default',
              },
            ),
          ),
        )
        return SucceededPlaygroundEmbed()
      }).pipe(
        Effect.catch(error =>
          Effect.succeed(
            FailedPlaygroundEmbed({
              reason: error instanceof Error ? error.message : String(error),
            }),
          ),
        ),
      ),
)

const backToExampleButton = (maybeMeta: Option.Option<ExampleMeta>): Html => {
  const h = html<Message>()

  return Option.match(maybeMeta, {
    onNone: () =>
      h.a(
        [h.Href(examplesRouter()), h.Class('cta-secondary')],
        [Icon.chevronLeft('w-4 h-4'), 'All Examples'],
      ),
    onSome: meta =>
      h.a(
        [
          h.Href(exampleDetailRouter({ exampleSlug: meta.slug })),
          h.Class('cta-secondary'),
        ],
        [Icon.chevronLeft('w-4 h-4'), `Back to ${meta.title}`],
      ),
  })
}

const messageView = (
  heading: string,
  body: string,
  maybeMeta: Option.Option<ExampleMeta>,
): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('flex-1 flex items-center justify-center px-6 py-20 text-center')],
    [
      h.div(
        [h.Class('max-w-md flex flex-col items-center')],
        [
          h.div(
            [
              h.Class(
                'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2',
              ),
            ],
            [heading],
          ),
          h.div(
            [h.Class('text-sm text-gray-600 dark:text-gray-400 mb-6')],
            [body],
          ),
          backToExampleButton(maybeMeta),
        ],
      ),
    ],
  )
}

// NOTE: this Mount registers no acquireRelease finalizer. The StackBlitz
// SDK maintains an internal `connections` array that isn't exposed for
// cleanup. Once an embed succeeds, its Connection object lives for the
// page's lifetime. Snabbdom already removes the iframe from the DOM on
// unmount; there is no additional cleanup hook the SDK accepts. The
// resulting per-visit leak is a few KB of JS state, negligible for a docs
// site, tracked as a follow-up to request a public teardown method.
const embedView = (meta: ExampleMeta, files: Record<string, string>): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('flex-1 min-h-0')],
    [
      h.div(
        [
          h.OnMount(
            PlaygroundEmbed({
              title: meta.title,
              description: meta.description,
              files,
            }),
          ),
        ],
        [],
      ),
    ],
  )
}

export const view = (
  slug: string,
  isChromium: boolean,
  playgroundError: Option.Option<string>,
): Html => {
  const h = html<Message>()

  const maybeMeta = findBySlug(slug)
  const maybeFiles = Option.fromNullishOr(filesBySlug[slug])

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

  return h.keyed('div')(
    `playground-${slug}`,
    [h.Class('flex flex-col h-screen')],
    [
      h.main(
        [
          h.Id('main-content'),
          h.Class('flex-1 flex flex-col min-h-0'),
          h.AriaLabel('Playground'),
        ],
        [content],
      ),
    ],
  )
}
