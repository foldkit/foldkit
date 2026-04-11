import { clsx } from 'clsx'
import { Array, Function, String as String_, pipe } from 'effect'
import { Html } from 'foldkit/html'
import { foldkitVersion } from 'virtual:landing-data'

import {
  Alt,
  AriaHidden,
  AriaLabel,
  Class,
  DataAttribute,
  Height,
  Href,
  Id,
  InnerHTML,
  Role,
  Src,
  Srcset,
  Width,
  a,
  br,
  div,
  h1,
  h2,
  h3,
  img,
  li,
  p,
  section,
  span,
  ul,
} from '../html'
import { Icon } from '../icon'
import { Link } from '../link'
import { type StatusBanner } from '../message'
import {
  aiOverviewRouter,
  comingFromReactRouter,
  coreArchitectureRouter,
  coreCommandsRouter,
  coreDevtoolsRouter,
  coreSubscriptionsRouter,
  examplesRouter,
  fieldValidationRouter,
  routingAndNavigationRouter,
  testingRouter,
  uiOverviewRouter,
} from '../route'
import * as Snippets from '../snippet'
import {
  type CopiedSnippets,
  codeBlock,
  highlightedCodeBlock,
} from '../view/codeBlock'
import { exampleAppCount } from './examples'

// CONSTANTS

export const HERO_SECTION_ID = 'hero'

const glyph = (symbol: string, offsetY?: string): Html =>
  div(
    [
      Class(
        '-my-[9rem] md:-my-[13.5rem] px-6 md:px-12 lg:px-20 select-none pointer-events-none',
      ),
      AriaHidden(true),
    ],
    [
      div(
        [Class('max-w-6xl mx-auto')],
        [
          span(
            [
              Class(
                clsx(
                  'inline-block -translate-x-1/4 text-accent-200/18 dark:text-accent-400/4 font-mono text-[18rem] md:text-[27rem] font-extrabold leading-none -z-10 relative whitespace-nowrap',
                  offsetY,
                ),
              ),
              DataAttribute('glyph', symbol),
            ],
            [],
          ),
        ],
      ),
    ],
  )

// VIEW

export const view = (
  copiedSnippets: CopiedSnippets,
  demoTabsView: Html,
  emailSignupView: Html,
  aiHeadingToggleCount: number,
  statusBanner: StatusBanner,
): Html =>
  div(
    [Class('isolate overflow-x-hidden')],
    [
      heroSection(copiedSnippets),
      nowStatusBanner(statusBanner),
      glyph('{ }'),
      poweredBySection(),
      glyph('=>'),
      promiseSection(),
      glyph('|>', '-translate-y-1/4'),
      demoSection(demoTabsView),
      glyph('[ ]'),
      includedSection(),
      glyph('::'),
      testingSection(copiedSnippets),
      glyph('??'),
      devtoolsSection(),
      glyph('~~'),
      aiSection(aiHeadingToggleCount),
      glyph('< >'),
      tradeOffsSection(),
      glyph('( )'),
      audienceSection(),
      glyph('...', '-translate-y-1/3'),
      trustSection(),
      glyph('->'),
      finalCtaSection(emailSignupView),
    ],
  )

// HERO

const INSTALL_COMMAND = 'npx create-foldkit-app@latest --wizard'

const heroSection = (copiedSnippets: CopiedSnippets): Html =>
  section(
    [Id(HERO_SECTION_ID), Class('landing-section relative overflow-hidden')],
    [
      div(
        [Class('landing-section-narrow relative')],
        [
          div(
            [Class('flex items-center gap-3 mb-8')],
            [
              img([
                Src('/logo.svg'),
                Alt('Foldkit'),
                Width('801'),
                Height('200'),
                Class('h-10 md:h-12 w-auto dark:invert'),
              ]),
              span(
                [
                  Class(
                    'inline-block -rotate-6 rounded bg-accent-700 dark:bg-accent-500 px-2 py-1 text-xs font-extrabold uppercase leading-none tracking-wider text-white dark:text-accent-900 select-none',
                  ),
                ],
                ['Beta'],
              ),
            ],
          ),
          h1(
            [
              Class(
                'text-5xl md:text-6xl lg:text-7xl font-light text-gray-900 dark:text-white tracking-tight leading-[1.1] text-balance',
              ),
            ],
            [
              'The frontend framework for ',
              span(
                [Class('text-accent-600 dark:text-accent-500')],
                ['correctness'],
              ),
              '.',
            ],
          ),
          p(
            [
              Class(
                'mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed',
              ),
            ],
            [
              'A frontend framework for TypeScript, built on Effect, using The Elm Architecture.',
            ],
          ),
          div(
            [Class('mt-8')],
            [
              codeBlock(
                INSTALL_COMMAND,
                'Copy install command',
                copiedSnippets,
                'max-w-fit [&_pre]:text-xs [&_pre]:md:text-sm',
              ),
            ],
          ),
          div(
            [
              Class(
                'mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4',
              ),
            ],
            [
              a(
                [Href(coreArchitectureRouter()), Class('cta-primary')],
                ['Dive In', Icon.arrowRight('w-5 h-5')],
              ),
              a(
                [Href(Link.github), Class('cta-secondary')],
                [Icon.github('w-5 h-5'), 'View on GitHub'],
              ),
            ],
          ),
        ],
      ),
    ],
  )

