import { Match, Option } from 'effect'
import {
  Html,
  childAttributes,
  createLazy,
  inertHtml as ih,
} from 'foldkit/html'

import { type ResolvedTheme } from '../../colorScheme'
import { type CodeBlock, Shared } from '../../component'
import { Icon } from '../../icon'
import {
  type ExampleMeta,
  type ExampleSlug,
  examples,
  findBySlug,
} from '../example/domain'
import { AsyncCounterDemoBlock } from './asyncCounterDemo'
import {
  AsyncCounterDemoBinding,
  DemoTabsBinding,
  HomeComposition,
  type HomeViewBuilder,
  NotePlayerDemoBinding,
  PlaygroundMenuBinding,
} from './composition'
import { contentView } from './content'
import * as DemoTab from './demoTab'
import { Message } from './message'
import { NotePlayerDemoBlock } from './notePlayerDemo'
import { PlaygroundMenuBlock } from './playgroundMenu'

type AsyncCounterDemoBlockModel = typeof AsyncCounterDemoBlock.Model.Type
type NotePlayerDemoBlockModel = typeof NotePlayerDemoBlock.Model.Type
type PlaygroundMenuBlockModel = typeof PlaygroundMenuBlock.Model.Type

// DEMO TABS

const demoTabButtonClassName =
  'px-3 py-2 text-sm font-normal cursor-pointer transition border border-gray-300 dark:border-gray-800 bg-cream dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-t-lg lg:rounded-t-none lg:rounded-l-lg lg:border-r-0 mb-[-1px] lg:mb-0 lg:mr-[-1px] data-[selected]:relative data-[selected]:z-10 data-[selected]:bg-cream data-[selected]:dark:bg-gray-900 data-[selected]:text-gray-900 data-[selected]:dark:text-white data-[selected]:border-b-0 lg:data-[selected]:border-b lg:data-[selected]:border-r-0'

const demoTabPanelClassName =
  'flex-1 min-w-0 p-4 bg-cream dark:bg-gray-900 rounded-b-lg rounded-tr-lg lg:rounded-bl-lg lg:rounded-r-lg lg:rounded-tl-none border border-gray-300 dark:border-gray-800'

const renderAsyncCounterDemo = (
  model: AsyncCounterDemoBlockModel,
  h: HomeViewBuilder,
) =>
  h.block(
    AsyncCounterDemoBinding.embedView({
      slotId: 'async-counter-demo',
      model,
    }),
  )

const renderNotePlayerDemo = (
  model: NotePlayerDemoBlockModel,
  h: HomeViewBuilder,
) =>
  h.block(
    NotePlayerDemoBinding.embedView({
      slotId: 'note-player-demo',
      model,
    }),
  )

const lazyAsyncCounterDemo = createLazy()
const lazyNotePlayerDemo = createLazy()

// PLAYGROUND MENU

const VIEWPORT_PADDING = 16

// NOTE: mirrors the md+ CSS --header-height (4rem); the variable's
// env(safe-area-inset-top) term is not readable from static config.
const MD_HEADER_HEIGHT = 64

const HEADER_CLEARANCE = MD_HEADER_HEIGHT + VIEWPORT_PADDING

const PLAYGROUND_MENU_ANCHOR = {
  placement: 'bottom-start' as const,
  gap: 8,
  padding: {
    top: HEADER_CLEARANCE,
    right: VIEWPORT_PADDING,
    bottom: VIEWPORT_PADDING,
    left: VIEWPORT_PADDING,
  },
}

const playgroundButtonClassName = 'cta-amber cursor-pointer'

const playgroundItemsClassName =
  'w-80 max-h-[28rem] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-cream dark:bg-gray-900 shadow-xl z-20 outline-none transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0'

const playgroundItemClassName =
  'block px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-800/60 data-[active]:bg-gray-100 dark:data-[active]:bg-gray-800/60'

const playgroundBackdropClassName = 'fixed inset-0 z-10'

const playgroundItemContent = (meta: ExampleMeta): Html =>
  ih.div(
    [],
    [
      ih.div(
        [ih.Class('font-medium text-gray-900 dark:text-white text-sm mb-0.5')],
        [meta.title],
      ),
      ih.p(
        [
          ih.Class(
            'text-xs text-gray-700 dark:text-gray-400 leading-snug line-clamp-2',
          ),
        ],
        [meta.description],
      ),
    ],
  )

type PlaygroundMenuViewInput = Readonly<{
  model: PlaygroundMenuBlockModel
  slugs: ReadonlyArray<ExampleSlug>
}>

const playgroundMenuView = (
  { model, slugs }: PlaygroundMenuViewInput,
  h: HomeViewBuilder,
) =>
  h.block(
    PlaygroundMenuBinding.embedView({
      slotId: model.id,
      model,
      viewInputs: {
        anchor: PLAYGROUND_MENU_ANCHOR,
        items: slugs,
        itemToConfig: slug => ({
          className: playgroundItemClassName,
          content: Option.match(findBySlug(slug), {
            onNone: () => h.span([], [slug]),
            onSome: playgroundItemContent,
          }),
        }),
        isItemDisabled: () => false,
        itemGroupKey: () => 'examples',
        groupToHeading: () => ({
          className:
            'px-4 pt-3 pb-2 text-xs text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 leading-snug',
          content: h.span(
            [],
            [
              'Run an example ',
              h.span(
                [h.Class('text-gray-700 dark:text-gray-200 font-medium')],
                ['live in your browser'],
              ),
              '. No install.',
            ],
          ),
        }),
        buttonContent: h.span(
          [h.Class('inline-flex items-center gap-2')],
          [Icon.bolt('w-5 h-5'), 'Launch Playground'],
        ),
        buttonAttributes: childAttributes([h.Class(playgroundButtonClassName)]),
        itemsAttributes: childAttributes([h.Class(playgroundItemsClassName)]),
        backdropAttributes: childAttributes([
          h.Class(playgroundBackdropClassName),
        ]),
        attributes: childAttributes([h.Class('relative inline-block')]),
      },
    }),
  )

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  isNarrowViewport: boolean
  maybeGitHubStarCount: Option.Option<number>
  resolvedTheme: ResolvedTheme
  isBrowserEnvironmentLoaded: boolean
  newsletterEmail: string
}>

export const view = HomeComposition.makeView.withInputs<ViewInputs>(
  (model, viewInputs, h) => {
    const asyncCounterDemoView = lazyAsyncCounterDemo(renderAsyncCounterDemo, [
      model.asyncCounterDemo,
      h,
    ])

    const notePlayerDemoView = lazyNotePlayerDemo(renderNotePlayerDemo, [
      model.notePlayerDemo,
      h,
    ])

    const playgroundMenu = playgroundMenuView(
      {
        model: model.playgroundMenu,
        slugs: examples.map(example => example.slug),
      },
      h,
    )

    const buttonLabelFor = (tab: DemoTab.Tab): string =>
      Match.value(tab).pipe(
        Match.when('AsyncCounter', () => 'Async Counter'),
        Match.when('Note Player', () => 'Note Player'),
        Match.exhaustive,
      )

    const panelFor = (tab: DemoTab.Tab) =>
      Match.value(tab).pipe(
        Match.when('AsyncCounter', () => asyncCounterDemoView),
        Match.when('Note Player', () => notePlayerDemoView),
        Match.exhaustive,
      )

    const demoTabsView = h.block(
      DemoTabsBinding.embedView({
        slotId: model.demoTabs.id,
        model: model.demoTabs,
        viewInputs: {
          tabs: DemoTab.all,
          selectedValue: model.activeDemoTab,
          ariaLabel: 'Demo tabs',
          orientation: viewInputs.isNarrowViewport ? 'Horizontal' : 'Vertical',
          toView: ({ tablist, tabs, activeIndex }) =>
            h.div(
              [h.Class('lg:flex')],
              [
                h.div(
                  [...tablist, h.Class('flex lg:flex-col gap-1')],
                  tabs.map(tab =>
                    h.button(
                      [...tab.tab, h.Class(demoTabButtonClassName)],
                      [h.span([], [buttonLabelFor(tab.value)])],
                    ),
                  ),
                ),
                ...tabs
                  .filter(tab => tab.index === activeIndex)
                  .map(tab =>
                    h.div(
                      [...tab.panel, h.Class(demoTabPanelClassName)],
                      [panelFor(tab.value)],
                    ),
                  ),
              ],
            ),
        },
      }),
    )

    const content = contentView(
      viewInputs.renderCopyButton,
      viewInputs.renderSnippet,
      demoTabsView,
      Shared.emailSignupContent(
        viewInputs.newsletterEmail,
        value => Message.UpdatedNewsletterEmail({ value }),
        h,
      ),
      playgroundMenu,
      viewInputs.maybeGitHubStarCount,
      viewInputs.resolvedTheme,
      viewInputs.isBrowserEnvironmentLoaded,
      h,
    )

    return content
  },
)
