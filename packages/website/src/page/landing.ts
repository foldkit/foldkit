import { clsx } from 'clsx'
import { Array, Function, Option, Predicate, String, pipe } from 'effect'
import { Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'
import { foldkitVersion } from 'virtual:landing-data'

import { Icon } from '../icon'
import { Link } from '../link'
import { type Message } from '../message'
import {
  aiOverviewRouter,
  comingFromReactRouter,
  coreArchitectureRouter,
  coreEmbeddingRouter,
  coreManagedResourcesRouter,
  coreServerRenderingRouter,
  coreSubmodelRouter,
  devToolsOverviewRouter,
  effectAtomComparisonRouter,
  exampleDetailRouter,
  examplesRouter,
  gettingStartedRouter,
  routingAndNavigationRouter,
  testingRouter,
  typingTerminalRouter,
  uiOverviewRouter,
} from '../route'
import * as Snippet from '../snippet'
import {
  type CopiedSnippets,
  type RenderCopyButton,
  codeBlock,
  defaultRenderCopyButton,
  highlightedCodeBlock,
} from '../view/codeBlock'
import { githubStarBadge } from '../view/shared'
import {
  type ExampleMeta,
  type ExampleSlug,
  examples as exampleMetas,
} from './example/meta'
import { exampleAppCount } from './examples'

// CONSTANTS

export const HERO_SECTION_ID = 'hero'

const glyph = (symbol: string, offsetY?: string): Html =>
  ih.div(
    [
      ih.Class(
        '-my-[9rem] md:-my-[13.5rem] px-6 md:px-12 lg:px-20 select-none pointer-events-none',
      ),
      ih.AriaHidden(true),
    ],
    [
      ih.div(
        [ih.Class('max-w-6xl mx-auto')],
        [
          ih.span([
            ih.Class(
              clsx(
                'inline-block -translate-x-1/4 text-accent-200/18 dark:text-accent-400/4 font-mono text-[18rem] md:text-[27rem] font-extrabold leading-none -z-10 relative whitespace-nowrap',
                offsetY,
              ),
            ),
            ih.DataAttribute('glyph', symbol),
          ]),
        ],
      ),
    ],
  )

// VIEW

export const view = (
  copiedSnippets: CopiedSnippets,
  demoTabsView: Html,
  emailSignupView: Html,
  playgroundMenuView: Html,
  aiHeadingToggleCount: number,
  maybeGitHubStarCount: Option.Option<number>,
  h: HtmlBuilder<Message>,
): Html => {
  const renderCopyButton = defaultRenderCopyButton(copiedSnippets, h)

  return h.div(
    [h.Class('isolate overflow-x-hidden')],
    [
      heroSection(
        renderCopyButton,
        playgroundMenuView,
        maybeGitHubStarCount,
        h,
      ),
      glyph('{ }'),
      demoSection(demoTabsView),
      glyph('=>'),
      promiseSection(),
      glyph('|>', '-translate-y-1/4'),
      poweredBySection(),
      glyph('( )'),
      fitSection(),
      glyph('...', '-translate-y-1/3'),
      trustSection(),
      glyph('[ ]'),
      includedSection(),
      glyph('*'),
      examplesSection,
      glyph('::'),
      testingSection(renderCopyButton),
      glyph('??'),
      devToolsSection(),
      glyph('~~'),
      aiSection(aiHeadingToggleCount),
      glyph('->'),
      finalCtaSection(emailSignupView, maybeGitHubStarCount),
    ],
  )
}

const viewOnGitHubButton = (
  maybeGitHubStarCount: Option.Option<number>,
): Html =>
  ih.a(
    [ih.Href(Link.github), ih.Class('cta-secondary')],
    [
      Icon.github('w-5 h-5'),
      ih.span([ih.Class('mr-2')], ['View on GitHub']),
      githubStarBadge(maybeGitHubStarCount),
    ],
  )

// HERO

const INSTALL_COMMAND = 'npx create-foldkit-app@latest'

const heroProjectLink = (
  href: string,
  label: string,
  icon: Html,
  trailingContent: ReadonlyArray<Html> = [],
): Html =>
  ih.a(
    [
      ih.Href(href),
      ih.Class(
        'inline-flex items-center gap-1.5 rounded-sm text-sm font-normal text-gray-600 dark:text-gray-300 transition-colors hover:text-gray-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950',
      ),
    ],
    [icon, ih.span([], [label]), ...trailingContent],
  )

const heroProjectLinks = (maybeGitHubStarCount: Option.Option<number>): Html =>
  ih.nav(
    [
      ih.AriaLabel('Project links'),
      ih.Class('mt-5 flex flex-wrap items-center gap-x-5 gap-y-3'),
    ],
    [
      heroProjectLink(Link.github, 'GitHub', Icon.github('w-4 h-4'), [
        githubStarBadge(maybeGitHubStarCount),
      ]),
      heroProjectLink(Link.xSocial, 'X', Icon.xSocial('w-4 h-4')),
      heroProjectLink(Link.discord, 'Discord', Icon.discord('w-4 h-4')),
      heroProjectLink(Link.npm, 'npm', Icon.npm('w-5 h-5')),
    ],
  )

const heroSection = (
  renderCopyButton: RenderCopyButton,
  playgroundMenuView: Html,
  maybeGitHubStarCount: Option.Option<number>,
  h: HtmlBuilder<Message>,
): Html => {
  return h.section(
    [
      h.Id(HERO_SECTION_ID),
      h.AriaLabel('Hero'),
      h.Class('landing-section relative overflow-hidden'),
    ],
    [
      h.div(
        [h.Class('landing-section-narrow relative')],
        [
          h.div(
            [h.Class('flex items-center gap-3 mb-8')],
            [
              h.img([
                h.Src('/logo.svg'),
                h.Alt('Foldkit'),
                h.Width('801'),
                h.Height('200'),
                h.Class('h-10 md:h-12 w-auto dark:invert'),
              ]),
              h.span(
                [
                  h.Class(
                    'inline-block -rotate-6 rounded bg-accent-700 dark:bg-accent-500 px-2 py-1 text-xs font-extrabold uppercase leading-none tracking-wider text-white dark:text-accent-900 select-none',
                  ),
                ],
                ['Beta'],
              ),
            ],
          ),
          h.h1(
            [
              h.Class(
                'text-5xl md:text-6xl lg:text-7xl font-light text-gray-900 dark:text-white tracking-tight leading-[1.1] text-balance',
              ),
            ],
            [
              'The frontend framework for ',
              h.span(
                [h.Class('text-accent-600 dark:text-accent-500')],
                ['correctness'],
              ),
              '.',
            ],
          ),
          h.p(
            [
              h.Class(
                'mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed',
              ),
            ],
            [
              'Bring Effect’s explicitness to your frontend. Foldkit gives your entire application one architecture with an idiomatic place for every behavior.',
            ],
          ),
          h.div(
            [h.Class('mt-8')],
            [
              codeBlock(
                INSTALL_COMMAND,
                'Copy install command',
                renderCopyButton,
                'max-w-fit [&_pre]:text-xs [&_pre]:md:text-sm',
              ),
            ],
          ),
          h.div(
            [h.Class('mt-8 flex flex-col sm:flex-row items-start gap-4')],
            [
              playgroundMenuView,
              h.a(
                [h.Href(coreArchitectureRouter()), h.Class('cta-secondary')],
                ['Learn the architecture', Icon.arrowRight('w-5 h-5')],
              ),
            ],
          ),
          heroProjectLinks(maybeGitHubStarCount),
        ],
      ),
    ],
  )
}

// POWERED BY

const poweredByItem = (text: string): Html =>
  ih.li(
    [ih.Class('flex items-start gap-3')],
    [
      ih.div(
        [ih.Class('shrink-0 mt-0.5 text-accent-600 dark:text-accent-500')],
        [Icon.check('w-5 h-5')],
      ),
      ih.span(
        [ih.Class('font-normal text-gray-600 dark:text-gray-300')],
        [text],
      ),
    ],
  )

const poweredBySection = (): Html =>
  ih.section(
    [ih.Id('powered-by-effect'), ih.Class('landing-section py-10 md:py-14')],
    [
      ih.div(
        [ih.Class('landing-section-narrow')],
        [
          ih.h2(
            [
              ih.Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white text-balance',
              ),
            ],
            [
              'Built on ',
              ih.a(
                [ih.Href(Link.effect), ih.Class('link-accent font-normal')],
                ['Effect'],
              ),
              '. Inside and out.',
            ],
          ),
          ih.p(
            [
              ih.Class(
                'mt-4 text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-6 max-w-3xl',
              ),
            ],
            [
              'If your backend already uses Effect, Foldkit carries the same tools and patterns into the browser. If Effect is new to your team, it is part of the learning curve.',
            ],
          ),
          ih.ul(
            [
              ih.Role('list'),
              ih.Class(
                'flex flex-col gap-2 text-lg text-gray-600 dark:text-gray-300 list-none',
              ),
            ],
            [
              poweredByItem('Every Foldkit application is an Effect'),
              poweredByItem('The entire Model is defined by Schema'),
              poweredByItem(
                'Commands use Effect for services, interruption, resources, and concurrency',
              ),
            ],
          ),
        ],
      ),
    ],
  )

