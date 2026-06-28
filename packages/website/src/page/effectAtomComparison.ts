import { Html, html } from 'foldkit/html'

import type { TableOfContentsEntry } from '../main'
import type { Message } from '../message'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import {
  aiOverviewRouter,
  asyncDataRouter,
  coreCommandsRouter,
  coreCustomElementRouter,
  coreDevToolsRouter,
  coreEmbeddingRouter,
  coreManagedResourcesRouter,
  coreMessagesRouter,
  coreModelRouter,
  coreMountRouter,
  coreSubmodelRouter,
  coreSubscriptionsRouter,
  coreUpdateRouter,
  coreViewMemoizationRouter,
  reactComparisonRouter,
  testingRouter,
  testingSceneRouter,
  testingStoryRouter,
  uiOverviewRouter,
} from '../route'
import * as Snippet from '../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'
import { comparisonTable } from '../view/table'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const sharedFoundationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-they-share',
  text: 'What They Share',
}

const atomsVsModelHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'many-atoms-vs-one-model',
  text: 'Many Atoms vs One Model',
}

const howStateChangesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'how-state-changes',
  text: 'How State Changes',
}

const atomStateHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'atom-state',
  text: 'Effect Atom: setters at the call site',
}

const foldkitStateHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-state',
  text: 'Foldkit: one Message union, one update',
}

const asyncStateHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'async-state',
  text: 'Async State',
}

const atomAsyncHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'atom-async',
  text: 'Effect Atom: the Result type',
}

const foldkitAsyncHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-async',
  text: 'Foldkit: remote state in the Model',
}

const sideEffectsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'side-effects-and-lifecycle',
  text: 'Side Effects and Lifecycle',
}

const atomEffectHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'atom-effect',
  text: 'Effect Atom: effects live inside atoms',
}

const foldkitEffectHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-effect',
  text: 'Foldkit: Commands and Subscriptions',
}

const viewLayerHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-view-layer',
  text: 'The View Layer Is Still React',
}

const atomViewHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'atom-view',
  text: 'Effect Atom plus React',
}

const foldkitViewHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-view',
  text: 'Foldkit',
}

const timelineHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'one-timeline-vs-many-cells',
  text: 'One Timeline vs Many Cells',
}

const testingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'testing',
  text: 'Testing',
}

const scalingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'scaling-complexity',
  text: 'Scaling Complexity',
}

const aiHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'ai-assisted-development',
  text: 'AI-Assisted Development',
}

const whereAtomFitsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'practical-trade-offs',
  text: 'Practical Trade-offs',
}

const conclusionHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'conclusion',
  text: 'Conclusion',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  sharedFoundationHeader,
  atomsVsModelHeader,
  howStateChangesHeader,
  atomStateHeader,
  foldkitStateHeader,
  asyncStateHeader,
  atomAsyncHeader,
  foldkitAsyncHeader,
  sideEffectsHeader,
  atomEffectHeader,
  foldkitEffectHeader,
  viewLayerHeader,
  atomViewHeader,
  foldkitViewHeader,
  timelineHeader,
  testingHeader,
  scalingHeader,
  aiHeader,
  whereAtomFitsHeader,
  conclusionHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle(
        'foldkit-vs-react-effect-atom',
        'Foldkit vs React + Effect Atom',
      ),

      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'This page is for people who have already chosen Effect. ',
        link('https://github.com/tim-smart/effect-atom', 'Effect Atom'),
        ' is a reactive, atomic state-management library: state is a set of small cells, each an independent piece of state, read and written through a host view framework. The core is framework-agnostic, with bindings for React, Solid, and Vue; the framework does the rendering, and Effect Atom is the state layer. Foldkit is a framework. It owns its runtime, virtual DOM, and view layer, ships a routing module and a UI library, includes Story and Scene testing, and implements the Elm Architecture in TypeScript: one Model, one Message union, one update function, side effects as values returned to the runtime.',
      ),
      para(
        'So the difference is not a narrow one about where state lives. Adopting Effect Atom means building a React (or Solid, or Vue) app and reaching for atoms as the state layer. Adopting Foldkit means building a Foldkit app. They are different paradigms that happen to both use Effect.',
      ),
      infoCallout(
        'Related page',
        'This page assumes you are sold on Effect. If you are coming from plain React, the ',
        link(reactComparisonRouter(), 'Foldkit vs React'),
        ' comparison makes the broader case for this style of architecture.',
      ),

      tableOfContentsEntryToHeader(sharedFoundationHeader),
      para(
        'The common ground is Effect itself, and that is most of what they share. Both can express asynchronous work and side effects as Effect values: in Effect Atom you hand an Effect to ',
        inlineCode('Atom.make'),
        ' or ',
        inlineCode('runtime.fn'),
        '; in Foldkit you return a Command that wraps one. Both put errors in the type signature, both use Schema for validation at the boundary, and both lean on Layers and structured concurrency. Above that foundation they diverge completely. Effect Atom is the state layer and defers rendering, the component model, and routing to its host framework; Foldkit owns the whole stack, from its runtime and virtual DOM up through routing and its UI library.',
      ),

      tableOfContentsEntryToHeader(atomsVsModelHeader),
      para(
        'An atom is a reactive container for one value. You create it with ',
        inlineCode('Atom.make'),
        ', read it with ',
        inlineCode('useAtomValue'),
        ', write it with ',
        inlineCode('useAtomSet'),
        ', and derive new atoms from existing ones with ',
        inlineCode('get'),
        '. The registry tracks dependencies between atoms and re-renders the components that read a changed atom.',
      ),
      para(
        'State is therefore distributed by design, and that distribution is the point: a feature owns its atoms, adding one touches no shared file, and independent features evolve without coordinating through a common update. Ten features mean a spread of atoms, each an independent piece of state, each writable from any component that imports it. There is no single value that is “the state of the app,” and no single place that enumerates how it can change. This is the atomic model working as intended, the same as ',
        link('https://jotai.org', 'Jotai'),
        '.',
      ),
      para(
        'Foldkit centralizes by design. The ',
        link(coreModelRouter(), 'Model'),
        ' is one value. The ',
        link(coreMessagesRouter(), 'Message'),
        ' union is the closed set of facts that can change it. The ',
        link(coreUpdateRouter(), 'update'),
        ' function is the only place those transitions are defined. Those three facts are framework constraints, not conventions you maintain by discipline. The properties Foldkit claims downstream (a complete index of state transitions, ',
        link(coreDevToolsRouter(), 'a single replayable timeline'),
        ', ',
        link(testingRouter(), 'tests with nothing to mock'),
        ') follow from that one constraint.',
      ),

      tableOfContentsEntryToHeader(howStateChangesHeader),
      para(
        'Start with the most common operation in any frontend app: changing state. The difference shows up immediately, and it is the difference everything else rests on.',
      ),
      tableOfContentsEntryToHeader(atomStateHeader),
      para(
        'With Effect Atom, a write is a setter from ',
        inlineCode('useAtomSet'),
        ', usually called with an inline updater function. The transition is whatever closure you pass, defined wherever the button lives.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareAtomStateHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareAtomStateRaw,
        'Copy Effect Atom state',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Each transition is an anonymous function: ',
        inlineCode('(todos) => [...todos, emptyTodo()]'),
        ' in one component, ',
        inlineCode('(todos) => todos.filter(...)'),
        ' in another. There is no name for “add a todo,” no value that represents it, and no one place that lists every way ',
        inlineCode('todosAtom'),
        ' can change. To answer that, you grep for ',
        inlineCode('useAtomSet(todosAtom)'),
        ' and read the closures at each call site. You can encapsulate these writes into named functions, so “add a todo” has a name and one home. Nothing forces the inline scatter. The difference is enforcement: Foldkit makes the single catalog mandatory, where an atom app keeps it by convention.',
      ),
      tableOfContentsEntryToHeader(foldkitStateHeader),
      para(
        'In Foldkit the same three transitions are three Messages, handled in one update function. The Message union is the complete catalog; ',
        inlineCode('M.tagsExhaustive'),
        ' makes a forgotten case a compile error.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareFoldkitStateHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareFoldkitStateRaw,
        'Copy Foldkit state',
        copiedSnippets,
        'mb-6',
      ),
      para(
        inlineCode('AddedTodo'),
        ', ',
        inlineCode('ClearedDoneTodos'),
        ', and ',
        inlineCode('SelectedFilter'),
        ' are facts with names. They flow through one function, show up in ',
        link(coreDevToolsRouter(), 'DevTools'),
        ', and drive ',
        link(testingRouter(), 'Story and Scene tests'),
        '. “How can the todo list change?” is answered by reading one Message union and one update function, and ',
        inlineCode('M.tagsExhaustive'),
        ' makes that answer total: forget a case and the code stops compiling. That holds the same way at the hundredth Message as at the first.',
      ),

      tableOfContentsEntryToHeader(asyncStateHeader),
      para(
        'Effect Atom has a built-in model for async state. Foldkit folds remote state into the Model like any other field.',
      ),
      tableOfContentsEntryToHeader(atomAsyncHeader),
      para(
        'Hand an Effect to ',
        inlineCode('Atom.make'),
        ' (or ',
        inlineCode('runtime.atom'),
        ', as in the snippet below, when the Effect needs Layer-provided services) and you get back an atom whose value is a ',
        inlineCode('Result'),
        ': ',
        inlineCode('Initial'),
        ', ',
        inlineCode('Success'),
        ', or ',
        inlineCode('Failure'),
        ', each carrying a ',
        inlineCode('waiting'),
        ' flag for in-flight refreshes. The Effect runs lazily, the first time a mounted component reads the atom; from there the runtime caches the Result, tracks dependencies, and re-runs on refresh. ',
        inlineCode('Result.builder'),
        ' renders each state.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareAtomAsyncHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareAtomAsyncRaw,
        'Copy Effect Atom async',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Effect Atom handles loading, error, stale-while-revalidate, and Suspense integration for you. With ',
        inlineCode('Atom.family'),
        ', ',
        inlineCode('Atom.runtime'),
        ' for Layer-provided services, and helpers like ',
        inlineCode('AtomHttpApi'),
        ' and ',
        inlineCode('AtomRpc'),
        ', it is a full data-fetching layer, not just a state primitive. Foldkit draws the line in a different place, as the next section shows: it ships the value type for remote state but not the fetching runtime around it.',
      ),
      tableOfContentsEntryToHeader(foldkitAsyncHeader),
      para(
        'Foldkit has no atoms, async or otherwise. Remote state is an ordinary value in the Model, and Foldkit ships ',
        link(asyncDataRouter(), 'AsyncData'),
        ' to model it: a six-state union that makes loading, failure, stale-while-revalidate, and keep-stale-on-failure first-class states. You fire a ',
        link(coreCommandsRouter(), 'Command'),
        ' and fold its result back through update as a Message.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareFoldkitAsyncHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareFoldkitAsyncRaw,
        'Copy Foldkit async',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'AsyncData carries the loading, failure, and stale states; the fetch is a named Command you can assert on; and the transitions (',
        inlineCode('ClickedLoadUser'),
        ', ',
        inlineCode('SucceededLoadUser'),
        ', ',
        inlineCode('FailedLoadUser'),
        ') are the same kind of fact as every other change in the app. Effect Atom’s Result lives in the registry, reactive but off to the side. Foldkit’s remote state lives in the Model, so it time-travels, serializes, and tests like anything else. What Effect Atom bundles that Foldkit does not is the fetching runtime: automatic execution, a keyed cache, request deduplication, background refresh, and Suspense. For a dashboard of independent queries, that machinery does a lot for you out of the box. For remote state that interacts with the rest of the app, keeping it in the one Model means it shares the same timeline, tools, and tests as everything else.',
      ),

      tableOfContentsEntryToHeader(sideEffectsHeader),
      para(
        'In both, effects can be Effect values. What differs is where an effect is declared and how you find all of them.',
      ),
      tableOfContentsEntryToHeader(atomEffectHeader),
      para(
        'In Effect Atom, an effect lives inside the atom that produces it. A mutation is a function atom from ',
        inlineCode('runtime.fn'),
        ', often tagged with ',
        inlineCode('reactivityKeys'),
        ' so that finishing it invalidates the atoms that depend on those keys. A subscription to the outside world is an atom that wires a listener in its body and tears it down with ',
        inlineCode('addFinalizer'),
        ', kept alive by ',
        inlineCode('useAtomMount'),
        '.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareAtomEffectHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareAtomEffectRaw,
        'Copy Effect Atom effects',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'The inventory is distributed: to list every effect the app can perform, you read every atom, because any atom may run one. And the connection between “this changed” and “that refreshed” is the ',
        inlineCode('reactivityKeys'),
        ' array, matched by value at runtime, not a type the compiler can check.',
      ),
      tableOfContentsEntryToHeader(foldkitEffectHeader),
      para(
        'Foldkit splits effects by what causes them. A ',
        link(coreCommandsRouter(), 'Command'),
        ' is a named Effect, returned from update as a value. A ',
        link(coreSubscriptionsRouter(), 'Subscription'),
        ' binds a slice of the Model to a scoped ',
        inlineCode('Stream<Message>'),
        '. The runtime runs that stream for as long as the slice holds its value and closes the scope, finalizers and all, when it changes. There is no subscribe, unsubscribe, or cleanup to write by hand.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareFoldkitEffectHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareFoldkitEffectRaw,
        'Copy Foldkit effects',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'The win is locational. Foldkit’s effects come from a small, fixed set of primitives, each with a declared home: a Command returned from update, a Model-gated Subscription, a per-element ',
        link(coreMountRouter(), 'Mount'),
        ' in the view, or a longer-lived ',
        link(coreManagedResourcesRouter(), 'ManagedResource'),
        '. Each is a named primitive you can enumerate, not something any atom might run. And the ',
        inlineCode('mouseRelease'),
        ' Subscription never goes stale, because its stream reads the current Model slice rather than a value captured once at mount.',
      ),

      tableOfContentsEntryToHeader(viewLayerHeader),
      para(
        'Here is the part Effect Atom does not change: your views are React components. Effect Atom moves state and a good deal of effect logic into atoms. The view layer stays where it found it, with the hooks rules, the render model, and the closure traps intact.',
      ),
      tableOfContentsEntryToHeader(atomViewHeader),
      para(
        'A list item that toggles a todo, modeled as one array atom to mirror Foldkit’s one array of todos, needs ',
        inlineCode('memo'),
        ' to avoid re-rendering, ',
        inlineCode('useCallback'),
        ' to keep its handler reference stable, and a dependency array to declare. A per-item atom would re-render each row on its own and need none of it.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareAtomViewHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareAtomViewRaw,
        'Copy Effect Atom view',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Atom-level subscriptions mean Effect Atom often needs less memoization than a ',
        inlineCode('useReducer'),
        ' app. But the React machinery is still present: the rules of hooks, the memoization you maintain by hand, and the dependency arrays. The ',
        inlineCode('react-hooks/exhaustive-deps'),
        ' lint rule catches the common mistakes, but it is a lint rule you have to run and heed, not a property of the type system.',
      ),
      tableOfContentsEntryToHeader(foldkitViewHeader),
      para(
        'The same item in Foldkit is a plain function returning data. The event is a Message value, not a closure, so there is nothing to stabilize and nothing to memoize at the boundary.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareFoldkitViewHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareFoldkitViewRaw,
        'Copy Foldkit view',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'No ',
        inlineCode('memo'),
        ', no ',
        inlineCode('useCallback'),
        ', no dependency array, no hooks rules. When you need to skip work, ',
        link(coreViewMemoizationRouter(), 'view memoization'),
        ' keys off the data, and because the view always receives the current Model, there is no closure to go stale.',
      ),

      tableOfContentsEntryToHeader(timelineHeader),
      para(
        'Because every Foldkit state change is one Message through one function, the app has a single timeline: an ordered sequence of Messages that, replayed from the initial Model through update, reconstruct every Model the app passed through and the Commands each produced. ',
        link(coreDevToolsRouter(), 'Foldkit DevTools'),
        ' replays that timeline. You scrub backward and watch the exact Model at each step, including the internals of ',
        link(uiOverviewRouter(), 'Foldkit UI'),
        ' components. This site runs on Foldkit; open its DevTools with the DEV button in the bottom-right corner to try it on the page you are reading.',
      ),
      para(
        'Effect Atom’s state is many cells in a registry. Each cell has a current value you can inspect. What there is not is a single ordered log of named events for the whole app, because there are no named events and no single owner of order. You can see what every atom holds now. You cannot replay the app as one sequence of facts, because the facts were anonymous closures distributed across components.',
      ),

      tableOfContentsEntryToHeader(testingHeader),
      para(
        'Foldkit’s update function is pure: given a Model and a Message, it returns the next Model and a list of Commands, with no DOM, no HTTP, no timers. That shape is what makes its two ',
        link(testingRouter(), 'testing'),
        ' primitives possible.',
      ),
      para(
        link(testingStoryRouter(), 'Story'),
        ' tests the state machine. You send Messages straight through update, resolve Commands inline by handing back the result Message you choose, and assert on the Model. Take the user-load flow from the async section: send ',
        inlineCode('ClickedLoadUser'),
        ', assert the ',
        inlineCode('FetchUser'),
        ' Command fired, resolve it, and check the Model landed on ',
        inlineCode('Success'),
        '. A Command is a value, so the test names it without running it, and a Command left unresolved fails the test. There is nothing to mock, because there is nothing imperative to intercept. Modeling side effects as inspectable values is what makes that possible.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareFoldkitStoryHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareFoldkitStoryRaw,
        'Copy Foldkit Story test',
        copiedSnippets,
        'mb-6',
      ),
      para(
        link(testingSceneRouter(), 'Scene'),
        ' tests the same flow through the rendered view. It finds elements by accessible role, label, and text, dispatches events through the real update function, and resolves Commands inline, all synchronously and without jsdom. The view and update run through the same pipeline the runtime uses in production.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareFoldkitSceneHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareFoldkitSceneRaw,
        'Copy Foldkit Scene test',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'With Effect Atom, the update logic lives in inline closures and atom bodies, and the view is React. You can drive an atom’s underlying Effect in isolation, but to test the behavior a user sees you render the component and interact with it through ',
        inlineCode('@testing-library/react'),
        ' and jsdom, the same stack a plain React app uses. Here is the same user-load flow:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.atomCompareAtomTestHighlighted),
          ],
          [],
        ),
        Snippet.atomCompareAtomTestRaw,
        'Copy React Testing Library test',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'That is jsdom, a stubbed network boundary, and an async ',
        inlineCode('findByText'),
        ' that polls until the ',
        inlineCode('Result'),
        ' resolves and React re-renders. The two Foldkit tests above run synchronously: no DOM to boot, no polling to wait on, nothing mocked. They assert on the ',
        inlineCode('FetchUser'),
        ' Command as a value instead of intercepting the call behind it.',
      ),

      tableOfContentsEntryToHeader(scalingHeader),
      para(
        'Both models scale, but they accumulate different things. An Effect Atom app grows a dependency graph of atoms plus a set of ',
        inlineCode('reactivityKeys'),
        ' that wire mutations to refreshes. Adding an atom is cheap and local, changing no existing atom, and each atom declares its own dependencies where it is defined. What no single place shows is the whole graph, and the reactivity keys that tie mutations to refreshes are matched by value at runtime, so the compiler cannot verify they line up.',
      ),
      para(
        'A Foldkit app grows by adding Messages, Commands, and Subscriptions to structures that already exist. The hundredth Message is handled in the same update function as the first, found by the same exhaustive match, replayed in the same ',
        link(coreDevToolsRouter(), 'DevTools'),
        '. Each feature adds more of the same structures, not new coordination between the ones already there. The ceiling on a single update function is real, and you split it with ',
        link(coreSubmodelRouter(), 'Submodels'),
        ', each its own little Model, Message union, and update, though composing them adds wiring of its own. What you add is always more of what you already understand, indexed by types that stop compiling when you miss a case.',
      ),

      tableOfContentsEntryToHeader(aiHeader),
      para(
        'This axis matters more every year. A coding agent is at its best when the code has one shape and the types narrow the search, and Foldkit is aggressively, unapologetically uniform. State changes are Messages, the input domain is the Message union, one-shot side effects are Commands, and state transitions live in one exhaustive function. An agent asked to add a feature reads the Message union to learn every fact the app can handle, adds a variant, and ',
        inlineCode('M.tagsExhaustive'),
        ' turns every place that now must handle it into a compile error. The type system hands the agent its to-do list.',
      ),
      para(
        'An Effect Atom app gives an agent a harder map of the whole. State lives in atoms across many files, transitions are inline closures at call sites, and effects live inside atoms; each atom declares its own dependencies, but no single place shows the graph, and the ',
        inlineCode('reactivityKeys'),
        ' that tie mutations to refreshes are runtime values, not types the compiler can check. To change behavior safely the agent reconstructs that picture from reads scattered across the codebase.',
      ),
      para(
        'The natural worry is familiarity: React is far more represented in the training data than Foldkit. In practice it barely shows. Foldkit is the Elm Architecture in TypeScript, so an agent knows the shape from Elm and only the syntax is new, and the view is plain typed function calls and the update is pure functions over data, so there is little to get wrong. ',
        link(
          aiOverviewRouter(),
          'Skills, an MCP server, and a vendored copy of the Foldkit source',
        ),
        ' carry the idioms, the source most of all. The same shape that makes the code legible to a new human teammate (one place state changes, exhaustiveness as a checklist) is what makes it legible to an agent.',
      ),

      tableOfContentsEntryToHeader(whereAtomFitsHeader),
      para('Architecture aside, a few practical factors weigh on the choice.'),
      comparisonTable(
        ['', 'React + Effect Atom', 'Foldkit'],
        [
          [
            ['Ecosystem'],
            [
              'The entire React ecosystem: components, tooling, and the hiring pool',
            ],
            [
              'Young but growing; batteries-included ',
              link(uiOverviewRouter(), 'Foldkit UI'),
              '; ',
              link(coreMountRouter(), 'Mount'),
              ' and ',
              link(coreCustomElementRouter(), 'CustomElement'),
              ' for third-party interop',
            ],
          ],
          [
            ['Incremental adoption'],
            ['Add one atom to an existing React app'],
            [
              'Owns the whole app, though ',
              link(coreEmbeddingRouter(), 'Embedding'),
              ' mounts it inside one',
            ],
          ],
          [
            ['Data fetching'],
            ['Batteries included: Result, SWR, Suspense, HTTP/RPC'],
            [
              link(asyncDataRouter(), 'AsyncData'),
              ' for the six states; the fetch, cache, and refetch are yours to model with a Command and the Model',
            ],
          ],
          [
            ['Fine-grained reactivity'],
            ['Only the components reading a changed atom re-render'],
            [
              'Top-down render with a virtual DOM diff and ',
              link(coreViewMemoizationRouter(), 'view memoization'),
            ],
          ],
          [
            ['View familiarity'],
            ['JSX and the patterns every React dev knows'],
            ['A typed function-call DSL reminiscent of Elm'],
          ],
        ],
      ),
      tableOfContentsEntryToHeader(conclusionHeader),
      para(
        'Both Effect Atom and Foldkit are built on Effect, and that is where the resemblance ends. Effect Atom is a state layer for a host view framework: it distributes state across reactive cells wired into React (or Solid, or Vue), optimizing for incremental adoption, fine-grained updates, and built-in data fetching. Foldkit is a framework of its own: it centralizes state into one Model changed by one update function, optimizing for a complete index of state transitions, ',
        link(coreDevToolsRouter(), 'a single replayable timeline'),
        ', ',
        link(testingRouter(), 'tests with nothing to mock'),
        ', and a shape that humans and coding agents can hold in their heads.',
      ),
      para(
        'These are different paradigms on a shared Effect foundation. Effect Atom keeps you in React and its ecosystem, adopts one atom at a time, and brings fine-grained updates and data fetching for free. Foldkit asks for the whole app and gives back one Model, one update, and everything that follows. Which one fits depends on what you are building.',
      ),
    ],
  )
}
