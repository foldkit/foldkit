import {
  Array,
  Effect,
  Match as M,
  Option,
  Schema as S,
  String,
  pipe,
} from 'effect'
import { Ui } from 'foldkit'
import { Command } from 'foldkit/command'
import { Html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import {
  AriaCurrent,
  AriaLabel,
  Class,
  Href,
  InnerHTML,
  OnClick,
  Src,
  Style,
  Type,
  a,
  button,
  div,
  empty,
  iframe,
  keyed,
  nav,
  span,
} from '../../html'
import { Icon } from '../../icon'
import type { Message as ParentMessage, TableOfContentsEntry } from '../../main'
import { pageTitle, para } from '../../prose'
import { examplesRouter } from '../../route'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'
import { type ExampleMeta, findBySlug } from './meta'

type ExampleSourceFile = Readonly<{
  path: string
  highlightedHtml: string
  rawCode: string
}>

type ExampleSources = Readonly<{
  files: ReadonlyArray<ExampleSourceFile>
}>

// MODEL

export const Model = S.Struct({
  selectedFile: S.String,
  maybeExampleUrl: S.OptionFromSelf(S.String),
  livePreviewDisclosure: Ui.Disclosure.Model,
})
export type Model = typeof Model.Type

// MESSAGE

const SelectedFile = m('SelectedFile', { path: S.String })
export const ChangedExampleUrl = m('ChangedExampleUrl', { url: S.String })
const GotLivePreviewDisclosureMessage = m('GotLivePreviewDisclosureMessage', {
  message: Ui.Disclosure.Message,
})

export const Message = S.Union(
  SelectedFile,
  ChangedExampleUrl,
  GotLivePreviewDisclosureMessage,
)
export type Message = typeof Message.Type

// INIT

export const init = (
  entryFile: string,
): [Model, ReadonlyArray<Command<Message>>] => [
  {
    selectedFile: entryFile,
    maybeExampleUrl: Option.none(),
    livePreviewDisclosure: Ui.Disclosure.init({
      id: 'live-preview',
      isOpen: true,
    }),
  },
  [],
]

// UPDATE

export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      SelectedFile: ({ path }) => [
        evo(model, { selectedFile: () => path }),
        [],
      ],
      ChangedExampleUrl: ({ url }) => [
        evo(model, { maybeExampleUrl: () => Option.some(url) }),
        [],
      ],
      GotLivePreviewDisclosureMessage: ({ message }) => {
        const [nextDisclosure, disclosureCommands] = Ui.Disclosure.update(
          model.livePreviewDisclosure,
          message,
        )
        return [
          evo(model, { livePreviewDisclosure: () => nextDisclosure }),
          disclosureCommands.map(
            Effect.map(message => GotLivePreviewDisclosureMessage({ message })),
          ),
        ]
      },
    }),
  )

// VIEW

const featureTag = (text: string): Html =>
  div(
    [
      Class(
        'text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
      ),
    ],
    [text],
  )

const headerView = (meta: ExampleMeta): Html =>
  div(
    [Class('mb-6')],
    [
      a(
        [
          Href(examplesRouter()),
          Class(
            'inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4',
          ),
        ],
        [Icon.chevronLeft('w-4 h-4'), 'All Examples'],
      ),
      pageTitle('example-detail', meta.title),
      para(meta.description),
      div(
        [Class('flex flex-wrap items-center gap-2 mt-3')],
        Array.map(meta.tags, featureTag),
      ),
      a(
        [
          Href(meta.sourceHref),
          Class(
            'text-sm text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 mt-3 inline-block',
          ),
        ],
        ['View source on GitHub'],
      ),
    ],
  )

const EMBED_BASE_PATH_PREFIX = '/example-apps-embed/'

const extractDisplayPath = (fullUrl: string, slug: string): string => {
  const basePath = EMBED_BASE_PATH_PREFIX + slug + '/'
  return pipe(
    fullUrl,
    String.indexOf(basePath),
    Option.map(index => String.slice(index + String.length(basePath))(fullUrl)),
    Option.map(String.replaceAll('?embedded', '')),
    Option.map(String.replaceAll('&embedded', '')),
    Option.map(afterBase =>
      pipe(afterBase, String.startsWith('?'))
        ? String.slice(1)(afterBase)
        : afterBase,
    ),
    Option.map(path => '/' + path),
    Option.getOrElse(() => '/'),
  )
}

const urlBarContent = (
  meta: ExampleMeta,
  slug: string,
  maybeExampleUrl: Option.Option<string>,
): string =>
  meta.hasRouting
    ? Option.match(maybeExampleUrl, {
        onNone: () => '/',
        onSome: url => extractDisplayPath(url, slug),
      })
    : '/'

const trafficLightDots: Html = div(
  [Class('flex gap-1.5')],
  [
    div([Class('w-3 h-3 rounded-full bg-red-400 dark:bg-red-500/60')], []),
    div(
      [Class('w-3 h-3 rounded-full bg-yellow-400 dark:bg-yellow-500/60')],
      [],
    ),
    div([Class('w-3 h-3 rounded-full bg-green-400 dark:bg-green-500/60')], []),
  ],
)