// NOW STATUS BANNER

const nowStatusBanner = (banner: StatusBanner): Html =>
  div(
    [Class('px-6 md:px-12 lg:px-20 -mt-2 md:-mt-8')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          a(
            [
              Href(banner.profileUrl),
              AriaLabel(
                `Now: ${banner.message}. Follow ${banner.profileHandle} on X.`,
              ),
              Class(
                'group inline-flex items-center gap-3 max-w-full sm:max-w-2xl rounded-full border border-gray-200 dark:border-gray-800 bg-cream dark:bg-gray-900/60 py-2 pl-2 pr-4 shadow-sm backdrop-blur-sm transition hover:border-accent-600/50 dark:hover:border-accent-500/50 hover:bg-white dark:hover:bg-gray-900',
              ),
            ],
            [
              img([
                Src(banner.avatarUrl),
                Alt(banner.profileHandle),
                Width('40'),
                Height('40'),
                Class(
                  'h-9 w-9 rounded-full shrink-0 ring-1 ring-gray-200 dark:ring-gray-800 object-cover',
                ),
              ]),
              span(
                [
                  AriaHidden(true),
                  Class(
                    'inline-flex items-center gap-1.5 text-[0.625rem] font-mono font-semibold uppercase tracking-wider text-accent-600 dark:text-accent-500 shrink-0',
                  ),
                ],
                [
                  span(
                    [
                      Class(
                        'inline-block h-1.5 w-1.5 rounded-full bg-accent-600 dark:bg-accent-500 animate-pulse',
                      ),
                    ],
                    [],
                  ),
                  'Now',
                ],
              ),
              span(
                [
                  AriaHidden(true),
                  Class(
                    'text-sm text-gray-700 dark:text-gray-200 leading-snug',
                  ),
                ],
                [banner.message],
              ),
              span(
                [
                  AriaHidden(true),
                  Class(
                    'shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-accent-600 dark:group-hover:text-accent-500 transition',
                  ),
                ],
                [Icon.arrowRight('w-4 h-4')],
              ),
            ],
          ),
        ],
      ),
    ],
  )

// POWERED BY

const poweredByItem = (text: string): Html =>
  li(
    [Class('flex items-start gap-3')],
    [
      div(
        [Class('shrink-0 mt-0.5 text-accent-600 dark:text-accent-500')],
        [Icon.check('w-5 h-5')],
      ),
      span([Class('font-normal text-gray-600 dark:text-gray-300')], [text]),
    ],
  )

const poweredBySection = (): Html =>
  section(
    [Id('powered-by-effect'), Class('landing-section py-10 md:py-14')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white text-balance',
              ),
            ],
            [
              'Built on ',
              a(
                [
                  Href(Link.effect),
                  Class(
                    'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-normal',
                  ),
                ],
                ['Effect'],
              ),
              '. Inside and out.',
            ],
          ),
          p(
            [
              Class(
                'mt-4 text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-6 max-w-3xl',
              ),
            ],
            [
              'If you already know Effect, Foldkit feels natural. If you\u2019re new to Effect, Foldkit is a great way to learn it.',
            ],
          ),
          ul(
            [
              Role('list'),
              Class(
                'flex flex-col gap-2 text-lg text-gray-600 dark:text-gray-300 list-none',
              ),
            ],
            [
              poweredByItem('Every Foldkit application is an Effect'),
              poweredByItem('All state is a single Schema'),
              poweredByItem(
                'Side effects are modeled as Effects that never fail',
              ),
            ],
          ),
        ],
      ),
    ],
  )

