import { Match, Option } from 'effect'
import { Submodel } from 'foldkit'
import {
  Html,
  type HtmlBuilder,
  childAttributes,
  createLazy,
  inertHtml as ih,
} from 'foldkit/html'

import { Menu } from '@foldkit/ui'

import { type CodeBlock, Shared } from '../../component'
import { Icon } from '../../icon'
import {
  type ExampleMeta,
  type ExampleSlug,
  examples,
  findBySlug,
} from '../example'
import * as AsyncCounterDemo from './asyncCounterDemo'
import { contentView } from './content'
import * as DemoTab from './demoTab'
import { Message } from './message'
import { type Model } from './model'
import * as NotePlayerDemo from './notePlayerDemo'

const PlaygroundMenu = Menu.create<ExampleSlug>()

// DEMO TABS

const demoTabButtonClassName =
  'px-3 py-2 text-sm font-normal cursor-pointer transition border border-gray-300 dark:border-gray-800 bg-cream dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-t-lg lg:rounded-t-none lg:rounded-l-lg lg:border-r-0 mb-[-1px] lg:mb-0 lg:mr-[-1px] data-[selected]:relative data-[selected]:z-10 data-[selected]:bg-cream data-[selected]:dark:bg-gray-900 data-[selected]:text-gray-900 data-[selected]:dark:text-white data-[selected]:border-b-0 lg:data-[selected]:border-b lg:data-[selected]:border-r-0'

const demoTabPanelClassName =
  'flex-1 min-w-0 p-4 bg-cream dark:bg-gray-900 rounded-b-lg rounded-tr-lg lg:rounded-bl-lg lg:rounded-r-lg lg:rounded-tl-none border border-gray-300 dark:border-gray-800'

const toAsyncCounterDemoMessage = (
  message: AsyncCounterDemo.Message,
): Message => Message.GotAsyncCounterDemoMessage({ message })

const toNotePlayerDemoMessage = (message: NotePlayerDemo.Message): Message =>
  Message.GotNotePlayerDemoMessage({ message })

const renderAsyncCounterDemo = (
  asyncCounterDemo: AsyncCounterDemo.Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.submodel({
    slotId: 'async-counter-demo',
    model: asyncCounterDemo,
    view: AsyncCounterDemo.view,
    toParentMessage: toAsyncCounterDemoMessage,
  })

const renderNotePlayerDemo = (
  notePlayerDemo: NotePlayerDemo.Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.submodel({
    slotId: 'note-player-demo',
    model: notePlayerDemo,
    view: NotePlayerDemo.view,
    toParentMessage: toNotePlayerDemoMessage,
  })

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

const chromeRecommendedHint: Html = ih.p(
  [ih.Class('text-xs text-gray-500 dark:text-gray-400')],
  ['Requires a Chromium browser'],
)

const withChromeRecommendedHint = (menu: Html, isShowingHint: boolean): Html =>
  isShowingHint
    ? ih.div(
        [ih.Class('flex flex-col items-start gap-1')],
        [menu, chromeRecommendedHint],
      )
    : menu

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
            'text-xs text-gray-600 dark:text-gray-400 leading-snug line-clamp-2',
          ),
        ],
        [meta.description],
      ),
    ],
  )

const playgroundMenuView = (
  menuModel: Menu.Model,
  slugs: ReadonlyArray<ExampleSlug>,
  h: HtmlBuilder<Message>,
): Html =>
  h.submodel({
    slotId: menuModel.id,
    model: menuModel,
    view: PlaygroundMenu.view,
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
          'px-4 pt-3 pb-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 leading-snug',
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
    toParentMessage: message => Message.GotPlaygroundMenuMessage({ message }),
  })

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  isNarrowViewport: boolean
  maybeIsChromium: Option.Option<boolean>
  maybeGitHubStarCount: Option.Option<number>
}>

// VIEW

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h) => {
    const asyncCounterDemoView = lazyAsyncCounterDemo(renderAsyncCounterDemo, [
      model.asyncCounterDemo,
      h,
    ])

    const notePlayerDemoView = lazyNotePlayerDemo(renderNotePlayerDemo, [
      model.notePlayerDemo,
      h,
    ])

    const playgroundMenu = withChromeRecommendedHint(
      playgroundMenuView(
        model.playgroundMenu,
        examples.map(example => example.slug),
        h,
      ),
      Option.contains(viewInputs.maybeIsChromium, false),
    )

    const buttonLabelFor = (tab: DemoTab.Tab): string =>
      Match.value(tab).pipe(
        Match.when('Architecture', () => 'Async Counter'),
        Match.when('Note Player', () => 'Note Player'),
        Match.exhaustive,
      )

    const panelFor = (tab: DemoTab.Tab) =>
      Match.value(tab).pipe(
        Match.when('Architecture', () => asyncCounterDemoView),
        Match.when('Note Player', () => notePlayerDemoView),
        Match.exhaustive,
      )

    const demoTabsView = h.submodel({
      slotId: model.demoTabs.id,
      model: model.demoTabs,
      view: DemoTab.DemoTabs.view,
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
      toParentMessage: message => Message.GotDemoTabsMessage({ message }),
    })

    const content = contentView(
      viewInputs.renderCopyButton,
      demoTabsView,
      Shared.emailSignupContent,
      playgroundMenu,
      model.aiHeadingToggleCount,
      viewInputs.maybeGitHubStarCount,
      h,
    )

    return content
  },
)
