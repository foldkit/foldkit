import { Html } from 'foldkit/html'
import { foldkitVersion } from 'virtual:landing-data'

import {
  Alt,
  AriaHidden,
  Class,
  Href,
  Id,
  Role,
  Src,
  a,
  canvas,
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
import { type Model } from '../main'
import { codeBlock } from '../view/codeBlock'
import { exampleAppCount } from './examples'

// CONSTANTS

export const AI_GRID_CANVAS_ID = 'ai-grid-canvas'
export const HERO_GRID_CANVAS_ID = 'hero-grid-canvas'
export const HERO_SECTION_ID = 'hero'

// VIEW

export const view = (model: Model, demoTabsView: Html): Html =>
  div(
    [],
    [
      heroSection(model),
      promiseSection(),
      demoSection(demoTabsView),
      poweredBySection(),
      includedSection(),
      aiSection(),
      whyFoldkitSection(),
      audienceSection(),
      comparisonStripSection(),
      trustSection(),
      finalCtaSection(),
    ],
  )

// HERO

const INSTALL_COMMAND = 'npx create-foldkit-app@latest --wizard'

const heroSection = (model: Model): Html =>
  section(
    [
      Id(HERO_SECTION_ID),
      Class(
        'landing-section relative overflow-hidden bg-white dark:bg-gray-900',
      ),
    ],
    [
      canvas(
        [
          Id(HERO_GRID_CANVAS_ID),
          Class('absolute inset-0 w-full h-full'),
          AriaHidden(true),
        ],
        [],
      ),
      div(
        [Class('landing-section-narrow text-center relative')],
        [
          div(
            [Class('flex justify-center mb-8')],
            [
              img([
                Src('/logo.svg'),
                Alt('Foldkit'),
                Class('h-10 md:h-12 dark:invert'),
              ]),
            ],
          ),
          h1(
            [
              Class(
                'text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight leading-[1.1] text-balance',
              ),
            ],
            [
              span(
                [Class('text-pink-600 dark:text-pink-500')],
                ['Beautifully'],
              ),
              ' boring frontend applications.',
            ],
          ),
          p(
            [
              Class(
                'mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed text-balance',
              ),
            ],
            [
              'No surprises. No magic. Just a framework that does exactly what you describe.',
            ],
          ),
          div(
            [Class('mt-8')],
            [
              codeBlock(
                INSTALL_COMMAND,
                'Copy install command',
                model,
                'max-w-fit mx-auto [&_pre]:text-xs [&_pre]:md:text-sm',
              ),
            ],
          ),
          div(
            [
              Class(
                'mt-8 flex flex-col sm:flex-row items-center justify-center gap-4',
              ),
            ],
            [
              a(
                [Href(Link.gettingStarted), Class('cta-primary')],
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

// POWERED BY

const poweredByItem = (text: string): Html =>
  li(
    [Class('flex items-center gap-2')],
    [
      div(
        [Class('shrink-0 text-green-600 dark:text-green-400')],
        [Icon.check('w-5 h-5')],
      ),
      span([], [text]),
    ],
  )

const poweredBySection = (): Html =>
  section(
    [
      Id('powered-by-effect'),
      Class(
        'landing-section py-10 md:py-14 text-center bg-gray-50 dark:bg-gray-850',
      ),
    ],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-balance',
              ),
            ],
            [
              'Powered by ',
              a(
                [
                  Href(Link.effect),
                  Class(
                    'text-pink-600 dark:text-pink-500 hover:underline',
                  ),
                ],
                ['Effect'],
              ),
              '. Inside and out.',
            ],
          ),
          ul(
            [
              Role('list'),
              Class(
                'mt-4 flex flex-col gap-2 items-center text-lg text-gray-600 dark:text-gray-300 list-none',
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
          p(
            [Class('mt-3 text-gray-500 dark:text-gray-300')],
            ['(Yeah. We like Effect.)'],
          ),
        ],
      ),
    ],
  )

// THE PROMISE

const pillarCard = (
  icon: Html,
  title: string,
  description: string,
): Html =>
  div(
    [Class('landing-card p-6 dark:bg-gray-900')],
    [
      div([Class('mb-3 text-pink-600 dark:text-pink-500')], [icon]),
      h3(
        [
          Class(
            'text-lg font-semibold text-gray-900 dark:text-white mb-2',
          ),
        ],
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
    [
      Id('the-promise'),
      Class('landing-section bg-gray-50 dark:bg-gray-850'),
    ],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center text-balance',
              ),
            ],
            ['Declare behavior. Ship. Repeat.'],
          ),
          p(
            [
              Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl mx-auto text-center text-balance',
              ),
            ],
            [
              'Most frameworks ask you to make architectural decisions instead of empowering you to build great applications. Foldkit gives you a principled, cohesive architecture so you can focus on shipping.',
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
                'Side effects are values you return, not callbacks you fire. Commands declare what should happen. The runtime handles when and how.',
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
        [Class('max-w-6xl mx-auto')],
        [
          h2(
            [
              Class(
                'text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center text-balance',
              ),
            ],
            ['Peek inside.'],
          ),
          p(
            [
              Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl mx-auto text-center text-balance',
              ),
            ],
            [
              "Watch a message flow through update into the model. The code highlights in real time to show you what's happening at each step.",
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
): Html =>
  div(
    [Class('landing-card p-6 dark:bg-gray-850')],
    [
      div([Class('mb-3 text-pink-600 dark:text-pink-500')], [icon]),
      h3(
        [
          Class(
            'text-base font-semibold text-gray-900 dark:text-white mb-2',
          ),
        ],
        [title],
      ),
      p(
        [Class('text-gray-600 dark:text-gray-300 leading-relaxed')],
        description,
      ),
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
                'text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            ['Batteries included.'],
          ),
          p(
            [
              Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10 max-w-3xl text-balance',
              ),
            ],
            [
              'Most frameworks ask you to bring your own routing library, state manager, UI kit, and form validator. Foldkit ships them as one coherent system.',
            ],
          ),
          div(
            [Class('grid gap-6 sm:grid-cols-2 lg:grid-cols-3')],
            [
              includedFeature(Icon.route('w-6 h-6'), 'Routing', [
                'Type-safe bidirectional routing. URLs parse into typed routes and routes build back into URLs. No string matching, no mismatches between parsing and building.',
              ]),
              div(
                [Class('landing-card p-6 dark:bg-gray-850')],
                [
                  div(
                    [Class('mb-3 text-pink-600 dark:text-pink-500')],
                    [Icon.puzzle('w-6 h-6')],
                  ),
                  h3(
                    [
                      Class(
                        'flex items-center text-base font-semibold text-gray-900 dark:text-white mb-2',
                      ),
                    ],
                    [
                      'UI Components',
                      span(
                        [
                          Class(
                            'ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400',
                          ),
                        ],
                        ['In Development'],
                      ),
                    ],
                  ),
                  p(
                    [
                      Class(
                        'text-gray-600 dark:text-gray-300 leading-relaxed mb-3',
                      ),
                    ],
                    [
                      'Accessible primitives — dialog, menu, tabs, listbox, disclosure, and more — built for the Elm Architecture. Easy to style and customize.',
                    ],
                  ),
                  a(
                    [
                      Href('/foldkit-ui'),
                      Class(
                        'text-pink-600 dark:text-pink-500 hover:underline font-semibold text-sm',
                      ),
                    ],
                    [
                      'See the docs',
                      span(
                        [Class('inline-block ml-1')],
                        [Icon.arrowRight('w-3.5 h-3.5 inline')],
                      ),
                    ],
                  ),
                ],
              ),
              includedFeature(
                Icon.squareStack('w-6 h-6'),
                'Virtual DOM',
                [
                  'Built on ',
                  a(
                    [
                      Href(Link.snabbdom),
                      Class(
                        'text-pink-600 dark:text-pink-500 hover:underline',
                      ),
                    ],
                    ['Snabbdom'],
                  ),
                  '. Fast, keyed diffing with declarative views that are plain functions of your Model.',
                ],
              ),
              includedFeature(
                Icon.signal('w-6 h-6'),
                'Subscriptions',
                [
                  'Declare which streams your app needs as a function of the Model. The runtime diffs and switches them when the Model changes.',
                ],
              ),
              includedFeature(
                Icon.shieldCheck('w-6 h-6'),
                'Field Validation',
                [
                  'Per-field validation with sync and async support. Define rules as predicates, apply them in update, and the Model tracks every field state.',
                ],
              ),
              includedFeature(Icon.cog('w-6 h-6'), 'Commands', [
                'Side effects live safely in Commands: Effects that return Messages. You write the Effect with whatever combinators you want and the runtime runs it.',
              ]),
            ],
          ),
        ],
      ),
    ],
  )

// WHY FOLDKIT

const whyFoldkitSection = (): Html =>
  section(
    [Id('whats-the-catch'), Class('landing-section')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 text-balance',
              ),
            ],
            ["What's the catch?"],
          ),
          p(
            [
              Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-4 max-w-3xl text-balance',
              ),
            ],
            [
              'Foldkit asks you to think about frontend development differently. It uses ',
              a(
                [
                  Href(Link.elmArchitecture),
                  Class(
                    'text-pink-600 dark:text-pink-500 hover:underline',
                  ),
                ],
                ['The Elm Architecture'],
              ),
              ", so there are no components, no hooks, no local state. Everything is declarative and structured. You'll need to shift how you think about state, effects, and views.",
            ],
          ),
          p(
            [
              Class(
                'text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8 max-w-3xl text-balance',
              ),
            ],
            ["It's a discipline. It pays off, but it's a real ask."],
          ),
          a(
            [Href(Link.whyFoldkit), Class('cta-secondary')],
            ['See how it works', Icon.arrowRight('w-5 h-5')],
          ),
        ],
      ),
    ],
  )

