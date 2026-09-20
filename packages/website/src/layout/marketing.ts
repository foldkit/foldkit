import { type Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'

import { Shared } from '../component'
import { Icon } from '../icon'
import { Link } from '../link'
import { Message } from '../message'
import { type Model } from '../model'
import { getStartedRouter, homeRouter } from '../route'
import { HeaderNav, Search, Sidebar, ThemeSelector } from '../view'

const PagefindBody = ih.DataAttribute('pagefind-body', '')

const headerView = (model: Model, h: HtmlBuilder<Message>) =>
  h.header(
    [
      h.Class(
        'fixed top-0 inset-x-0 z-50 h-[var(--header-height)] pt-[env(safe-area-inset-top,0px)] bg-cream/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 flex items-center justify-between',
      ),
    ],
    [
      h.div(
        [h.Class('flex items-center gap-8 md:gap-12')],
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
              Shared.betaTag,
            ],
          ),
          HeaderNav.view(model.route, 'hidden sm:flex items-center gap-6', h),
        ],
      ),
      h.div(
        [h.Class('flex items-center gap-2')],
        [
          Search.triggerView('hidden lg:flex', h),
          Search.compactTriggerView('hidden sm:inline-flex lg:hidden', h),
          h.div(
            [h.Class('hidden md:flex')],
            [
              ThemeSelector.view(
                model.themeMenu,
                model.maybeThemePreference,
                h,
              ),
            ],
          ),
          Shared.headerGroupDivider('hidden sm:block mx-3'),
          h.a(
            [
              h.Href(getStartedRouter()),
              h.Class(
                'button-accent inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm',
              ),
            ],
            ['Get started', Icon.arrowRight('w-4 h-4')],
          ),
          h.button(
            [
              h.Class(
                'sm:hidden -mr-2 inline-flex size-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:focus-visible:outline-accent-400',
              ),
              h.AriaExpanded(model.mobileMenuDialog.isOpen),
              h.AriaLabel('Toggle menu'),
              h.OnClick(Message.ClickedOpenMobileMenu()),
            ],
            [Icon.menu('w-6 h-6')],
          ),
        ],
      ),
    ],
  )

const footerView = (currentYear: number): Html =>
  ih.footer(
    [
      ih.Class(
        'px-6 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] md:px-12 lg:px-20 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400',
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
              ih.Class('link-accent'),
            ],
            ['Foldkit'],
          ),
          '.',
        ],
      ),
      ih.p([ih.Class('mt-1')], [`© ${currentYear} Devin Jameson`]),
      Shared.siteLinks,
    ],
  )

type ViewOptions = Readonly<{
  content: Html
  mainClassName: string
  isPagefindBody: boolean
}>

export const view = (
  model: Model,
  { content, mainClassName, isPagefindBody }: ViewOptions,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex flex-col min-h-screen')],
    [
      Shared.skipNavLink,
      headerView(model, h),
      Search.dialogView(model, h),
      Sidebar.mobileView(model, h),
      h.main(
        [
          h.Id('main-content'),
          ...(isPagefindBody ? [PagefindBody] : []),
          h.Class(mainClassName),
        ],
        [content],
      ),
      footerView(model.currentYear),
    ],
  )