// THE PROMISE

const pillarCard = (icon: Html, title: string, description: string): Html =>
  div(
    [Class('landing-card')],
    [
      div([Class('mb-3 text-accent-600 dark:text-accent-500')], [icon]),
      h3(
        [Class('text-xl font-normal text-gray-900 dark:text-white mb-2')],
        [title],
      ),
      p(
        [Class('text-gray-600 dark:text-gray-300 leading-relaxed')],
        [description],
      ),
    ],
  )

const promiseSection = (): Html =>
  section(
    [Id('the-promise'), Class('landing-section')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            ['Declare behavior. Ship. Repeat.'],
          ),
          p(
            [
              Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'React, Vue, Svelte, and Solid solve rendering and leave the architecture to you. Foldkit gives you the architecture, so you can focus on your domain.',
            ],
          ),
          div(
            [Class('grid gap-6 md:grid-cols-3')],
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
                'Scales with grace',
                'The architecture scales without complexity creep. A 50-file app follows the same patterns as a 5-file app. New team members read the code and understand it.',
              ),
            ],
          ),
        ],
      ),
    ],
  )

// DEMOS

const demoSection = (demoTabsView: Html): Html =>
  section(
    [Id('peek-inside'), Class('landing-section')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            ['See it work.'],
          ),
          p(
            [
              Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'Watch a message flow through update into the model. The code highlights in real time to show you what\u2019s happening at each step.',
            ],
          ),
          div([Class('demo-viewport-constraint')], [demoTabsView]),
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
  div(
    [Class('landing-card')],
    [
      div([Class('mb-3 text-accent-600 dark:text-accent-500')], [icon]),
      h3(
        [Class('text-xl font-normal text-gray-900 dark:text-white mb-2')],
        [title],
      ),
      p(
        [
          Class(
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
            a(
              [
                Href(link.href),
                Class(
                  'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-normal',
                ),
              ],
              [
                link.label,
                span(
                  [Class('inline-block ml-1')],
                  [Icon.arrowRight('w-3.5 h-3.5 inline')],
                ),
              ],
            ),
          ]
        : []),
    ],
  )

const includedSection = (): Html =>
  section(
    [Id('batteries-included'), Class('landing-section')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            ['Batteries included.'],
          ),
          p(
            [
              Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'Most frameworks ask you to bring your own routing library, state manager, UI kit, and form validator. Foldkit ships them as one coherent system.',
            ],
          ),
          div(
            [Class('grid gap-6 sm:grid-cols-2 lg:grid-cols-3')],
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
              div(
                [Class('landing-card')],
                [
                  div(
                    [Class('mb-3 text-accent-600 dark:text-accent-500')],
                    [Icon.puzzle('w-6 h-6')],
                  ),
                  h3(
                    [
                      Class(
                        'flex items-center text-xl font-normal text-gray-900 dark:text-white mb-2',
                      ),
                    ],
                    ['UI Components'],
                  ),
                  p(
                    [
                      Class(
                        'text-gray-600 dark:text-gray-300 leading-relaxed mb-3',
                      ),
                    ],
                    [
                      'Accessible primitives (dialog, menu, tabs, listbox, disclosure, and more) built for The Elm Architecture. Easy to style and customize.',
                    ],
                  ),
                  a(
                    [
                      Href(uiOverviewRouter()),
                      Class(
                        'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-normal',
                      ),
                    ],
                    [
                      'Browse the components',
                      span(
                        [Class('inline-block ml-1')],
                        [Icon.arrowRight('w-3.5 h-3.5 inline')],
                      ),
                    ],
                  ),
                ],
              ),
              includedFeature(Icon.squareStack('w-6 h-6'), 'Virtual DOM', [
                'Built on ',
                a(
                  [
                    Href(Link.snabbdom),
                    Class(
                      'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-normal',
                    ),
                  ],
                  ['Snabbdom'],
                ),
                '. Fast, keyed diffing with declarative views that are plain functions of your Model.',
              ]),
              includedFeature(
                Icon.signal('w-6 h-6'),
                'Subscriptions',
                [
                  'Declare which streams your app needs as a function of the Model. The runtime diffs and switches them when the Model changes.',
                ],
                {
                  href: coreSubscriptionsRouter(),
                  label: 'Explore Subscriptions',
                },
              ),
              includedFeature(
                Icon.shieldCheck('w-6 h-6'),
                'Field Validation',
                [
                  'Per-field validation with sync and async support. Define rules as predicates, apply them in update, and the Model tracks every field state.',
                ],
                {
                  href: fieldValidationRouter(),
                  label: 'Explore field validation',
                },
              ),
              includedFeature(
                Icon.cog('w-6 h-6'),
                'Commands',
                [
                  'Commands are named Effects that return Messages. Each carries a name for identification in tests and tracing \u2014 you write the Effect, the runtime runs and instruments it.',
                ],
                {
                  href: coreCommandsRouter(),
                  label: 'Explore Commands',
                },
              ),
            ],
          ),
        ],
      ),
    ],
  )

// TESTING

const testingSection = (copiedSnippets: CopiedSnippets): Html =>
  section(
    [Id('testing'), Class('landing-section')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            [
              'Tests that read like ',
              span(
                [Class('text-accent-600 dark:text-accent-500')],
                ['stories and scenes.'],
              ),
            ],
          ),
          p(
            [
              Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'Pure update functions mean pure tests. Story tests the state machine. Scene tests features through the view \u2014 clicking buttons, typing into inputs \u2014 with accessible locators. No DOM, no mocking.',
            ],
          ),
          a(
            [Href(testingRouter()), Class('cta-secondary mb-8')],
            ['Learn about testing', Icon.arrowRight('w-5 h-5')],
          ),
          highlightedCodeBlock(
            div(
              [Class('text-sm'), InnerHTML(Snippets.landingTestHighlighted)],
              [],
            ),
            Snippets.landingTestRaw,
            'Copy test example to clipboard',
            copiedSnippets,
            '',
          ),
        ],
      ),
    ],
  )

// DEVTOOLS

const devtoolsSection = (): Html =>
  section(
    [Id('devtools'), Class('landing-section')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            [
              'Watch your program ',
              span([Class('text-accent-600 dark:text-accent-500')], ['think.']),
            ],
          ),
          p(
            [
              Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4 max-w-3xl',
              ),
            ],
            [
              'When every state change flows through Messages and a single Model, you get DevTools that would be impossible in a mutable-state framework. Every Message is logged. Every Model state is inspectable. Click any row to see exactly what changed.',
            ],
          ),
          p(
            [
              Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'This site runs on Foldkit. Look for the tab on the bottom right of this page to try it live.',
            ],
          ),
          a(
            [Href(coreDevtoolsRouter()), Class('cta-secondary mb-8')],
            ['Learn about DevTools', Icon.arrowRight('w-5 h-5')],
          ),
          div(
            [
              Class(
                'rounded-lg overflow-hidden shadow-xl ring-1 ring-gray-200 dark:ring-gray-700',
              ),
            ],
            [
              img([
                Src('/devtools-overlay.webp'),
                Srcset(
                  '/devtools-overlay-1x.webp 1x, /devtools-overlay.webp 2x',
                ),
                Alt(
                  'Foldkit DevTools overlay inspecting the Foldkit website — a numbered Message timeline on the left with entries like ClickedLink, ChangedUrl, and CompletedScroll, and an expandable Model state tree on the right showing route, url, and theme fields.',
                ),
                Width('972'),
                Height('637'),
                Class('w-full h-auto'),
              ]),
            ],
          ),
        ],
      ),
    ],
  )

// TRADE-OFFS & COMPARISON