// AUDIENCE

const audienceSection = (): Html =>
  section(
    [
      Id('who-its-for'),
      Class('landing-section bg-gray-50 dark:bg-gray-850'),
    ],
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
                        'text-2xl font-bold text-gray-900 dark:text-white mb-6 text-balance',
                      ),
                    ],
                    ["Who it's for"],
                  ),
                  ul(
                    [Role('list'), Class('list-none')],
                    [
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
                        'text-2xl font-bold text-gray-900 dark:text-white mb-6 text-balance',
                      ),
                    ],
                    ["Who it's not for"],
                  ),
                  ul(
                    [Role('list'), Class('list-none')],
                    [
                      audienceNotItem(
                        'Large existing React codebases',
                        "Foldkit isn't an incremental adoption — it's a different architecture. Migration means a rewrite.",
                      ),
                      audienceNotItem(
                        'Teams not ready to invest in Effect',
                        "Foldkit leans on pipe, discriminated unions, and Effect throughout. There's no escape hatch — you're all in or you're not.",
                      ),
                      audienceNotItem(
                        'Projects that need the React ecosystem',
                        "No React component libraries, no Next.js, no existing middleware. You're building on different foundations.",
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
        [Class('shrink-0 mt-0.5 text-green-600 dark:text-green-400')],
        [Icon.check('w-5 h-5')],
      ),
      div(
        [],
        [
          h3(
            [
              Class(
                'text-base font-semibold text-gray-900 dark:text-white mb-1',
              ),
            ],
            [title],
          ),
          p(
            [
              Class(
                'text-gray-600 dark:text-gray-300 leading-relaxed',
              ),
            ],
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
            [
              Class(
                'text-base font-semibold text-gray-900 dark:text-white mb-1',
              ),
            ],
            [title],
          ),
          p(
            [
              Class(
                'text-gray-600 dark:text-gray-300 leading-relaxed',
              ),
            ],
            [description],
          ),
        ],
      ),
    ],
  )

// COMPARISON STRIP

const comparisonStripSection = (): Html =>
  section(
    [
      Id('foldkit-vs-react'),
      Class('landing-section py-10 md:py-14 text-center'),
    ],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 text-balance',
              ),
            ],
            ['How does Foldkit compare to React?'],
          ),
          p(
            [
              Class(
                'text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto text-balance',
              ),
            ],
            [
              "It's a different architecture. See where the approaches diverge and where they don't.",
            ],
          ),
          a(
            [
              Href('/why-foldkit#foldkit-vs-react'),
              Class('cta-secondary'),
            ],
            ['Read the full comparison', Icon.arrowRight('w-5 h-5')],
          ),
        ],
      ),
    ],
  )

// TRUST & MATURITY

const trustSection = (): Html =>
  section(
    [
      Id('trust'),
      Class(
        'landing-section py-10 md:py-14 bg-gray-50 dark:bg-gray-850',
      ),
    ],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center text-balance',
              ),
            ],
            ['Proof of life.'],
          ),
          ul(
            [
              Role('list'),
              Class(
                'grid gap-6 sm:grid-cols-2 lg:grid-cols-4 list-none',
              ),
            ],
            [
              trustItem('Version', `v${foldkitVersion}`),
              trustItemWithLink(
                'Example apps',
                String(exampleAppCount),
                Link.exampleApps,
              ),
              trustItemWithLink(
                'Production app',
                'Typing Terminal',
                Link.typingTerminal,
              ),
              trustItemWithLink(
                'Changelog',
                'View releases',
                Link.changelog,
              ),
            ],
          ),
        ],
      ),
    ],
  )

const trustItem = (label: string, value: string): Html =>
  li(
    [Class('landing-card p-5 text-center dark:bg-gray-850')],
    [
      p(
        [
          Class(
            'text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-1',
          ),
        ],
        [label],
      ),
      p(
        [Class('text-xl font-bold text-gray-900 dark:text-white')],
        [value],
      ),
    ],
  )

const trustItemWithLink = (
  label: string,
  linkText: string,
  href: string,
): Html =>
  li(
    [Class('landing-card p-5 text-center dark:bg-gray-850')],
    [
      p(
        [
          Class(
            'text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-1',
          ),
        ],
        [label],
      ),
      a(
        [
          Href(href),
          Class(
            'text-pink-600 dark:text-pink-500 hover:underline text-lg font-semibold',
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

const aiSection = (): Html =>
  section(
    [
      Id('ai'),
      Class(
        'landing-section py-10 md:py-14 text-center relative overflow-hidden',
      ),
    ],
    [
      canvas(
        [
          Id(AI_GRID_CANVAS_ID),
          Class('absolute inset-0 w-full h-full'),
          AriaHidden(true),
        ],
        [],
      ),
      div(
        [Class('landing-section-narrow relative')],
        [
          h2(
            [
              Class(
                'text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 text-balance',
              ),
            ],
            [
              'Your favorite ',
              span(
                [
                  Class(
                    'text-pink-600 dark:text-pink-500 font-black',
                  ),
                ],
                ['LLM'],
              ),
              ' has a crush on Foldkit.',
            ],
          ),
          p(
            [
              Class(
                'text-lg text-gray-600 dark:text-gray-300 mb-4 max-w-2xl mx-auto text-balance',
              ),
            ],
            [
              'Foldkit apps are explicit and predictable. This makes LLMs particularly good at generating Foldkit code. And it makes generated Foldkit code exceptionally easy for humans to review.',
            ],
          ),
          a(
            [
              Href('/getting-started#ai-assisted'),
              Class('cta-gradient'),
            ],
            [
              'Set up AI-assisted development',
              Icon.arrowRight('w-5 h-5'),
            ],
          ),
        ],
      ),
    ],
  )

// FINAL CTA

const finalCtaSection = (): Html =>
  section(
    [Id('get-started'), Class('landing-section text-center')],
    [
      div(
        [Class('landing-section-narrow')],
        [
          h2(
            [
              Class(
                'text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 text-balance',
              ),
            ],
            ['Ready to be bored?'],
          ),
          p(
            [
              Class(
                'text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-xl mx-auto text-balance',
              ),
            ],
            ['Describe your app. Let the runtime handle the rest.'],
          ),
          div(
            [
              Class(
                'flex flex-col sm:flex-row items-center justify-center gap-4',
              ),
            ],
            [
              a(
                [Href(Link.gettingStarted), Class('cta-primary')],
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
