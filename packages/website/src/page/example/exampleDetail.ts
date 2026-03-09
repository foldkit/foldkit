import { Array, Match as M, Option, Schema as S, pipe } from 'effect'
import { Command } from 'foldkit/command'
import { Html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import {
  AriaLabel,
  Class,
  Href,
  InnerHTML,
  OnClick,
  Src,
  Style,
  a,
  button,
  div,
  empty,
  h2,
  iframe,
  keyed,
  nav,
} from '../../html'
import type { Message as ParentMessage, TableOfContentsEntry } from '../../main'
import { pageTitle, para } from '../../prose'
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
})
export type Model = typeof Model.Type

// MESSAGE

const SelectedFile = m('SelectedFile', { path: S.String })

export const Message = S.Union(SelectedFile)
export type Message = typeof Message.Type

// INIT

export const init = (
  entryFile: string,
): [Model, ReadonlyArray<Command<Message>>] => [{ selectedFile: entryFile }, []]

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
    }),
  )

// VIEW

const difficultyTag = (difficulty: ExampleMeta['difficulty']): Html => {
  const { label, colors } = M.value(difficulty).pipe(
    M.when('Beginner', () => ({
      label: 'Beginner',
      colors:
        'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400',
    })),
    M.when('Intermediate', () => ({
      label: 'Intermediate',
      colors:
        'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400',
    })),
    M.when('Advanced', () => ({
      label: 'Advanced',
      colors:
        'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400',
    })),
    M.exhaustive,
  )
  return div([Class(`text-xs px-2 py-0.5 rounded-full ${colors}`)], [label])
}

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
      pageTitle('example-detail', meta.title),
      para(meta.description),
      div(
        [Class('flex items-center gap-3 mt-3')],
        [
          difficultyTag(meta.difficulty),
          ...Array.map(meta.tags, featureTag),
          a(
            [
              Href(meta.sourceHref),
              Class(
                'ml-auto text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors',
              ),
            ],
            ['View source on GitHub'],
          ),
        ],
      ),
    ],
  )

const fileListItem = (
  file: ExampleSourceFile,
  isSelected: boolean,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  button(
    [
      Class(
        isSelected
          ? 'w-full text-left px-3 py-1.5 text-sm font-mono rounded bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400'
          : 'w-full text-left px-3 py-1.5 text-sm font-mono rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer',
      ),
      OnClick(toMessage(SelectedFile({ path: file.path }))),
    ],
    [file.path],
  )

const fileBrowserView = (
  files: ReadonlyArray<ExampleSourceFile>,
  selectedFile: string,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  nav(
    [
      AriaLabel('Source files'),
      Class(
        'flex flex-col gap-0.5 p-2 rounded-lg border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/50',
      ),
    ],
    Array.map(files, file =>
      fileListItem(file, file.path === selectedFile, toMessage),
    ),
  )

const fakeBrowserChromeView = (meta: ExampleMeta, slug: string): Html =>
  div(
    [
      Class(
        'rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/50 shadow-sm',
      ),
    ],
    [
      div(
        [
          Class(
            'flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700/50',
          ),
        ],
        [
          div(
            [Class('flex gap-1.5')],
            [
              div(
                [Class('w-3 h-3 rounded-full bg-red-400 dark:bg-red-500/60')],
                [],
              ),
              div(
                [
                  Class(
                    'w-3 h-3 rounded-full bg-yellow-400 dark:bg-yellow-500/60',
                  ),
                ],
                [],
              ),
              div(
                [
                  Class(
                    'w-3 h-3 rounded-full bg-green-400 dark:bg-green-500/60',
                  ),
                ],
                [],
              ),
            ],
          ),
          div(
            [
              Class(
                'flex-1 text-xs font-mono text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded px-3 py-1 text-center truncate',
              ),
            ],
            [meta.hasRouting ? `localhost:5173` : `localhost:5173`],
          ),
        ],
      ),
      iframe(
        [
          Src(`/example-apps-embed/${slug}/index.html?embedded`),
          Class('w-full bg-white'),
          Style({ height: '28rem' }),
          AriaLabel(`${meta.title} example running live`),
        ],
        [],
      ),
    ],
  )

const selectedFileView = (
  files: ReadonlyArray<ExampleSourceFile>,
  selectedFile: string,
  copiedSnippets: CopiedSnippets,
): Html =>
  pipe(
    files,
    Array.findFirst(file => file.path === selectedFile),
    Option.match({
      onNone: () => empty,
      onSome: file =>
        div(
          [],
          [
            h2(
              [
                Class(
                  'text-sm font-mono text-gray-500 dark:text-gray-400 mb-2',
                ),
              ],
              [file.path],
            ),
            highlightedCodeBlock(
              div([Class('text-sm'), InnerHTML(file.highlightedHtml)], []),
              file.rawCode,
              `Copy ${file.path} to clipboard`,
              copiedSnippets,
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
            fakeBrowserChromeView(meta, slug),
            div(
              [Class('grid grid-cols-1 lg:grid-cols-[12rem_1fr] gap-4 mt-6')],
              [
                fileBrowserView(sources.files, model.selectedFile, toMessage),
                selectedFileView(
                  sources.files,
                  model.selectedFile,
                  copiedSnippets,
                ),
              ],
            ),
          ],
        ),
    }),
  )

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = []
