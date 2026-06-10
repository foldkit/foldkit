import { clsx } from 'clsx'
import {
  Array,
  Effect,
  Function,
  Option,
  Queue,
  Schema as S,
  Stream,
  String as String_,
  pipe,
} from 'effect'
import { Mount } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { foldkitVersion } from 'virtual:landing-data'

import { Icon } from '../icon'
import { Link } from '../link'
import { type Message } from '../message'
import {
  aiOverviewRouter,
  comingFromReactRouter,
  coreArchitectureRouter,
  coreDevToolsRouter,
  coreEmbeddingRouter,
  coreManagedResourcesRouter,
  coreSubmodelRouter,
  coreSubscriptionsRouter,
  examplesRouter,
  fieldValidationRouter,
  routingAndNavigationRouter,
  testingRouter,
  typingTerminalRouter,
  uiOverviewRouter,
} from '../route'
import * as Snippets from '../snippet'
import {
  type CopiedSnippets,
  codeBlock,
  highlightedCodeBlock,
} from '../view/codeBlock'
import { githubStarBadge } from '../view/shared'
import { exampleAppCount } from './examples'

// CONSTANTS

export const HERO_SECTION_ID = 'hero'

const glyph = (symbol: string, offsetY?: string): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        '-my-[9rem] md:-my-[13.5rem] px-6 md:px-12 lg:px-20 select-none pointer-events-none',
      ),
      h.AriaHidden(true),
    ],
    [
      h.div(
        [h.Class('max-w-6xl mx-auto')],
        [
          h.span(
            [
              h.Class(
                clsx(
                  'inline-block -translate-x-1/4 text-accent-200/18 dark:text-accent-400/4 font-mono text-[18rem] md:text-[27rem] font-extrabold leading-none -z-10 relative whitespace-nowrap',
                  offsetY,
                ),
              ),
              h.DataAttribute('glyph', symbol),
            ],
            [],
          ),
        ],
      ),
    ],
  )
}

// VIEW

export const view = (
  copiedSnippets: CopiedSnippets,
  demoTabsView: Html,
  emailSignupView: Html,
  playgroundMenuView: Html,
  aiHeadingToggleCount: number,
  maybeStarCount: Option.Option<number>,
): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('isolate overflow-x-hidden')],
    [
      heroSection(copiedSnippets, playgroundMenuView, maybeStarCount),
      glyph('{ }'),
      promiseSection(),
      glyph('=>'),
      poweredBySection(),
      glyph('|>', '-translate-y-1/4'),
      demoSection(demoTabsView),
      glyph('[ ]'),
      includedSection(),
      glyph('::'),
      testingSection(copiedSnippets),
      glyph('??'),
      devToolsSection(),
      glyph('~~'),
      aiSection(aiHeadingToggleCount),
      glyph('< >'),
      tradeOffsSection(),
      glyph('( )'),
      audienceSection(),
      glyph('...', '-translate-y-1/3'),
      trustSection(),
      glyph('->'),
      finalCtaSection(emailSignupView, maybeStarCount),
    ],
  )
}

const viewOnGitHubButton = (maybeStarCount: Option.Option<number>): Html => {
  const h = html<Message>()

  return h.a(
    [h.Href(Link.github), h.Class('cta-secondary')],
    [
      Icon.github('w-5 h-5'),
      h.span([h.Class('mr-2')], ['View on GitHub']),
      ...Option.match(maybeStarCount, {
        onNone: () => [],
        onSome: count => [githubStarBadge(count)],
      }),
    ],
  )
}

// MESSAGE

export const ChangedHeroVisibility = m('ChangedHeroVisibility', {
  isVisible: S.Boolean,
})

// HERO

const ObserveHeroVisibility = Mount.defineStream(
  'ObserveHeroVisibility',
  ChangedHeroVisibility,
)(element =>
  Stream.callback<typeof ChangedHeroVisibility.Type>(queue =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const observer = new IntersectionObserver(
            entries =>
              Option.match(Array.head(entries), {
                onNone: Function.constVoid,
                onSome: entry =>
                  Queue.offerUnsafe(
                    queue,
                    ChangedHeroVisibility({
                      isVisible: entry.isIntersecting,
                    }),
                  ),
              }),
            { threshold: 0 },
          )
          observer.observe(element)
          return observer
        }),
        observer => Effect.sync(() => observer.disconnect()),
      )
      return yield* Effect.never
    }),
  ),
)

const INSTALL_COMMAND = 'npx create-foldkit-app@latest'

const heroSection = (
  copiedSnippets: CopiedSnippets,
  playgroundMenuView: Html,
  maybeStarCount: Option.Option<number>,
): Html => {
  const h = html<Message>()

  return h.section(
    [
      h.Id(HERO_SECTION_ID),
      h.AriaLabel('Hero'),
      h.Class('landing-section relative overflow-hidden'),
      h.OnMount(ObserveHeroVisibility()),
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
            ['Built on Effect. Architected like Elm. Written in TypeScript.'],
          ),
          h.div(
            [h.Class('mt-8')],
            [
              codeBlock(
                INSTALL_COMMAND,
                'Copy install command',
                copiedSnippets,
                'max-w-fit [&_pre]:text-xs [&_pre]:md:text-sm',
              ),
            ],
          ),
          h.div(
            [h.Class('mt-8 flex flex-col sm:flex-row items-start gap-4')],
            [
              h.a(
                [h.Href(coreArchitectureRouter()), h.Class('cta-primary')],
                ['Dive In', Icon.arrowRight('w-5 h-5')],
              ),
              playgroundMenuView,
              viewOnGitHubButton(maybeStarCount),
            ],
          ),
        ],
      ),
    ],
  )
}

// POWERED BY

const poweredByItem = (text: string): Html => {
  const h = html<Message>()

  return h.li(
    [h.Class('flex items-start gap-3')],
    [
      h.div(
        [h.Class('shrink-0 mt-0.5 text-accent-600 dark:text-accent-500')],
        [Icon.check('w-5 h-5')],
      ),
      h.span([h.Class('font-normal text-gray-600 dark:text-gray-300')], [text]),
    ],
  )
}

const poweredBySection = (): Html => {
  const h = html<Message>()

  return h.section(
    [h.Id('powered-by-effect'), h.Class('landing-section py-10 md:py-14')],
    [
      h.div(
        [h.Class('landing-section-narrow')],
        [
          h.h2(
            [
              h.Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white text-balance',
              ),
            ],
            [
              'Built on ',
              h.a(
                [
                  h.Href(Link.effect),
                  h.Class(
                    'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-normal',
                  ),
                ],
                ['Effect'],
              ),
              '. Inside and out.',
            ],
          ),
          h.p(
            [
              h.Class(
                'mt-4 text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-6 max-w-3xl',
              ),
            ],
            [
              'If you already know Effect, Foldkit feels natural. If you’re new to Effect, Foldkit is a great way to learn it.',
            ],
          ),
          h.ul(
            [
              h.Role('list'),
              h.Class(
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
}

// THE PROMISE

const pillarCard = (icon: Html, title: string, description: string): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('landing-card')],
    [
      h.div([h.Class('mb-3 text-accent-600 dark:text-accent-500')], [icon]),
      h.h3(
        [h.Class('text-xl font-normal text-gray-900 dark:text-white mb-2')],
        [title],
      ),
      h.p(
        [h.Class('text-gray-600 dark:text-gray-300 leading-relaxed')],
        [description],
      ),
    ],
  )
}

const promiseSection = (): Html => {
  const h = html<Message>()

  return h.section(
    [h.Id('the-promise'), h.Class('landing-section')],
    [
      h.div(
        [h.Class('landing-section-narrow')],
        [
          h.h2(
            [
              h.Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            ['Declare behavior. Ship. Repeat.'],
          ),
          h.p(
            [
              h.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'React, Vue, Svelte, and Solid solve rendering and leave the architecture to you. Foldkit gives you the architecture, so you can focus on your domain.',
            ],
          ),
          h.div(
            [h.Class('grid gap-6 md:grid-cols-3')],
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
}

// DEMOS

const demoSection = (demoTabsView: Html): Html => {
  const h = html<Message>()

  return h.section(
    [h.Id('peek-inside'), h.Class('landing-section')],
    [
      h.div(
        [h.Class('landing-section-narrow')],
        [
          h.h2(
            [
              h.Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            ['See it work.'],
          ),
          h.p(
            [
              h.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'Watch a message flow through update into the model. The code highlights in real time to show you what’s happening at each step.',
            ],
          ),
          h.div([h.Class('demo-viewport-constraint')], [demoTabsView]),
        ],
      ),
    ],
  )
}

// WHAT'S INCLUDED

const includedFeature = (
  icon: Html,
  title: string,
  description: ReadonlyArray<string | Html>,
  link?: Readonly<{ href: string; label: string }>,
): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('landing-card')],
    [
      h.div([h.Class('mb-3 text-accent-600 dark:text-accent-500')], [icon]),
      h.h3(
        [h.Class('text-xl font-normal text-gray-900 dark:text-white mb-2')],
        [title],
      ),
      h.p(
        [
          h.Class(
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
            h.a(
              [
                h.Href(link.href),
                h.Class(
                  'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-normal',
                ),
              ],
              [
                link.label,
                h.span(
                  [h.Class('inline-block ml-1')],
                  [Icon.arrowRight('w-3.5 h-3.5 inline')],
                ),
              ],
            ),
          ]
        : []),
    ],
  )
}

const includedSection = (): Html => {
  const h = html<Message>()

  return h.section(
    [h.Id('batteries-included'), h.Class('landing-section')],
    [
      h.div(
        [h.Class('landing-section-narrow')],
        [
          h.h2(
            [
              h.Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            ['Batteries included.'],
          ),
          h.p(
            [
              h.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'Most frameworks ask you to bring your own routing library, state manager, UI kit, and form validator. Foldkit ships them as one coherent system.',
            ],
          ),
          h.div(
            [h.Class('grid gap-6 sm:grid-cols-2 lg:grid-cols-3')],
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
              h.div(
                [h.Class('landing-card')],
                [
                  h.div(
                    [h.Class('mb-3 text-accent-600 dark:text-accent-500')],
                    [Icon.puzzle('w-6 h-6')],
                  ),
                  h.h3(
                    [
                      h.Class(
                        'flex items-center text-xl font-normal text-gray-900 dark:text-white mb-2',
                      ),
                    ],
                    ['UI Components'],
                  ),
                  h.p(
                    [
                      h.Class(
                        'text-gray-600 dark:text-gray-300 leading-relaxed mb-3',
                      ),
                    ],
                    [
                      'Accessible components (dialog, menu, tabs, listbox, disclosure, and more) built for The Elm Architecture. Easy to style and customize.',
                    ],
                  ),
                  h.a(
                    [
                      h.Href(uiOverviewRouter()),
                      h.Class(
                        'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-normal',
                      ),
                    ],
                    [
                      'Browse the components',
                      h.span(
                        [h.Class('inline-block ml-1')],
                        [Icon.arrowRight('w-3.5 h-3.5 inline')],
                      ),
                    ],
                  ),
                ],
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
                'Subscriptions',
                [
                  'Bind a slice of the Model to a scoped Stream that may emit Messages. The runtime opens the scope while the slice holds its value and closes it when the slice changes.',
                ],
                {
                  href: coreSubscriptionsRouter(),
                  label: 'Explore Subscriptions',
                },
              ),
              includedFeature(
                Icon.circleStack('w-6 h-6'),
                'Managed Resources',
                [
                  'Model-driven lifecycles for long-lived browser resources like WebSockets, AudioContext, and RTCPeerConnection. The runtime acquires when the Model calls for the resource and releases when it no longer does.',
                ],
                {
                  href: coreManagedResourcesRouter(),
                  label: 'Explore Managed Resources',
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
                Icon.checkBadge('w-6 h-6'),
                'Testing',
                [
                  'Two test primitives. Story sends Messages through update and asserts on the resulting Model and Commands. Scene drives the rendered view through accessible locators and asserts on the re-rendered HTML.',
                ],
                {
                  href: testingRouter(),
                  label: 'Explore testing',
                },
              ),
              includedFeature(
                Icon.computer('w-6 h-6'),
                'DevTools',
                [
                  'Inspect Messages, Model state, and Commands as your app runs. Time-travel mode rewinds your UI to any past Model. AI agents can connect to the same data over MCP.',
                ],
                {
                  href: coreDevToolsRouter(),
                  label: 'Explore DevTools',
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
}

// TESTING

const testingSection = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.section(
    [h.Id('testing'), h.Class('landing-section')],
    [
      h.div(
        [h.Class('landing-section-narrow')],
        [
          h.h2(
            [
              h.Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            [
              'Tests that read like ',
              h.span(
                [h.Class('text-accent-600 dark:text-accent-500')],
                ['stories and scenes.'],
              ),
            ],
          ),
          h.p(
            [
              h.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'Pure update functions mean pure tests. Story tests the state machine. Scene tests features through the view (clicking buttons, typing into inputs) with accessible locators. No DOM, no mocking.',
            ],
          ),
          h.a(
            [h.Href(testingRouter()), h.Class('cta-secondary mb-8')],
            ['Learn about testing', Icon.arrowRight('w-5 h-5')],
          ),
          highlightedCodeBlock(
            h.div(
              [
                h.Class('text-sm'),
                h.InnerHTML(Snippets.landingTestHighlighted),
              ],
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
}

// DEVTOOLS

const devToolsSection = (): Html => {
  const h = html<Message>()

  return h.section(
    [h.Id('devtools'), h.Class('landing-section')],
    [
      h.div(
        [h.Class('landing-section-narrow')],
        [
          h.h2(
            [
              h.Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            [
              'Watch your program ',
              h.span(
                [h.Class('text-accent-600 dark:text-accent-500')],
                ['think.'],
              ),
            ],
          ),
          h.p(
            [
              h.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4 max-w-3xl',
              ),
            ],
            [
              'When every state change flows through Messages and a single Model, you get DevTools that would be impossible in a mutable-state framework. Every Message is logged. Every Model state is inspectable. Click any row to see exactly what changed.',
            ],
          ),
          h.p(
            [
              h.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4 max-w-3xl',
              ),
            ],
            [
              'Plus, AI agents can connect over MCP. They read the current Model, walk Message history, and rewind the UI to past states. Programmatic access to the same data DevTools shows you.',
            ],
          ),
          h.p(
            [
              h.Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl',
              ),
            ],
            [
              'This site runs on Foldkit. Look for the tab on the bottom right of this page to try DevTools live.',
            ],
          ),
          h.a(
            [h.Href(coreDevToolsRouter()), h.Class('cta-secondary mb-8')],
            ['Learn about DevTools', Icon.arrowRight('w-5 h-5')],
          ),
          h.div(
            [
              h.Class(
                'rounded-lg overflow-hidden shadow-xl ring-1 ring-gray-200 dark:ring-gray-700',
              ),
            ],
            [
              h.img([
                h.Src('/devtools-overlay.webp'),
                h.Srcset(
                  '/devtools-overlay-1x.webp 1x, /devtools-overlay.webp 2x',
                ),
                h.Alt(
                  'Foldkit DevTools overlay inspecting the Foldkit website: a numbered Message timeline on the left with entries like ClickedLink, ChangedUrl, and CompletedScrollToTop, and an expandable Model state tree on the right showing route, url, and theme fields.',
                ),
                h.Width('972'),
                h.Height('637'),
                h.Class('w-full h-auto'),
              ]),
            ],
          ),
        ],
      ),
    ],
  )
}

// TRADE-OFFS & COMPARISON

const tradeOffsSection = (): Html => {
  const h = html<Message>()

  return h.section(
    [h.Id('whats-the-catch'), h.Class('landing-section')],
    [
      h.div(
        [h.Class('landing-section-narrow')],
        [
          h.div(
            [h.Class('grid gap-10 md:grid-cols-2')],
            [
              h.div(
                [],
                [
                  h.h2(
                    [
                      h.Class(
                        'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-3 text-balance',
                      ),
                    ],
                    ['What’s the catch?'],
                  ),
                  h.p(
                    [
                      h.Class(
                        'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4',
                      ),
                    ],
                    [
                      'Foldkit asks you to think about frontend development differently. It uses ',
                      h.a(
                        [
                          h.Href(Link.elmArchitecture),
                          h.Class(
                            'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-normal',
                          ),
                        ],
                        ['The Elm Architecture'],
                      ),
                      ', so there are no components, no hooks, no local state. Everything is declarative and structured. You’ll need to shift how you think about state, effects, and views.',
                    ],
                  ),
                  h.p(
                    [
                      h.Class(
                        'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8',
                      ),
                    ],
                    ['It’s a discipline. It pays off, but it’s a real ask.'],
                  ),
                  h.a(
                    [
                      h.Href(coreArchitectureRouter()),
                      h.Class('cta-secondary'),
                    ],
                    ['See how it works', Icon.arrowRight('w-5 h-5')],
                  ),
                ],
              ),
              h.div(
                [h.Id('foldkit-vs-react')],
                [
                  h.h2(
                    [
                      h.Class(
                        'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-4 text-balance',
                      ),
                    ],
                    ['How does it compare?'],
                  ),
                  h.p(
                    [h.Class('text-lg text-gray-600 dark:text-gray-300 mb-8')],
                    [
                      'Foldkit is a different kind of frontend framework. If you’re weighing it against React, Vue, Svelte, or Solid, the key difference isn’t syntax or performance. It’s that Foldkit prescribes the architecture instead of leaving it to you.',
                    ],
                  ),
                  h.a(
                    [h.Href(comingFromReactRouter()), h.Class('cta-secondary')],
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
}

// AUDIENCE

const audienceSection = (): Html => {
  const h = html<Message>()

  return h.section(
    [h.Id('who-its-for'), h.Class('landing-section')],
    [
      h.div(
        [h.Class('landing-section-narrow')],
        [
          h.div(
            [h.Class('grid gap-8 md:grid-cols-2')],
            [
              h.div(
                [],
                [
                  h.h2(
                    [
                      h.Class(
                        'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-6 text-balance',
                      ),
                    ],
                    ['Who it’s for'],
                  ),
                  h.ul(
                    [h.Role('list'), h.Class('list-none')],
                    [
                      audienceForItem(
                        'Effect developers who need a frontend',
                        'Your backend already uses Effect. Foldkit is the missing frontend piece: same ecosystem, same patterns, no context switching.',
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
                        'Auth flows, real-time data, multi-step forms. The architecture handles complexity without losing clarity.',
                      ),
                    ],
                  ),
                ],
              ),
              h.div(
                [],
                [
                  h.h2(
                    [
                      h.Class(
                        'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-6 text-balance',
                      ),
                    ],
                    ['Who it’s not for'],
                  ),
                  h.ul(
                    [h.Role('list'), h.Class('list-none')],
                    [
                      audienceNotItem(
                        'Large existing React codebases',
                        'Foldkit isn’t an incremental adoption. It’s a different architecture, and migrating means a rewrite. The middle path is embedding: Runtime.embed runs a Foldkit widget inside an existing app.',
                      ),
                      audienceNotItem(
                        'Teams not ready to invest in Effect',
                        'Foldkit leans on pipe, discriminated unions, and Effect throughout. There’s no escape hatch. You’re all in or you’re not.',
                      ),
                      audienceNotItem(
                        'Projects that need the React ecosystem',
                        'No React component libraries, no Next.js, no existing middleware. You’re building on different foundations.',
                      ),
                      audienceNotItem(
                        'Teams that need server-side rendering',
                        'Foldkit is a client-side SPA framework. Static generation is possible, but you’ll roll your own (like we do for this website).',
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
}

const audienceForItem = (title: string, description: string): Html => {
  const h = html<Message>()

  return h.li(
    [h.Class('mb-5 flex gap-3')],
    [
      h.div(
        [h.Class('shrink-0 mt-0.5 text-accent-600 dark:text-accent-400')],
        [Icon.check('w-5 h-5')],
      ),
      h.div(
        [],
        [
          h.h3(
            [
              h.Class(
                'text-base font-normal text-gray-900 dark:text-white mb-1',
              ),
            ],
            [title],
          ),
          h.p(
            [h.Class('text-gray-600 dark:text-gray-300 leading-relaxed')],
            [description],
          ),
        ],
      ),
    ],
  )
}

const audienceNotItem = (title: string, description: string): Html => {
  const h = html<Message>()

  return h.li(
    [h.Class('mb-5 flex gap-3')],
    [
      h.div(
        [h.Class('shrink-0 mt-0.5 text-gray-400 dark:text-gray-500')],
        [Icon.close('w-5 h-5')],
      ),
      h.div(
        [],
        [
          h.h3(
            [
              h.Class(
                'text-base font-normal text-gray-900 dark:text-white mb-1',
              ),
            ],
            [title],
          ),
          h.p(
            [h.Class('text-gray-600 dark:text-gray-300 leading-relaxed')],
            [description],
          ),
        ],
      ),
    ],
  )
}

// TRUST & MATURITY

const trustSection = (): Html => {
  const h = html<Message>()

  return h.section(
    [h.Id('trust'), h.Class('landing-section py-10 md:py-14')],
    [
      h.div(
        [h.Class('landing-section-narrow')],
        [
          h.h2(
            [
              h.Class(
                'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-6 text-balance',
              ),
            ],
            ['Proof of life.'],
          ),
          h.ul(
            [
              h.Role('list'),
              h.Class('grid gap-6 sm:grid-cols-2 lg:grid-cols-4 list-none'),
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
                typingTerminalRouter(),
              ),
              trustItemWithLink('Changelog', 'View releases', Link.changelog),
            ],
          ),
        ],
      ),
    ],
  )
}

const trustItem = (label: string, value: string): Html => {
  const h = html<Message>()

  return h.li(
    [h.Class('landing-card')],
    [
      h.p(
        [
          h.Class(
            'text-xs font-normal text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-1',
          ),
        ],
        [label],
      ),
      h.p(
        [h.Class('text-xl font-normal text-gray-900 dark:text-white')],
        [value],
      ),
    ],
  )
}

const trustItemWithLink = (
  label: string,
  linkText: string,
  href: string,
): Html => {
  const h = html<Message>()

  return h.li(
    [h.Class('landing-card')],
    [
      h.p(
        [
          h.Class(
            'text-xs font-normal text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-1',
          ),
        ],
        [label],
      ),
      h.a(
        [
          h.Href(href),
          h.Class(
            'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 text-lg font-normal',
          ),
        ],
        [
          linkText,
          h.span(
            [h.Class('inline-block ml-1')],
            [Icon.arrowRight('w-4 h-4 inline')],
          ),
        ],
      ),
    ],
  )
}

// AI

const AI_HEADING_A = 'Built for humans. Readable by AI.'
const AI_HEADING_B = 'Built for AI. Readable by humans.'
const STATIC_PREFIX_LENGTH = 10

const solariHeading = (toggleCount: number): Html => {
  const h = html<Message>()

  const isSwapped = toggleCount % 2 === 1

  return h.h2(
    [
      h.Class(
        'text-[1.25rem] sm:text-2xl md:text-[2rem] font-normal text-amber-500 dark:text-amber-400 mb-4 font-mono',
      ),
      h.AriaLabel(isSwapped ? AI_HEADING_B : AI_HEADING_A),
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
            ? [' ', h.br([h.Class('solari-break')])]
            : [' ']
        }

        if (!isFlipping) {
          return [
            h.span(
              [
                h.Class(
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
          h.span(
            [
              h.Class(
                clsx('solari-character', {
                  'solari-character-flipped': isSwapped,
                }),
              ),
              h.AriaHidden(true),
            ],
            [
              h.span(
                [h.Class('solari-face solari-face-front')],
                [characterA === ' ' ? ' ' : characterA],
              ),
              h.span(
                [h.Class('solari-face solari-face-back')],
                [characterB === ' ' ? ' ' : characterB],
              ),
            ],
          ),
        ]
      }),
    ),
  )
}

const aiSection = (aiHeadingToggleCount: number): Html => {
  const h = html<Message>()

  return h.section(
    [h.Id('ai'), h.Class('landing-section py-10 md:py-14 relative')],
    [
      h.div(
        [h.Class('landing-section-narrow relative')],
        [
          solariHeading(aiHeadingToggleCount),
          h.p(
            [
              h.Class(
                'text-lg text-gray-600 dark:text-gray-300 mb-4 max-w-2xl',
              ),
            ],
            [
              'Foldkit apps are explicit and predictable. This makes LLMs particularly good at generating Foldkit code. And it makes generated Foldkit code exceptionally easy for humans to review.',
            ],
          ),
          h.p(
            [
              h.Class(
                'text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl',
              ),
            ],
            [
              'AI agents can also connect directly to a running Foldkit app over the Model Context Protocol. They read the current Model, inspect Message history, rewind the UI to past states, and dispatch Messages.',
            ],
          ),
          h.a(
            [h.Href(aiOverviewRouter()), h.Class('cta-secondary')],
            ['Set up AI-assisted development', Icon.arrowRight('w-5 h-5')],
          ),
        ],
      ),
    ],
  )
}

// FINAL CTA

const finalCtaSection = (
  emailSignupView: Html,
  maybeStarCount: Option.Option<number>,
): Html => {
  const h = html<Message>()

  return h.section(
    [h.Id('get-started'), h.Class('landing-section')],
    [
      h.div(
        [h.Class('landing-section-narrow')],
        [
          h.div(
            [h.Class('grid gap-10 lg:grid-cols-2')],
            [
              h.div(
                [],
                [
                  h.h2(
                    [
                      h.Class(
                        'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-4 text-balance',
                      ),
                    ],
                    ['Make something correct.'],
                  ),
                  h.p(
                    [
                      h.Class(
                        'text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-xl',
                      ),
                    ],
                    ['Describe your app. Let the runtime handle the rest.'],
                  ),
                  h.div(
                    [
                      h.Class(
                        'flex flex-col sm:flex-row items-start sm:items-center gap-4',
                      ),
                    ],
                    [
                      h.a(
                        [
                          h.Href(coreArchitectureRouter()),
                          h.Class('cta-primary'),
                        ],
                        ['Dive In', Icon.arrowRight('w-5 h-5')],
                      ),
                      viewOnGitHubButton(maybeStarCount),
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
}
