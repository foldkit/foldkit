import { clsx } from 'clsx'
import { Match as M } from 'effect'
import { Ui } from 'foldkit'
import { Html, createLazy } from 'foldkit/html'

import {
  Alt,
  AriaLabel,
  Class,
  Href,
  Id,
  Src,
  a,
  div,
  footer,
  header,
  img,
  keyed,
  main,
  nav,
  p,
  span,
} from '../html'
import { Icon } from '../icon'
import { Link } from '../link'
import { type Model } from '../main'
import {
  GotAsyncCounterDemoMessage,
  GotDemoTabsMessage,
  GotNotePlayerDemoMessage,
  type Message,
} from '../message'
import * as Page from '../page'
import { coreArchitectureRouter, homeRouter } from '../route'
import {
  betaTag,
  emailSignupContentView,
  iconLink,
  skipNavLink,
} from './shared'
import { themeSelector } from './themeSelector'

// LANDING HEADER

const landingHeaderView = (model: Model) =>
  header(
    [
      Class(
        clsx(
          'fixed top-0 inset-x-0 z-50 h-[var(--header-height)] pt-[env(safe-area-inset-top,0px)] bg-cream/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 md:px-8 flex items-center justify-between transition-transform duration-300',
          {
            '-translate-y-full': !model.isLandingHeaderVisible,
            'translate-y-0': model.isLandingHeaderVisible,
          },
        ),
      ),
    ],
    [
      a(
        [Href(homeRouter()), Class('flex items-center gap-2')],
        [
          img([
            Src('/logo.svg'),
            Alt('Foldkit'),
            Class('h-6 md:h-8 dark:invert'),
          ]),
          betaTag,
        ],
      ),
      nav(
        [AriaLabel('Main'), Class('flex items-center gap-3')],
        [
          div(
            [Class('hidden md:flex items-center gap-3')],
            [
              themeSelector(model.themePreference),
              iconLink(
                Link.discord,
                'Discord',
                Icon.discord('w-5 h-5 md:w-6 md:h-6'),
              ),
            ],
          ),
          a(
            [
              Href(coreArchitectureRouter()),
              Class(
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 text-sm font-normal transition hover:bg-accent-700 dark:hover:bg-accent-600',
              ),
            ],
            ['Dive In', Icon.arrowRight('w-4 h-4')],
          ),
        ],
      ),
    ],
  )

// LANDING FOOTER

const landingFooter = (currentYear: number): Html =>
  footer(
    [
      Class(
        'px-6 py-8 md:px-12 lg:px-20 border-t border-gray-300 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400',
      ),
    ],
    [
      p(
        [Class('mb-4')],
        [
          a(
            [
              Href(Link.discord),
              Class(
                'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500',
              ),
            ],
            ['Join the Discord'],
          ),
        ],
      ),
      p(
        [],
        [
          'Built with ',
          a(
            [
              Href(`${Link.websiteSource}/src/main.ts`),
              Class(
                'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500',
              ),
            ],
            ['Foldkit'],
          ),
          '.',
        ],
      ),
      p([Class('mt-1')], [`\u00A9 ${currentYear} Devin Jameson`]),
    ],
  )

// DEMO TABS

type DemoTab = 'Architecture' | 'Note Player'

const demoTabs: ReadonlyArray<DemoTab> = ['Architecture', 'Note Player']

const demoTabButtonClassName =
  'px-3 py-2 text-sm font-normal cursor-pointer transition border border-gray-300 dark:border-gray-800 bg-cream dark:bg-gray-900 text-gray-500 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-t-lg lg:rounded-t-none lg:rounded-l-lg lg:border-r-0 mb-[-1px] lg:mb-0 lg:mr-[-1px] data-[selected]:relative data-[selected]:z-10 data-[selected]:bg-cream data-[selected]:dark:bg-gray-900 data-[selected]:text-gray-900 data-[selected]:dark:text-white data-[selected]:border-b-0 lg:data-[selected]:border-b lg:data-[selected]:border-r-0'

const demoTabPanelClassName =
  'flex-1 min-w-0 p-4 bg-cream dark:bg-gray-900 rounded-b-lg rounded-tr-lg lg:rounded-bl-lg lg:rounded-r-lg lg:rounded-tl-none border border-gray-300 dark:border-gray-800'

const toAsyncCounterDemoMessage = (
  message: Page.AsyncCounterDemo.Message,
): Message => GotAsyncCounterDemoMessage({ message })

const toNotePlayerDemoMessage = (
  message: Page.NotePlayerDemo.Message,
): Message => GotNotePlayerDemoMessage({ message })

const lazyAsyncCounterDemo = createLazy()
const lazyNotePlayerDemo = createLazy()

// VIEW

export const landingView = (model: Model) => {
  const asyncCounterDemoView = lazyAsyncCounterDemo(
    Page.AsyncCounterDemo.view,
    [model.asyncCounterDemo, toAsyncCounterDemoMessage],
  )

  const notePlayerDemoView = lazyNotePlayerDemo(Page.NotePlayerDemo.view, [
    model.notePlayerDemo,
    toNotePlayerDemoMessage,
  ])

  const emailSignupView = emailSignupContentView(
    model.emailField,
    model.emailSubscriptionStatus,
  )

  const demoTabsView = Ui.Tabs.view<Message, DemoTab>({
    model: model.demoTabs,
    toMessage: message => GotDemoTabsMessage({ message }),
    tabs: demoTabs,
    tabToConfig: tab =>
      M.value(tab).pipe(
        M.when('Architecture', () => ({
          buttonClassName: demoTabButtonClassName,
          buttonContent: span([], ['Async Counter']),
          panelClassName: demoTabPanelClassName,
          panelContent: asyncCounterDemoView,
        })),
        M.when('Note Player', () => ({
          buttonClassName: demoTabButtonClassName,
          buttonContent: span([], ['Note Player']),
          panelClassName: demoTabPanelClassName,
          panelContent: notePlayerDemoView,
        })),
        M.exhaustive,
      ),
    orientation: model.isNarrowViewport ? 'Horizontal' : 'Vertical',
    attributes: [Class('lg:flex')],
    tabListAttributes: [Class('flex lg:flex-col gap-1')],
    tabListAriaLabel: 'Demo tabs',
  })

  return keyed('div')(
    'landing',
    [Class('flex flex-col min-h-screen')],
    [
      skipNavLink,
      landingHeaderView(model),
      main(
        [Id('main-content'), Class('flex-1')],
        [
          Page.Landing.view(
            model.copiedSnippets,
            demoTabsView,
            emailSignupView,
            model.aiHeadingToggleCount,
          ),
        ],
      ),
      landingFooter(model.currentYear),
    ],
  )
}

export const newsletterView = (model: Model) =>
  keyed('div')(
    'newsletter',
    [Class('flex flex-col min-h-screen')],
    [
      skipNavLink,
      landingHeaderView(model),
      main(
        [
          Id('main-content'),
          Class(
            'flex-1 flex items-center justify-center px-6 py-20 md:px-12 lg:px-20',
          ),
        ],
        [
          emailSignupContentView(
            model.emailField,
            model.emailSubscriptionStatus,
          ),
        ],
      ),
      landingFooter(model.currentYear),
    ],
  )
