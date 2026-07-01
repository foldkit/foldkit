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
  whyNoJsxRouter,
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
  id: 'atoms-vs-one-model',
  text: 'Atoms vs One Model',
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
        ' is a reactive, atomic state-management library: state is a set of small cells, each its own source of truth, read and written through a host view framework. The core is framework-agnostic, with bindings for React, Solid, and Vue; the framework does the rendering, and Effect Atom is the state layer. Foldkit is a full framework. It brings its own runtime, virtual DOM, router, and component model, and implements the Elm Architecture in TypeScript: one Model, one Message union, one update function, side effects as values returned to the runtime.',
      ),
      para(
        'So this is not a narrow disagreement about where state lives. Adopting Effect Atom means building a React (or Solid, or Vue) app and reaching for atoms as the state layer. Adopting Foldkit means building a Foldkit app. They are different paradigms that happen to rest on one shared foundation, Effect. This page lays out the difference concretely.',
      ),
      infoCallout(
        'Two related pages',
        'This page assumes you are sold on Effect. If you are coming from plain React, the ',
        link(reactComparisonRouter(), 'Foldkit vs React'),
        ' comparison makes the broader case for this style of architecture. And since Foldkit’s lack of JSX is the usual first objection, ',
        link(whyNoJsxRouter(), 'Why no JSX?'),
        ' answers it directly.',
      ),

      tableOfContentsEntryToHeader(sharedFoundationHeader),
      para(
        'The common ground is Effect itself, and that is most of what they share. Both express asynchronous work and side effects as Effect values: in Effect Atom you hand an Effect to ',
        inlineCode('Atom.make'),
        ' or ',
        inlineCode('runtime.fn'),
        '; in Foldkit you return a Command that wraps one. Both put errors in the type signature, both use Schema for validation at the boundary, and both lean on Layers and structured concurrency. Above that foundation they diverge completely. Effect Atom is the state layer and defers rendering, the component model, and routing to its host framework; Foldkit owns its runtime, virtual DOM, router, and component model. So the question this page works through is not a small one. It is what you get from a reactive store inside React versus a single Model inside a framework of its own.',
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
        'State is therefore distributed by design. Ten features mean a spread of atoms, each its own source of truth, each writable from any component that imports it. There is no single value that is “the state of the app,” and no single place that enumerates how it can change. This is the atomic model working as intended, the same as ',
        link('https://jotai.org', 'Jotai'),
        ' or Recoil.',
      ),
      para(
        'Foldkit makes the opposite choice. The ',
        link(coreModelRouter(), 'Model'),
        ' is one value. The ',
        link(coreMessagesRouter(), 'Message'),
        ' union is the only way to change it. The ',
        link(coreUpdateRouter(), 'update'),
        ' function is the only place it changes. Those three facts are framework constraints, not conventions you maintain by discipline. The properties Foldkit claims downstream (a complete index of state transitions, ',
        link(coreDevToolsRouter(), 'a single replayable timeline'),
        ', ',
        link(testingRouter(), 'tests with nothing to mock'),
        ') follow from that one constraint.',
      ),

      tableOfContentsEntryToHeader(howStateChangesHeader),
      para(
        'Start with the most common operation in any app: changing state. The difference shows up immediately, and it is the difference everything else rests on.',
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
        ' and read the closures at each call site.',
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
        ', and replay in ',
        link(testingRouter(), 'tests'),
        '. The cost is real: more ceremony than an inline setter for a three-line app. The payoff is that “how can the todo list change?” has a single, total answer, and it scales: the hundredth Message is found the same way as the first.',
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
        ' flag for in-flight refreshes. The runtime runs the Effect, caches the Result, tracks dependencies, and re-runs on refresh. ',
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
        'Effect Atom handles loading, error, stale-while-revalidate, retries, and Suspense integration for you. With ',
        inlineCode('Atom.family'),
        ', ',
        inlineCode('Atom.runtime'),
        ' for Layer-provided services, and helpers like ',
        inlineCode('AtomHttpApi'),
        ' and ',
        inlineCode('AtomRpc'),
        ', it is a full data-fetching layer, not just a state primitive. Foldkit ships nothing as turnkey here.',
      ),
      tableOfContentsEntryToHeader(foldkitAsyncHeader),
      para(
        'Foldkit has no atoms, async or otherwise. Remote state is an ordinary value in the Model. You fire a ',
        link(coreCommandsRouter(), 'Command'),
        ', and fold its result back through update as a Message.',
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
        'This is more code. What you get for it is that the loading state is an ordinary field of the one Model, the fetch is a named Command you can assert on, and the transitions (',
        inlineCode('ClickedLoadUser'),
        ', ',
        inlineCode('SucceededLoadUser'),
        ', ',
        inlineCode('FailedLoadUser'),
        ') are the same kind of fact as every other change in the app. Effect Atom’s Result lives in the registry, reactive but off to the side. Foldkit’s remote state lives in the Model, so it time-travels, serializes, and tests like anything else. For a dashboard of independent queries, Effect Atom’s built-in model is less code. For state that interacts with the rest of the app, the uniformity compounds.',
      ),

      tableOfContentsEntryToHeader(sideEffectsHeader),
      para(
        'Both libraries express effects as Effect values. They differ on where an effect is declared and how you find all of them.',
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
        ' array, matched by value at runtime, which the compiler does not check. It is a dependency array by another name.',
      ),
      tableOfContentsEntryToHeader(foldkitEffectHeader),
      para(
        'Foldkit splits effects by what causes them. A ',
        link(coreCommandsRouter(), 'Command'),
        ' is an effect caused by a Message, returned from update as data. A ',
        link(coreSubscriptionsRouter(), 'Subscription'),
        ' binds a slice of the Model to a scoped Stream of Messages. The runtime runs that stream for as long as the slice holds its value and closes the scope, finalizers and all, when it changes. There is no subscribe, unsubscribe, or cleanup to write by hand.',
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
        ' in the view, a longer-lived ',
        link(coreManagedResourcesRouter(), 'ManagedResource'),
        ', or a ',
        link(coreCustomElementRouter(), 'CustomElement'),
        '. Each is a named primitive you can enumerate, not something any atom might run. And the ',
        inlineCode('mouseRelease'),
        ' Subscription never goes stale, because its stream reads the current Model slice rather than a value captured once at mount.',
      ),

      tableOfContentsEntryToHeader(viewLayerHeader),
      para(
        'Here is the part Effect Atom does not change: your views are React components. Effect Atom moves state and effects into Effect. The view layer stays where it found it, with the hooks rules, the render model, and the closure traps intact.',
      ),
      tableOfContentsEntryToHeader(atomViewHeader),
      para(
        'A list item that toggles a todo still needs ',
        inlineCode('memo'),
        ' to avoid re-rendering, ',
        inlineCode('useCallback'),
        ' to keep its handler reference stable, and a dependency array you have to get right.',
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
        ', no dependency array, no hooks rules. When you need to skip work, view memoization keys off the data, and because the view always receives the current Model, there is no closure to go stale.',
      ),

      tableOfContentsEntryToHeader(timelineHeader),
      para(
        'Because every Foldkit state change is one Message through one function, the app has a single timeline: an ordered sequence of Messages, the Model snapshot after each, and the Commands each produced. ',
        link(coreDevToolsRouter(), 'Foldkit DevTools'),
        ' replays that timeline. You scrub backward and watch the exact Model the app passed through, including the internals of ',
        link(uiOverviewRouter(), 'Foldkit UI'),
        ' components.',
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
        ' tests the state machine. You send Messages straight through update, resolve Commands inline by handing back the Message they would produce, and assert on the Model. Take the user-load flow from the async section: send ',
        inlineCode('ClickedLoadUser'),
        ', assert the ',
        inlineCode('FetchUser'),
        ' Command fired, resolve it, and check the Model landed on ',
        inlineCode('Loaded'),
        '. A Command is a value, so the test names it without running it, and a Command left unresolved fails the test. There is nothing to mock, because there is nothing imperative to intercept.',
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
        ' resolves and React re-renders. The two Foldkit tests above run synchronously, with no DOM and nothing mocked, and assert on the ',
        inlineCode('FetchUser'),
        ' Command as a value instead of intercepting the call behind it.',
      ),

      tableOfContentsEntryToHeader(scalingHeader),
      para(
        'Both models scale; they accumulate different things. An Effect Atom app grows a dependency graph of atoms plus a set of ',
        inlineCode('reactivityKeys'),
        ' that wire mutations to refreshes. Each atom is simple, and adding one is cheap. What grows is the implicit graph: which atoms depend on which, which keys invalidate which, which writers touch a shared atom. The keys are matched by value at runtime, so the compiler cannot verify they line up.',
      ),
      para(
        'A Foldkit app grows by adding Messages, Commands, and Subscriptions to structures that already exist. The hundredth Message is handled in the same update function as the first, found by the same exhaustive match, replayed in the same ',
        link(coreDevToolsRouter(), 'DevTools'),
        '. The cost scales roughly linearly: each feature adds more of the same structures, not new coordination between existing ones. The ceiling on a single update function is real, and you split it with ',
        link(coreSubmodelRouter(), 'Submodels'),
        ', each its own little Model, Message union, and update. The growth cost is uniform: more of structures you already understand, indexed by types that stop compiling when you miss a case.',
      ),

      tableOfContentsEntryToHeader(aiHeader),
      para(
        'This axis matters more every year, and it favors Foldkit for a structural reason. A coding agent is at its best when the code has one shape and the types narrow the search. Foldkit is aggressively, unapologetically uniform: state changes are Messages, the input domain is the Message union, one-shot side effects are Commands, and the transitions are one exhaustive function. An agent asked to add a feature reads the Message union to learn every event that exists, adds a variant, and ',
        inlineCode('M.tagsExhaustive'),
        ' turns every place that now must handle it into a compile error. The type system hands the agent its to-do list.',
      ),
      para(
        'An Effect Atom app gives an agent a harder map. State lives in atoms across many files; transitions are inline closures at call sites; effects live inside atoms; the dependency graph and the ',
        inlineCode('reactivityKeys'),
        ' are implicit. To change behavior safely, the agent has to reconstruct that graph from reads scattered across the codebase, and the reactivity keys are runtime values the compiler cannot check. The same property that makes the architecture legible to a new human teammate (one place state changes, exhaustiveness as a checklist) is what makes it legible to an LLM. Foldkit ships ',
        link(aiOverviewRouter(), 'skills and an MCP server'),
        ' that lean directly on this uniformity.',
      ),

      tableOfContentsEntryToHeader(whereAtomFitsHeader),
      para(
        'Architecture aside, a few practical factors weigh on the choice, and several of them favor React + Effect Atom.',
      ),
      comparisonTable(
        ['', 'React + Effect Atom', 'Foldkit'],
        [
          [
            ['Ecosystem'],
            ['The entire React component and tooling universe'],
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
              'Model it yourself: a Command and a Model field, or a Subscription for polling',
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
      para(
        'If you have an existing React codebase or a team fluent in JSX, React + Effect Atom is likely the right tool. Incremental adoption alone settles many real migrations: you can add a single atom to a React app this afternoon, where adopting Foldkit means ',
        link(coreEmbeddingRouter(), 'Embedding'),
        ' it or investing in it fully.',
      ),

      tableOfContentsEntryToHeader(conclusionHeader),
      para(
        'Both are built on Effect, and that is where the resemblance ends. Effect Atom is a state layer for a host view framework: it distributes state across reactive cells wired into React (or Solid, or Vue), optimizing for incremental adoption, fine-grained updates, and built-in data fetching. Foldkit is a framework of its own: it centralizes state into one Model changed by one update function, optimizing for a complete index of state transitions, ',
        link(coreDevToolsRouter(), 'a single replayable timeline'),
        ', ',
        link(testingRouter(), 'tests with nothing to mock'),
        ', and a shape that humans and coding agents can hold in their heads.',
      ),
      para(
        'These are different paradigms on a shared Effect foundation, not two takes on the same one. The right choice is the one whose properties match what you are building.',
      ),
    ],
  )
}