const DISCLOSURE_BUTTON_CLASS =
  'w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium cursor-pointer transition border border-gray-200 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl data-[open]:rounded-b-none select-none'

const DISCLOSURE_PANEL_CLASS =
  'rounded-b-xl overflow-hidden border-x border-b border-gray-200 dark:border-gray-700/50 shadow-sm'

const disclosureChevron = (isOpen: boolean): Html =>
  span(
    [
      Class(
        `transition-transform text-gray-400 dark:text-gray-500 ${isOpen ? 'rotate-180' : ''}`,
      ),
    ],
    [Icon.chevronDown('w-4 h-4')],
  )

const livePreviewDisclosureView = (
  disclosureModel: Ui.Disclosure.Model,
  meta: ExampleMeta,
  slug: string,
  maybeExampleUrl: Option.Option<string>,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  Ui.Disclosure.view({
    model: disclosureModel,
    toMessage: message =>
      toMessage(GotLivePreviewDisclosureMessage({ message })),
    buttonClassName: DISCLOSURE_BUTTON_CLASS,
    buttonContent: div(
      [Class('flex items-center justify-between w-full')],
      [span([], ['Live Preview']), disclosureChevron(disclosureModel.isOpen)],
    ),
    panelClassName: DISCLOSURE_PANEL_CLASS,
    panelContent: div(
      [],
      [
        div(
          [
            Class(
              'flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700/50',
            ),
          ],
          [
            trafficLightDots,
            div(
              [
                Class(
                  'flex-1 text-xs font-mono text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded px-3 py-1 text-center truncate',
                ),
              ],
              [urlBarContent(meta, slug, maybeExampleUrl)],
            ),
          ],
        ),
        iframe(
          [
            Src(`/example-apps-embed/${slug}/index.html?embedded`),
            Class('w-full bg-white'),
            Style({ height: '60vh' }),
            AriaLabel(`${meta.title} example running live`),
          ],
          [],
        ),
      ],
    ),
    persistPanel: true,
  })

const SELECT_CLASS =
  'appearance-none w-full pl-3 pr-10 py-2 text-sm font-mono bg-transparent text-gray-700 dark:text-gray-300 cursor-pointer transition hover:bg-gray-100/50 dark:hover:bg-gray-800/50 focus:outline-none'

const CHEVRON_CLASS =
  'pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500'

const sourceCodeView = (
  files: ReadonlyArray<ExampleSourceFile>,
  selectedFile: string,
  copiedSnippets: CopiedSnippets,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  pipe(
    files,
    Array.findFirst(file => file.path === selectedFile),
    Option.match({
      onNone: () => empty,
      onSome: file =>
        div(
          [
            Class(
              'rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700/50',
            ),
          ],
          [
            div(
              [
                Class(
                  'relative border-b border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/50',
                ),
              ],
              [
                Ui.Select.view({
                  id: 'example-file-selector',
                  value: selectedFile,
                  onChange: path => toMessage(SelectedFile({ path })),
                  toView: attributes =>
                    div(
                      [Class('relative')],
                      [
                        label(
                          [...attributes.label, Class('sr-only')],
                          ['Select source file'],
                        ),
                        select(
                          [...attributes.select, Class(SELECT_CLASS)],
                          Array.map(files, file =>
                            option([Value(file.path)], [file.path]),
                          ),
                        ),
                        span(
                          [Class(CHEVRON_CLASS)],
                          [Icon.chevronDown('w-4 h-4')],
                        ),
                      ],
                    ),
                }),
              ],
            ),
            div(
              [
                Class('max-h-[80vh] overflow-y-auto'),
                Style({ scrollbarGutter: 'stable' }),
              ],
              [
                highlightedCodeBlock(
                  div(
                    [
                      Class('text-sm [&_pre]:rounded-none [&_pre]:border-0'),
                      InnerHTML(file.highlightedHtml),
                    ],
                    [],
                  ),
                  file.rawCode,
                  `Copy ${file.path} to clipboard`,
                  copiedSnippets,
                  '!mt-0',
                ),
              ],
            ),
          ],
        ),
    }),
  )

export const view = (
  model: Model,
  slug: string,
  sources: ExampleSources,
  copiedSnippets: CopiedSnippets,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  pipe(
    findBySlug(slug),
    Option.match({
      onNone: () => div([], ['Example not found']),
      onSome: meta =>
        keyed('div')(
          slug,
          [],
          [
            headerView(meta),
            livePreviewDisclosureView(
              model.livePreviewDisclosure,
              meta,
              slug,
              model.maybeExampleUrl,
              toMessage,
            ),
            div(
              [Class('mt-6')],
              [
                sourceCodeView(
                  sources.files,
                  model.selectedFile,
                  copiedSnippets,
                  toMessage,
                ),
              ],
            ),
          ],
        ),
    }),
  )

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = []
