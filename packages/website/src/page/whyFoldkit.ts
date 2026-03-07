import { Html } from 'foldkit/html'

import { Class, div, li, ul } from '../html'
import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import {
  bullets,
  callout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import { comparisonTable } from '../view/table'

const theChallengesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-challenges',
  text: 'The Challenges',
}

const foldkitVsReactHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'foldkit-vs-react',
  text: 'Foldkit vs React',
}

const theElmArchitectureHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-elm-architecture',
  text: 'The Elm Architecture',
}

const aiFriendlyHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'ai-friendly-architecture',
  text: 'AI-Friendly Architecture',
}

const builtOnEffectHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'built-on-effect',
  text: 'Built on Effect',
}

const whoItsForHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'who-its-for',
  text: "Who It's For",
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  theChallengesHeader,
  foldkitVsReactHeader,
  theElmArchitectureHeader,
  aiFriendlyHeader,
  builtOnEffectHeader,
  whoItsForHeader,
]

const aiFriendlyTable = (): Html =>
  comparisonTable(
    ['Property', 'Why AI Benefits'],
    [
      [
        ['Single immutable model'],
        [
          'AI can track state without hunting through component trees',
        ],
      ],
      [
        ['Pure update functions'],
        ['Explicit input → output makes state changes easy to trace'],
      ],
      [
        ['Explicit commands'],
        [
          'Side effects are declared, not hidden in useEffect callbacks',
        ],
      ],
      [
        ['Strong typing'],
        ['Type signatures act as contracts AI can verify against'],
      ],
    ],
  )

const foldkitVsReactTable = (): Html =>
  comparisonTable(
    ['Feature', 'React', 'Foldkit'],
    [
      [
        ['Component state'],
        ['useState per component, prop drilling'],
        ['Part of single Model, direct access'],
      ],
      [
        ['Global state'],
        ['Context/Redux/Zustand + providers'],
        ['Built into Model, no extra libraries'],
      ],
      [
        ['Derived state'],
        ['useMemo with dependency arrays'],
        ['Pure functions, no memoization needed'],
      ],
      [
        ['Event handlers'],
        ['Callbacks that may close over stale state'],
        ['Messages describe events, update handles them'],
      ],
      [
        ['Routing'],
        ['React Router + state sync + URL parsing'],
        ['Built-in typed routes, automatic URL ↔ Model sync'],
      ],
      [
        ['Side effects'],
        ['useEffect cleanup, race conditions, stale closures'],
        ['Commands are explicit, return values from update'],
      ],
      [
        ['Subscriptions'],
        ['Manual useEffect + cleanup + dependency arrays'],
        ['Subscriptions with automatic lifecycle'],
      ],
      [
        ['Debugging'],
        ['React DevTools + Redux DevTools + console.log'],
        [
          'Single state tree, message log, time-travel (in development)',
        ],
      ],
    ],
  )

export const view = (): Html =>
  div(
    [],
    [
      pageTitle('whyFoldkit', 'Why Foldkit?'),
      tableOfContentsEntryToHeader(theChallengesHeader),
      para(
        'Building interactive web applications presents recurring challenges. As complexity grows, certain patterns become harder to manage:',
      ),
      bullets(
        'State spread across components, hooks, contexts, and stores',
        'Side effects interleaved with rendering logic',
        'Dependencies that are implicit rather than explicit',
        'Race conditions and stale closures in async code',
        'Testing that requires mocking framework internals',
      ),
      para(
        'These challenges are not unique to any framework — they emerge naturally as applications grow. Foldkit addresses them through architecture rather than convention.',
      ),
      tableOfContentsEntryToHeader(foldkitVsReactHeader),
      para(
        'A simple counter looks similar in both React and Foldkit. The difference emerges as complexity grows.',
      ),
      foldkitVsReactTable(),
      para(
        'Key insight:',
        " React's simplicity at small scale becomes complexity debt. Foldkit's structure feels like overhead at first but pays off as the app grows.",
      ),
      tableOfContentsEntryToHeader(theElmArchitectureHeader),
      para(
        'Foldkit implements ',
        link(Link.elmArchitecture, 'The Elm Architecture'),
        ', a proven pattern for building reliable user interfaces.',
      ),
      ul(
        [Class('list-disc mb-6 space-y-2')],
        [
          li(
            [],
            [
              'Single source of truth',
              ' — All application state lives in one Model',
            ],
          ),
          li(
            [],
            [
              'Explicit state transitions',
              ' — Messages describe what happened, Update decides what changes',
            ],
          ),
          li(
            [],
            [
              'Pure functions everywhere',
              ' — Update returns new state + Commands, runtime executes effects',
            ],
          ),
          li(
            [],
            [
              'Predictable debugging',
              ' — If you know the Model and Message, you know what happens next',
            ],
          ),
        ],
      ),
      para(
        'This architecture has been refined over a decade in the ',
        link(Link.elm, 'Elm'),
        ' community. Foldkit brings these ideas to TypeScript.',
      ),
      callout(
        'Familiar if you know Redux',
        'The Model-View-Update pattern will feel similar to Redux: the Model is like your store, Messages are like actions, and update is your reducer. The key differences are that Commands replace middleware, and the pattern is built into the framework rather than added on top.',
      ),
      tableOfContentsEntryToHeader(aiFriendlyHeader),
      para(
        'In our experience, AI tools generate more reliable code when patterns are predictable and explicit.',
      ),
      aiFriendlyTable(),
      para(
        'Compare this to React where state can live anywhere (useState, useContext, Redux, Zustand, URL params, refs...) and side effects are scattered across useEffect hooks with dependency arrays that even humans get wrong constantly.',
      ),
      para(
        "If you've paired AI tools with strictly typed codebases and explicit patterns, you've likely seen this firsthand. The generated code feels almost inevitable given the constraints of the architecture and type system.",
      ),
      tableOfContentsEntryToHeader(builtOnEffectHeader),
      para(
        'Foldkit is built on ',
        link(Link.effect, 'Effect'),
        ', a powerful library for type-safe, composable programming in TypeScript.',
      ),
      ul(
        [Class('list-disc mb-6 space-y-2')],
        [
          li(
            [],
            [
              'Type-safe error handling',
              ' — Errors are tracked in the type system',
            ],
          ),
          li(
            [],
            [
              'Composable side effects',
              ' — Build complex operations from simple pieces',
            ],
          ),
          li(
            [],
            [
              'Schema validation',
              ' — Runtime type checking with ',
              inlineCode('Schema'),
            ],
          ),
          li(
            [],
            [
              'Subscriptions',
              ' — For timers, WebSockets, and other ongoing effects',
            ],
          ),
        ],
      ),
      para(
        'If you already know Effect, Foldkit feels natural. If you are new to Effect, Foldkit is a great way to learn it.',
      ),
      tableOfContentsEntryToHeader(whoItsForHeader),
      ul(
        [Class('list-disc mb-6 space-y-2')],
        [
          li(
            [],
            [
              'Elm developers',
              ' who need access to the TypeScript ecosystem',
            ],
          ),
          li(
            [],
            [
              'Effect users',
              ' who want a UI framework built on familiar patterns',
            ],
          ),
          li(
            [],
            [
              'React developers',
              ' tired of state management complexity',
            ],
          ),
          li(
            [],
            [
              'Teams',
              ' who value predictability and testability over flexibility',
            ],
          ),
        ],
      ),
      para(
        'Foldkit is not for everyone. If you enjoy the flexibility of the React ecosystem or prefer choosing your own patterns, other frameworks may be a better fit. But if you have ever wished for a more principled approach to frontend development, give Foldkit a try.',
      ),
    ],
  )
