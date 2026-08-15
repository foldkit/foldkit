import { Match as M, Option } from 'effect'
import {
  Html,
  type HtmlBuilder,
  childAttributes,
  createLazy,
  inertHtml as ih,
} from 'foldkit/html'

import { Menu } from '@foldkit/ui'

import * as DemoTab from '../demoTab'
import { Icon } from '../icon'
import { Link } from '../link'
import { type Model } from '../main'
import {
  ClickedOpenMobileMenu,
  GotAsyncCounterDemoMessage,
  GotDemoTabsMessage,
  GotNotePlayerDemoMessage,
  GotPlaygroundMenuMessage,
  type Message,
} from '../message'
import * as Page from '../page'
import {
  type ExampleMeta,
  type ExampleSlug,
  examples,
  findBySlug,
} from '../page/example/meta'
import { coreArchitectureRouter, homeRouter } from '../route'
import { headerNavView } from './headerNav'
import { betaTag, emailSignupContentView, skipNavLink } from './shared'
import { mobileMenuView } from './sidebar'
import { themeSelector } from './themeSelector'

const PlaygroundMenu = Menu.create<ExampleSlug>()

const PagefindBody = ih.DataAttribute('pagefind-body', '')

// LANDING HEADER

const landingHeaderView = (model: Model, h: HtmlBuilder<Message>) =>
  h.header(
    [
      h.Class(
        'fixed top-0 inset-x-0 z-50 h-[var(--header-height)] pt-[env(safe-area-inset-top,0px)] bg-cream/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 flex items-center justify-between',
      ),
    ],
    [
      h.a(
        [h.Href(homeRouter()), h.Class('flex items-center gap-2')],
        [
          h.img([
            h.Src('/logo.svg'),
            h.Alt('Foldkit'),
            h.Width('801'),
            h.Height('200'),
            h.Class('h-6 md:h-8 w-auto dark:invert'),
          ]),
          betaTag,
        ],
      ),
      h.div(
        [h.Class('flex items-center gap-3')],
        [
          headerNavView(
            model.route,
            'hidden sm:flex items-center gap-6 mr-4',
            h,
          ),
          h.div(
            [h.Class('hidden md:flex')],
            [themeSelector(model.themePreference, h)],
          ),
          h.a(
            [
              h.Href(coreArchitectureRouter()),
              h.Class(
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 text-sm font-normal transition hover:bg-accent-700 dark:hover:bg-accent-600',
              ),
            ],
            ['Dive In', Icon.arrowRight('w-4 h-4')],
          ),
          h.button(
            [
              h.Class(
                'sm:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300 cursor-pointer',
              ),
              h.AriaExpanded(model.mobileMenuDialog.isOpen),
              h.AriaLabel('Toggle menu'),
              h.OnClick(ClickedOpenMobileMenu()),
            ],
            [Icon.menu('w-6 h-6')],
          ),
        ],
      ),
    ],
  )

// LANDING FOOTER

const landingFooter = (currentYear: number): Html =>
  ih.footer(
    [
      ih.Class(
        'px-6 py-8 md:px-12 lg:px-20 border-t border-gray-300 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400',
      ),
    ],
    [
      ih.p(
        [],
        [
          'Built with ',
          ih.a(
            [
              ih.Href(`${Link.websiteSource}/src/main.ts`),
              ih.Class(
                'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500',
              ),
            ],
            ['Foldkit'],
          ),
          '.',
        ],
      ),
      ih.p([ih.Class('mt-1')], [`© ${currentYear} Devin Jameson`]),
    ],
  )

// DEMO TABS

const demoTabButtonClassName =
  'px-3 py-2 text-sm font-normal cursor-pointer transition border border-gray-300 dark:border-gray-800 bg-cream dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-t-lg lg:rounded-t-none lg:rounded-l-lg lg:border-r-0 mb-[-1px] lg:mb-0 lg:mr-[-1px] data-[selected]:relative data-[selected]:z-10 data-[selected]:bg-cream data-[selected]:dark:bg-gray-900 data-[selected]:text-gray-900 data-[selected]:dark:text-white data-[selected]:border-b-0 lg:data-[selected]:border-b lg:data-[selected]:border-r-0'

const demoTabPanelClassName =
  'flex-1 min-w-0 p-4 bg-cream dark:bg-gray-900 rounded-b-lg rounded-tr-lg lg:rounded-bl-lg lg:rounded-r-lg lg:rounded-tl-none border border-gray-300 dark:border-gray-800'

const toAsyncCounterDemoMessage = (
  message: Page.AsyncCounterDemo.Message,
): Message => GotAsyncCounterDemoMessage({ message })

const toNotePlayerDemoMessage = (
  message: Page.NotePlayerDemo.Message,
): Message => GotNotePlayerDemoMessage({ message })