// THE PROMISE

const pillarCard = (icon: Html, title: string, description: string): Html =>
  ih.div(
    [ih.Class('landing-card')],
    [
      ih.div([ih.Class('mb-3 text-accent-600 dark:text-accent-500')], [icon]),
      ih.h3(
        [ih.Class('text-xl font-normal text-gray-900 dark:text-white mb-2')],
        [title],
      ),
      ih.p(
        [ih.Class('text-gray-600 dark:text-gray-300 leading-relaxed')],
        [description],
      ),
    ],
  )

const promiseSection = (): Html =>
  ih.section(
    [ih.Id('the-promise'), ih.Class('landing-section')],
    [
      ih.div(
        [ih.Class('landing-section-narrow')],
        [
          ih.h2(
            [
              ih.Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            ['Declare behavior. Ship. Repeat.'],
          ),
          ih.p(
            [
              ih.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'React, Vue, Svelte, and Solid solve rendering and leave the architecture to you. Foldkit gives you the architecture, so you can focus on your domain.',
            ],
          ),
          ih.div(
            [ih.Class('grid gap-6 md:grid-cols-3')],
            [
              pillarCard(
                Icon.lockClosed('w-6 h-6'),
                'Predictable state',
                'One immutable model holds your entire application state. Every change flows through a single update function. No hidden mutations, no stale closures, no surprises.',
              ),
              pillarCard(
                Icon.bolt('w-6 h-6'),
                'Explicit effects',
                'Side effects are values you return from update, not imperative calls buried in handlers. Commands describe what should happen. The runtime handles when and how.',
              ),
              pillarCard(
                Icon.arrowsPointingOut('w-6 h-6'),
                'Shared structure',
                'A 50-file application uses the same Model, Message, update, and Command structure as a 5-file application. New work has a known place, and reviews start from shared conventions.',
              ),
            ],
          ),
        ],
      ),
    ],
  )

// DEMOS

const demoSection = (demoTabsView: Html): Html =>
  ih.section(
    [ih.Id('peek-inside'), ih.Class('landing-section')],
    [
      ih.div(
        [ih.Class('landing-section-narrow')],
        [
          ih.h2(
            [
              ih.Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            ['See it work.'],
          ),
          ih.p(
            [
              ih.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'Watch a message flow through update into the model. The code highlights in real time to show you what’s happening at each step.',
            ],
          ),
          ih.div([ih.Class('demo-viewport-constraint')], [demoTabsView]),
        ],
      ),
    ],
  )

// WHAT'S INCLUDED

const includedFeature = (
  icon: Html,
  title: string,
  description: ReadonlyArray<string | Html>,
  link?: Readonly<{ href: string; label: string }>,
): Html =>
  ih.div(
    [ih.Class('landing-card')],
    [
      ih.div([ih.Class('mb-3 text-accent-600 dark:text-accent-500')], [icon]),
      ih.h3(
        [ih.Class('text-xl font-normal text-gray-900 dark:text-white mb-2')],
        [title],
      ),
      ih.p(
        [
          ih.Class(
            clsx(
              'text-gray-600 dark:text-gray-300 leading-relaxed',
              link && 'mb-3',
            ),
          ),
        ],
        description,
      ),
      ...(link
        ? [
            ih.a(
              [ih.Href(link.href), ih.Class('link-accent font-normal')],
              [
                link.label,
                ih.span(
                  [ih.Class('inline-block ml-1')],
                  [Icon.arrowRight('w-3.5 h-3.5 inline')],
                ),
              ],
            ),
          ]
        : []),
    ],
  )

const includedSection = (): Html =>
  ih.section(
    [ih.Id('batteries-included'), ih.Class('landing-section')],
    [
      ih.div(
        [ih.Class('landing-section-narrow')],
        [
          ih.h2(
            [
              ih.Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            ['Batteries included.'],
          ),
          ih.p(
            [
              ih.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'Routing, server rendering, UI components, composition, and browser lifecycles all use the same Model and Message flow.',
            ],
          ),
          ih.div(
            [ih.Class('grid gap-6 sm:grid-cols-2 lg:grid-cols-3')],
            [
              includedFeature(
                Icon.route('w-6 h-6'),
                'Routing',
                [
                  'Type-safe bidirectional routing. URLs parse into typed routes and routes build back into URLs. No string matching, no mismatches between parsing and building.',
                ],
                {
                  href: routingAndNavigationRouter(),
                  label: 'Explore routing',
                },
              ),
              includedFeature(
                Icon.server('w-6 h-6'),
                'Server Rendering',
                [
                  'One rendering pipeline: generate static HTML during the build, or render each request on a server. The same init, view, and Model run on both sides, and the browser hydrates the served HTML in place.',
                ],
                {
                  href: coreServerRenderingRouter(),
                  label: 'Explore server rendering',
                },
              ),
              includedFeature(
                Icon.puzzle('w-6 h-6'),
                'UI Components',
                [
                  'Accessible dialogs, menus, tabs, listboxes, disclosures, and more. Each stateful component follows The Elm Architecture and stays open to styling and composition.',
                ],
                {
                  href: uiOverviewRouter(),
                  label: 'Browse the components',
                },
              ),
              includedFeature(
                Icon.squareStack('w-6 h-6'),
                'Submodels',
                [
                  'A self-contained Model, Messages, update, and view, embedded inside a larger program. Children surface domain facts as typed OutMessages and parents handle them in update. Every stateful Foldkit UI component ships as a Submodel.',
                ],
                {
                  href: coreSubmodelRouter(),
                  label: 'Explore Submodels',
                },
              ),
              includedFeature(
                Icon.signal('w-6 h-6'),
                'Browser Lifecycles',
                [
                  'Subscriptions open scoped event streams while a Model condition holds. Managed Resources acquire stateful handles like WebSockets and AudioContext. The runtime closes both when the Model no longer needs them.',
                ],
                {
                  href: coreManagedResourcesRouter(),
                  label: 'Explore browser lifecycles',
                },
              ),
              includedFeature(
                Icon.codeBracket('w-6 h-6'),
                'Embedding',
                [
                  'Run a Foldkit widget inside any host application with Runtime.embed. The host pushes data in and receives values out through Schema-typed Ports, and tears the widget down with dispose.',
                ],
                {
                  href: coreEmbeddingRouter(),
                  label: 'Explore embedding',
                },
              ),
            ],
          ),
        ],
      ),
    ],
  )

// EXAMPLES

const featuredExampleSlugs: ReadonlyArray<ExampleSlug> = [
  'generative-art',
  'state-machine',
  'pixel-art',
  'websocket-chat',
  'kanban',
  'map',
  'snake',
  'ui-showcase',
  'job-application',
  'charting',
]

const isFeaturedExample = (example: ExampleMeta): boolean =>
  Array.contains(featuredExampleSlugs, example.slug)

const landingExampleMetas = Array.appendAll(
  Array.flatMap(featuredExampleSlugs, featuredExampleSlug =>
    Array.filter(exampleMetas, example => example.slug === featuredExampleSlug),
  ),
  Array.filter(exampleMetas, Predicate.not(isFeaturedExample)),
)

const exampleTile = (key: string, title: string, href: string): Html =>
  ih.keyed('li')(
    key,
    [ih.Class('min-w-0')],
    [
      ih.a(
        [
          ih.Href(href),
          ih.Class(
            'group flex min-h-20 md:min-h-24 h-full items-center justify-between gap-3 px-3 py-4 md:px-4 rounded-lg bg-gray-900/4 dark:bg-white/4 text-gray-900 dark:text-white transition-colors hover:bg-accent-200/40 dark:hover:bg-accent-400/12 focus-visible:outline-none focus-visible:bg-accent-200/40 dark:focus-visible:bg-accent-400/12',
          ),
        ],
        [
          ih.h3(
            [ih.Class('text-sm sm:text-base font-normal leading-tight')],
            [title],
          ),
          ih.span(
            [
              ih.AriaHidden(true),
              ih.Class(
                'shrink-0 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0',
              ),
            ],
            [Icon.arrowRight('w-4 h-4')],
          ),
        ],
      ),
    ],
  )

const exampleMetaTile = (example: ExampleMeta): Html =>
  exampleTile(
    example.slug,
    example.title,
    exampleDetailRouter({ exampleSlug: example.slug }),
  )

const exampleCatalogTile: Html = ih.keyed('li')(
  'example-catalog',
  [ih.Class('col-span-2 sm:col-span-2 lg:col-span-1')],
  [
    ih.a(
      [
        ih.Href(examplesRouter()),
        ih.Class(
          'group flex min-h-20 md:min-h-24 h-full items-center justify-between gap-3 px-3 py-4 md:px-4 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 transition-colors hover:bg-accent-900 dark:hover:bg-accent-100 focus-visible:outline-none focus-visible:bg-accent-900 dark:focus-visible:bg-accent-100',
        ),
      ],
      [
        ih.span(
          [ih.Class('text-sm sm:text-base font-normal leading-tight')],
          ['Explore the catalog'],
        ),
        ih.span(
          [
            ih.AriaHidden(true),
            ih.Class(
              'shrink-0 transition-transform group-hover:translate-x-1 group-focus-visible:translate-x-1',
            ),
          ],
          [Icon.arrowRight('w-4 h-4')],
        ),
      ],
    ),
  ],
)

const examplesSection: Html = ih.section(
  [ih.Id('examples'), ih.Class('landing-section')],
  [
    ih.div(
      [ih.Class('landing-section-narrow')],
      [
        ih.h2(
          [
            ih.Class(
              'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
            ),
          ],
          ['Example applications.'],
        ),
        ih.p(
          [
            ih.Class(
              'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
            ),
          ],
          [
            'One architecture, many kinds of software. Open any example to run it, see how it is modeled, and read the source.',
          ],
        ),
        ih.ul(
          [
            ih.Role('list'),
            ih.Class(
              'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 list-none',
            ),
          ],
          [
            ...Array.map(landingExampleMetas, exampleMetaTile),
            exampleTile(
              'typing-terminal',
              'Typing Terminal',
              typingTerminalRouter(),
            ),
            exampleCatalogTile,
          ],
        ),
      ],
    ),
  ],
)

// TESTING

const testingSection = (renderCopyButton: RenderCopyButton): Html =>
  ih.section(
    [ih.Id('testing'), ih.Class('landing-section')],
    [
      ih.div(
        [ih.Class('landing-section-narrow')],
        [
          ih.h2(
            [
              ih.Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            [
              'Tests that read like ',
              ih.span(
                [ih.Class('text-accent-600 dark:text-accent-500')],
                ['stories and scenes.'],
              ),
            ],
          ),
          ih.p(
            [
              ih.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'Pure update functions mean pure tests. Story tests the state machine. Scene tests features through the view (clicking buttons, typing into inputs) with accessible locators. No DOM, no mocking.',
            ],
          ),
          ih.a(
            [ih.Href(testingRouter()), ih.Class('cta-secondary mb-8')],
            ['Learn about testing', Icon.arrowRight('w-5 h-5')],
          ),
          highlightedCodeBlock(
            ih.div([
              ih.Class('text-sm'),
              ih.InnerHTML(Snippet.landingStoryTestHighlighted),
            ]),
            Snippet.landingStoryTestRaw,
            'Copy Story test example to clipboard',
            renderCopyButton,
            '',
          ),
          highlightedCodeBlock(
            ih.div([
              ih.Class('text-sm'),
              ih.InnerHTML(Snippet.landingSceneTestHighlighted),
            ]),
            Snippet.landingSceneTestRaw,
            'Copy Scene test example to clipboard',
            renderCopyButton,
            '',
          ),
        ],
      ),
    ],
  )

// DEVTOOLS

const devToolsSection = (): Html =>
  ih.section(
    [ih.Id('devtools'), ih.Class('landing-section')],
    [
      ih.div(
        [ih.Class('landing-section-narrow')],
        [
          ih.h2(
            [
              ih.Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            [
              'Watch your program ',
              ih.span(
                [ih.Class('text-accent-600 dark:text-accent-500')],
                ['think.'],
              ),
            ],
          ),
          ih.p(
            [
              ih.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4 max-w-3xl',
              ),
            ],
            [
              'When every state change flows through Messages and one Model, DevTools can show the full history of the program. Every Message is logged. Every Model state is inspectable. Select any row to see what changed, then rewind the UI to that state.',
            ],
          ),
          ih.p(
            [
              ih.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4 max-w-3xl',
              ),
            ],
            [
              'The same runtime data is available to AI agents over MCP. They can inspect the current Model, walk Message history, rewind the UI to past states, and dispatch Messages.',
            ],
          ),
          ih.p(
            [
              ih.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'This site runs on Foldkit. Look for the tab on the bottom right of this page to try DevTools live.',
            ],
          ),
          ih.a(
            [ih.Href(devToolsOverviewRouter()), ih.Class('cta-secondary mb-8')],
            ['Learn about DevTools', Icon.arrowRight('w-5 h-5')],
          ),
          ih.div(
            [
              ih.Class(
                'rounded-lg overflow-hidden shadow-xl ring-1 ring-gray-200 dark:ring-gray-700',
              ),
            ],
            [
              ih.img([
                ih.Src('/devtools-overlay.webp'),
                ih.Srcset(
                  '/devtools-overlay-1x.webp 1x, /devtools-overlay.webp 2x',
                ),
                ih.Alt(
                  'Foldkit DevTools overlay inspecting the Foldkit website: a numbered Message timeline on the left with entries like ClickedLink, ChangedUrl, and CompletedScrollToTop, and an expandable Model state tree on the right showing route, url, and theme fields.',
                ),
                ih.Width('972'),
                ih.Height('637'),
                ih.Class('w-full h-auto'),
              ]),
            ],
          ),
        ],
      ),
    ],
  )

// FIT

const fitSection = (): Html =>
  ih.section(
    [ih.Id('who-its-for'), ih.Class('landing-section')],
    [
      ih.div(
        [ih.Class('landing-section-narrow')],
        [
          ih.span([ih.Id('whats-the-catch')]),
          ih.h2(
            [
              ih.Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            ['Architectural fit.'],
          ),
          ih.p(
            [
              ih.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4 max-w-3xl',
              ),
            ],
            [
              'Foldkit uses ',
              ih.a(
                [
                  ih.Href(Link.elmArchitecture),
                  ih.Class('link-accent font-normal'),
                ],
                ['The Elm Architecture'],
              ),
              '. Application state does not live in component instances or hook lifecycles. The Model is the single source of truth, and every transition stays visible in update.',
            ],
          ),
          ih.p(
            [
              ih.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'That discipline is a real commitment. Foldkit works best when the team wants one architecture across the application and is ready to build on Effect throughout.',
            ],
          ),
          ih.div(
            [ih.Class('grid gap-8 md:grid-cols-2')],
            [
              ih.div(
                [],
                [
                  ih.h3(
                    [
                      ih.Class(
                        'text-2xl font-normal text-gray-900 dark:text-white mb-6 text-balance',
                      ),
                    ],
                    ['A strong fit'],
                  ),
                  ih.ul(
                    [ih.Role('list'), ih.Class('list-none')],
                    [
                      audienceForItem(
                        'Effect developers who need a frontend',
                        'Your backend already uses Effect. Foldkit carries Schema, services, Streams, and scoped resources into frontend architecture.',
                      ),
                      audienceForItem(
                        'Applications with complex state',
                        'Auth flows, real-time data, and multi-step forms become explicit states and transitions instead of effects and refs spread across the tree.',
                      ),
                      audienceForItem(
                        'Teams that want shared conventions',
                        'One pattern for state, effects, and views gives features a known shape and reviews a common vocabulary.',
                      ),
                    ],
                  ),
                ],
              ),
              ih.div(
                [],
                [
                  ih.h3(
                    [
                      ih.Class(
                        'text-2xl font-normal text-gray-900 dark:text-white mb-6 text-balance',
                      ),
                    ],
                    ['Think twice when'],
                  ),
                  ih.ul(
                    [ih.Role('list'), ih.Class('list-none')],
                    [
                      audienceNotItem(
                        'Large existing React codebases',
                        'Foldkit isn’t an incremental adoption. It’s a different architecture, and migrating means a rewrite. The middle path is embedding: Runtime.embed runs a Foldkit widget inside an existing app.',
                      ),
                      audienceNotItem(
                        'Projects that need the React ecosystem',
                        'The application depends on React component libraries, Next.js, or middleware built for that stack. Foldkit uses different foundations.',
                      ),
                      audienceNotItem(
                        'Sites that are mostly static content',
                        'A site that is mostly prose with a sprinkle of interactivity is better served by a content-first tool like Astro. Foldkit renders on the server too, but it is built for applications.',
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          ih.div(
            [
              ih.Id('foldkit-vs-react'),
              ih.Class('mt-8 flex flex-col sm:flex-row items-start gap-4'),
            ],
            [
              ih.a(
                [ih.Href(comingFromReactRouter()), ih.Class('cta-secondary')],
                ['Compare with React', Icon.arrowRight('w-5 h-5')],
              ),
              ih.a(
                [
                  ih.Href(effectAtomComparisonRouter()),
                  ih.Class('cta-secondary'),
                ],
                [
                  'Compare with React + Effect Atom',
                  Icon.arrowRight('w-5 h-5'),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )

const audienceForItem = (title: string, description: string): Html =>
  ih.li(
    [ih.Class('mb-5 flex gap-3')],
    [
      ih.div(
        [ih.Class('shrink-0 mt-0.5 text-accent-600 dark:text-accent-400')],
        [Icon.check('w-5 h-5')],
      ),
      ih.div(
        [],
        [
          ih.h3(
            [
              ih.Class(
                'text-base font-normal text-gray-900 dark:text-white mb-1',
              ),
            ],
            [title],
          ),
          ih.p(
            [ih.Class('text-gray-600 dark:text-gray-300 leading-relaxed')],
            [description],
          ),
        ],
      ),
    ],
  )

const audienceNotItem = (title: string, description: string): Html =>
  ih.li(
    [ih.Class('mb-5 flex gap-3')],
    [
      ih.div(
        [ih.Class('shrink-0 mt-0.5 text-gray-400 dark:text-gray-500')],
        [Icon.close('w-5 h-5')],
      ),
      ih.div(
        [],
        [
          ih.h3(
            [
              ih.Class(
                'text-base font-normal text-gray-900 dark:text-white mb-1',
              ),
            ],
            [title],
          ),
          ih.p(
            [ih.Class('text-gray-600 dark:text-gray-300 leading-relaxed')],
            [description],
          ),
        ],
      ),
    ],
  )

// TRUST & MATURITY

const trustSection = (): Html =>
  ih.section(
    [ih.Id('trust'), ih.Class('landing-section py-10 md:py-14')],
    [
      ih.div(
        [ih.Class('landing-section-narrow')],
        [
          ih.h2(
            [
              ih.Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            ['Project status.'],
          ),
          ih.p(
            [
              ih.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'Foldkit is in beta and under active development. The links below show the current version and what is ready to use today.',
            ],
          ),
          ih.ul(
            [
              ih.Role('list'),
              ih.Class('grid gap-6 sm:grid-cols-2 lg:grid-cols-4 list-none'),
            ],
            [
              trustItem('Version', `v${foldkitVersion}`),
              trustItemWithLink(
                'Example apps',
                globalThis.String(exampleAppCount),
                examplesRouter(),
              ),
              trustItemWithLink(
                'Production app',
                'Typing Terminal',
                typingTerminalRouter(),
              ),
              trustItemWithLink('Changelog', 'View releases', Link.changelog),
            ],
          ),
        ],
      ),
    ],
  )

const trustItem = (label: string, value: string): Html =>
  ih.li(
    [ih.Class('landing-card')],
    [
      ih.p(
        [
          ih.Class(
            'text-xs font-normal text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-1',
          ),
        ],
        [label],
      ),
      ih.p(
        [ih.Class('text-xl font-normal text-gray-900 dark:text-white')],
        [value],
      ),
    ],
  )

const trustItemWithLink = (
  label: string,
  linkText: string,
  href: string,
): Html =>
  ih.li(
    [ih.Class('landing-card')],
    [
      ih.p(
        [
          ih.Class(
            'text-xs font-normal text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-1',
          ),
        ],
        [label],
      ),
      ih.a(
        [ih.Href(href), ih.Class('link-accent text-lg font-normal')],
        [
          linkText,
          ih.span(
            [ih.Class('inline-block ml-1')],
            [Icon.arrowRight('w-4 h-4 inline')],
          ),
        ],
      ),
    ],
  )

// AI

const AI_HEADING_A = 'Built for humans. Readable by AI.'
const AI_HEADING_B = 'Built for AI. Readable by humans.'
const STATIC_PREFIX_LENGTH = 10

const solariHeading = (toggleCount: number): Html => {
  const isSwapped = toggleCount % 2 === 1

  return ih.h2(
    [
      ih.Class(
        'text-[1.25rem] sm:text-2xl md:text-[2rem] font-normal text-amber-500 dark:text-amber-400 mb-4 font-mono',
      ),
      ih.AriaLabel(isSwapped ? AI_HEADING_B : AI_HEADING_A),
    ],
    pipe(
      AI_HEADING_A,
      String.length,
      Array.makeBy(Function.identity),
      Array.flatMap((characterIndex): ReadonlyArray<Html | string> => {
        const characterA = AI_HEADING_A[characterIndex]!
        const characterB = AI_HEADING_B[characterIndex]!
        const lastCharacterIndex = AI_HEADING_A.length - 1
        const isStatic =
          characterIndex < STATIC_PREFIX_LENGTH ||
          characterIndex === lastCharacterIndex
        const isFlipping = !isStatic && characterA !== characterB
        const isLineBreakPosition = characterIndex === STATIC_PREFIX_LENGTH - 1

        if (isStatic && characterA === ' ') {
          return isLineBreakPosition
            ? [' ', ih.br([ih.Class('solari-break')])]
            : [' ']
        }

        if (!isFlipping) {
          return [
            ih.span(
              [
                ih.Class(
                  clsx(
                    'solari-character-static',
                    isStatic
                      ? 'text-gray-900 dark:text-white'
                      : 'text-amber-500 dark:text-amber-400',
                  ),
                ),
              ],
              [characterA],
            ),
          ]
        }

        return [
          ih.span(
            [
              ih.Class(
                clsx('solari-character', {
                  'solari-character-flipped': isSwapped,
                }),
              ),
              ih.AriaHidden(true),
            ],
            [
              ih.span(
                [ih.Class('solari-face solari-face-front')],
                [characterA === ' ' ? ' ' : characterA],
              ),
              ih.span(
                [ih.Class('solari-face solari-face-back')],
                [characterB === ' ' ? ' ' : characterB],
              ),
            ],
          ),
        ]
      }),
    ),
  )
}

const aiSection = (aiHeadingToggleCount: number): Html =>
  ih.section(
    [ih.Id('ai'), ih.Class('landing-section py-10 md:py-14 relative')],
    [
      ih.div(
        [ih.Class('landing-section-narrow relative')],
        [
          solariHeading(aiHeadingToggleCount),
          ih.p(
            [
              ih.Class(
                'text-lg text-gray-600 dark:text-gray-300 mb-4 max-w-2xl',
              ),
            ],
            [
              'Every feature has the same visible structure: a Schema-defined Model, fact-named Messages, exhaustive update, and explicit Commands. AI-generated changes follow code paths a person can inspect and test.',
            ],
          ),
          ih.p(
            [
              ih.Class(
                'text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl',
              ),
            ],
            [
              'AI agents can also connect directly to a running Foldkit app over the Model Context Protocol. They read the current Model, inspect Message history, rewind the UI to past states, and dispatch Messages.',
            ],
          ),
          ih.a(
            [ih.Href(aiOverviewRouter()), ih.Class('cta-secondary')],
            ['Set up AI-assisted development', Icon.arrowRight('w-5 h-5')],
          ),
        ],
      ),
    ],
  )

// FINAL CTA

const finalCtaSection = (
  emailSignupView: Html,
  maybeGitHubStarCount: Option.Option<number>,
): Html =>
  ih.section(
    [ih.Id('get-started'), ih.Class('landing-section')],
    [
      ih.div(
        [ih.Class('landing-section-narrow')],
        [
          ih.div(
            [ih.Class('grid gap-10 lg:grid-cols-2')],
            [
              ih.div(
                [],
                [
                  ih.h2(
                    [
                      ih.Class(
                        'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-4 text-balance',
                      ),
                    ],
                    ['Start building.'],
                  ),
                  ih.p(
                    [
                      ih.Class(
                        'text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-xl',
                      ),
                    ],
                    [
                      'Scaffold an application, define the Model, and make the first state transition explicit.',
                    ],
                  ),
                  ih.div(
                    [
                      ih.Class(
                        'flex flex-col sm:flex-row items-start sm:items-center gap-4',
                      ),
                    ],
                    [
                      ih.a(
                        [
                          ih.Href(gettingStartedRouter()),
                          ih.Class('cta-primary'),
                        ],
                        ['Get started', Icon.arrowRight('w-5 h-5')],
                      ),
                      viewOnGitHubButton(maybeGitHubStarCount),
                    ],
                  ),
                ],
              ),
              emailSignupView,
            ],
          ),
        ],
      ),
    ],
  )