const tradeOffsSection = (): Html =>
  section(
    [Id('whats-the-catch'), Class('landing-section')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          div(
            [Class('grid gap-10 md:grid-cols-2')],
            [
              div(
                [],
                [
                  h2(
                    [
                      Class(
                        'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
                      ),
                    ],
                    ['What\u2019s the catch?'],
                  ),
                  p(
                    [
                      Class(
                        'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4',
                      ),
                    ],
                    [
                      'Foldkit asks you to think about frontend development differently. It uses ',
                      a(
                        [
                          Href(Link.elmArchitecture),
                          Class(
                            'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-normal',
                          ),
                        ],
                        ['The Elm Architecture'],
                      ),
                      ', so there are no components, no hooks, no local state. Everything is declarative and structured. You\u2019ll need to shift how you think about state, effects, and views.',
                    ],
                  ),
                  p(
                    [
                      Class(
                        'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8',
                      ),
                    ],
                    [
                      'It\u2019s a discipline. It pays off, but it\u2019s a real ask.',
                    ],
                  ),
                  a(
                    [Href(coreArchitectureRouter()), Class('cta-secondary')],
                    ['See how it works', Icon.arrowRight('w-5 h-5')],
                  ),
                ],
              ),
              div(
                [Id('foldkit-vs-react')],
                [
                  h2(
                    [
                      Class(
                        'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-4 text-balance',
                      ),
                    ],
                    ['How does it compare?'],
                  ),
                  p(
                    [Class('text-lg text-gray-600 dark:text-gray-300 mb-8')],
                    [
                      'Foldkit is a different kind of frontend framework. If you\u2019re weighing it against React, Vue, Svelte, or Solid, the key difference isn\u2019t syntax or performance \u2014 it\u2019s that Foldkit prescribes the architecture instead of leaving it to you.',
                    ],
                  ),
                  a(
                    [Href(comingFromReactRouter()), Class('cta-secondary')],
                    ['Compare to React', Icon.arrowRight('w-5 h-5')],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )

// AUDIENCE

const audienceSection = (): Html =>
  section(
    [Id('who-its-for'), Class('landing-section')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          div(
            [Class('grid gap-8 md:grid-cols-2')],
            [
              div(
                [],
                [
                  h2(
                    [
                      Class(
                        'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-6 text-balance',
                      ),
                    ],
                    ['Who it\u2019s for'],
                  ),
                  ul(
                    [Role('list'), Class('list-none')],
                    [
                      audienceForItem(
                        'Effect developers who need a frontend',
                        'Your backend already uses Effect. Foldkit is the missing frontend piece \u2014 same ecosystem, same patterns, no context switching.',
                      ),
                      audienceForItem(
                        'Developers who value correctness',
                        'You want your architecture to prevent bugs, not just catch them.',
                      ),
                      audienceForItem(
                        'Teams that need to stay aligned',
                        'One pattern for state, effects, and views means less disagreement and faster onboarding.',
                      ),
                      audienceForItem(
                        'Projects with complex state',
                        'Auth flows, real-time data, multi-step forms — the architecture handles complexity without losing clarity.',
                      ),
                    ],
                  ),
                ],
              ),
              div(
                [],
                [
                  h2(
                    [
                      Class(
                        'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-6 text-balance',
                      ),
                    ],
                    ['Who it\u2019s not for'],
                  ),
                  ul(
                    [Role('list'), Class('list-none')],
                    [
                      audienceNotItem(
                        'Large existing React codebases',
                        'Foldkit isn\u2019t an incremental adoption \u2014 it\u2019s a different architecture. Migration means a rewrite.',
                      ),
                      audienceNotItem(
                        'Teams not ready to invest in Effect',
                        'Foldkit leans on pipe, discriminated unions, and Effect throughout. There\u2019s no escape hatch \u2014 you\u2019re all in or you\u2019re not.',
                      ),
                      audienceNotItem(
                        'Projects that need the React ecosystem',
                        'No React component libraries, no Next.js, no existing middleware. You\u2019re building on different foundations.',
                      ),
                      audienceNotItem(
                        'Teams that need server-side rendering',
                        'Foldkit is a client-side SPA framework. Static generation is possible, but you\u2019ll roll your own (like we do for this website).',
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )

const audienceForItem = (title: string, description: string): Html =>
  li(
    [Class('mb-5 flex gap-3')],
    [
      div(
        [Class('shrink-0 mt-0.5 text-accent-600 dark:text-accent-400')],
        [Icon.check('w-5 h-5')],
      ),
      div(
        [],
        [
          h3(
            [Class('text-base font-normal text-gray-900 dark:text-white mb-1')],
            [title],
          ),
          p(
            [Class('text-gray-600 dark:text-gray-300 leading-relaxed')],
            [description],
          ),
        ],
      ),
    ],
  )

const audienceNotItem = (title: string, description: string): Html =>
  li(
    [Class('mb-5 flex gap-3')],
    [
      div(
        [Class('shrink-0 mt-0.5 text-gray-400 dark:text-gray-500')],
        [Icon.close('w-5 h-5')],
      ),
      div(
        [],
        [
          h3(
            [Class('text-base font-normal text-gray-900 dark:text-white mb-1')],
            [title],
          ),
          p(
            [Class('text-gray-600 dark:text-gray-300 leading-relaxed')],
            [description],
          ),
        ],
      ),
    ],
  )

// TRUST & MATURITY

const trustSection = (): Html =>
  section(
    [Id('trust'), Class('landing-section py-10 md:py-14')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-6 text-balance',
              ),
            ],
            ['Proof of life.'],
          ),
          ul(
            [
              Role('list'),
              Class('grid gap-6 sm:grid-cols-2 lg:grid-cols-4 list-none'),
            ],
            [
              trustItem('Version', `v${foldkitVersion}`),
              trustItemWithLink(
                'Example apps',
                String(exampleAppCount),
                examplesRouter(),
              ),
              trustItemWithLink(
                'Production app',
                'Typing Terminal',
                Link.typingTerminal,
              ),
              trustItemWithLink('Changelog', 'View releases', Link.changelog),
            ],
          ),
        ],
      ),
    ],
  )

const trustItem = (label: string, value: string): Html =>
  li(
    [Class('landing-card')],
    [
      p(
        [
          Class(
            'text-xs font-normal text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-1',
          ),
        ],
        [label],
      ),
      p([Class('text-xl font-normal text-gray-900 dark:text-white')], [value]),
    ],
  )

const trustItemWithLink = (
  label: string,
  linkText: string,
  href: string,
): Html =>
  li(
    [Class('landing-card')],
    [
      p(
        [
          Class(
            'text-xs font-normal text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-1',
          ),
        ],
        [label],
      ),
      a(
        [
          Href(href),
          Class(
            'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 text-lg font-normal',
          ),
        ],
        [
          linkText,
          span(
            [Class('inline-block ml-1')],
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

  return h2(
    [
      Class(
        'text-[1.25rem] sm:text-2xl md:text-[2rem] font-normal text-amber-500 dark:text-amber-400 mb-4 font-mono',
      ),
      AriaLabel(isSwapped ? AI_HEADING_B : AI_HEADING_A),
    ],
    pipe(
      AI_HEADING_A,
      String_.length,
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
            ? [' ', br([Class('solari-break')])]
            : [' ']
        }

        if (!isFlipping) {
          return [
            span(
              [
                Class(
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
          span(
            [
              Class(
                clsx('solari-character', {
                  'solari-character-flipped': isSwapped,
                }),
              ),
              AriaHidden(true),
            ],
            [
              span(
                [Class('solari-face solari-face-front')],
                [characterA === ' ' ? '\u00A0' : characterA],
              ),
              span(
                [Class('solari-face solari-face-back')],
                [characterB === ' ' ? '\u00A0' : characterB],
              ),
            ],
          ),
        ]
      }),
    ),
  )
}

const aiSection = (aiHeadingToggleCount: number): Html =>
  section(
    [Id('ai'), Class('landing-section py-10 md:py-14 relative')],
    [
      div(
        [Class('landing-section-narrow relative')],
        [
          solariHeading(aiHeadingToggleCount),
          p(
            [Class('text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl')],
            [
              'Foldkit apps are explicit and predictable. This makes LLMs particularly good at generating Foldkit code. And it makes generated Foldkit code exceptionally easy for humans to review.',
            ],
          ),
          a(
            [Href(aiOverviewRouter()), Class('cta-secondary')],
            ['Set up AI-assisted development', Icon.arrowRight('w-5 h-5')],
          ),
        ],
      ),
    ],
  )

// FINAL CTA

const finalCtaSection = (emailSignupView: Html): Html =>
  section(
    [Id('get-started'), Class('landing-section')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          div(
            [Class('grid gap-10 lg:grid-cols-2')],
            [
              div(
                [],
                [
                  h2(
                    [
                      Class(
                        'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-4 text-balance',
                      ),
                    ],
                    ['Make something correct.'],
                  ),
                  p(
                    [
                      Class(
                        'text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-xl',
                      ),
                    ],
                    ['Describe your app. Let the runtime handle the rest.'],
                  ),
                  div(
                    [
                      Class(
                        'flex flex-col sm:flex-row items-start sm:items-center gap-4',
                      ),
                    ],
                    [
                      a(
                        [Href(coreArchitectureRouter()), Class('cta-primary')],
                        ['Dive In', Icon.arrowRight('w-5 h-5')],
                      ),
                      a(
                        [Href(Link.github), Class('cta-secondary')],
                        [Icon.github('w-5 h-5'), 'View on GitHub'],
                      ),
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