const renderAsyncCounterDemo = (
  maybeAsyncCounterDemo: Option.Option<Page.AsyncCounterDemo.Model>,
  h: HtmlBuilder<Message>,
): Html =>
  Option.match(maybeAsyncCounterDemo, {
    onNone: () => h.empty,
    onSome: asyncCounterDemo =>
      h.submodel({
        slotId: 'async-counter-demo',
        model: asyncCounterDemo,
        view: Page.AsyncCounterDemo.view,
        toParentMessage: toAsyncCounterDemoMessage,
      }),
  })

const renderNotePlayerDemo = (
  maybeNotePlayerDemo: Option.Option<Page.NotePlayerDemo.Model>,
  h: HtmlBuilder<Message>,
): Html =>
  Option.match(maybeNotePlayerDemo, {
    onNone: () => h.empty,
    onSome: notePlayerDemo =>
      h.submodel({
        slotId: 'note-player-demo',
        model: notePlayerDemo,
        view: Page.NotePlayerDemo.view,
        toParentMessage: toNotePlayerDemoMessage,
      }),
  })

const lazyAsyncCounterDemo = createLazy()
const lazyNotePlayerDemo = createLazy()

// PLAYGROUND MENU

const VIEWPORT_PADDING = 16

// NOTE: mirrors the md+ CSS --header-height (4.5rem); the variable's
// env(safe-area-inset-top) term is not readable from static config.
const MD_HEADER_HEIGHT = 72

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

const withChromeRecommendedHint = (menu: Html, isChromium: boolean): Html =>
  isChromium
    ? menu
    : ih.div(
        [ih.Class('flex flex-col items-start gap-1')],
        [menu, chromeRecommendedHint],
      )

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
    toParentMessage: message => GotPlaygroundMenuMessage({ message }),
  })

// VIEW

export const landingView = (model: Model, h: HtmlBuilder<Message>) => {
  const asyncCounterDemoView = lazyAsyncCounterDemo(renderAsyncCounterDemo, [
    model.asyncCounterDemo,
    h,
  ])

  const notePlayerDemoView = lazyNotePlayerDemo(renderNotePlayerDemo, [
    model.notePlayerDemo,
    h,
  ])

  const emailSignupView = emailSignupContentView(
    model.emailField,
    model.emailSubscriptionStatus,
    h,
  )

  const playgroundMenu = withChromeRecommendedHint(
    playgroundMenuView(
      model.playgroundMenu,
      examples.map(example => example.slug),
      h,
    ),
    model.isChromium,
  )

  const buttonLabelFor = (tab: DemoTab.Tab): string =>
    M.value(tab).pipe(
      M.when('Architecture', () => 'Async Counter'),
      M.when('Note Player', () => 'Note Player'),
      M.exhaustive,
    )

  const panelFor = (tab: DemoTab.Tab) =>
    M.value(tab).pipe(
      M.when('Architecture', () => asyncCounterDemoView),
      M.when('Note Player', () => notePlayerDemoView),
      M.exhaustive,
    )

  const demoTabsView = h.submodel({
    slotId: model.demoTabs.id,
    model: model.demoTabs,
    view: DemoTab.DemoTabs.view,
    viewInputs: {
      tabs: DemoTab.all,
      selectedValue: model.activeDemoTab,
      ariaLabel: 'Demo tabs',
      orientation: model.isNarrowViewport ? 'Horizontal' : 'Vertical',
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
    toParentMessage: message => GotDemoTabsMessage({ message }),
  })

  return h.div(
    [h.Class('flex flex-col min-h-screen')],
    [
      skipNavLink,
      landingHeaderView(model, h),
      mobileMenuView(model, h),
      h.main(
        [
          h.Id('main-content'),
          PagefindBody,
          h.Class('flex-1 pt-[var(--header-height)]'),
        ],
        [
          Page.Landing.view(
            model.copiedSnippets,
            demoTabsView,
            emailSignupView,
            playgroundMenu,
            model.aiHeadingToggleCount,
            model.maybeGitHubStarCount,
            h,
          ),
        ],
      ),
      landingFooter(model.currentYear),
    ],
  )
}

export const newsletterView = (model: Model, h: HtmlBuilder<Message>) =>
  h.div(
    [h.Class('flex flex-col min-h-screen')],
    [
      skipNavLink,
      landingHeaderView(model, h),
      mobileMenuView(model, h),
      h.main(
        [
          h.Id('main-content'),
          h.Class(
            'flex-1 flex items-center justify-center px-6 pb-20 pt-[calc(var(--header-height)+5rem)] md:px-12 lg:px-20',
          ),
        ],
        [
          emailSignupContentView(
            model.emailField,
            model.emailSubscriptionStatus,
            h,
          ),
        ],
      ),
      landingFooter(model.currentYear),
    ],
  )
