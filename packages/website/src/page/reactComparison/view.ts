import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { TableOfContentsEntry } from '../../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { exampleDetailRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'
import { comparisonTable } from '../../view/table'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const whatDoesThisAppDoHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-does-this-app-do',
  text: 'What Does This App Do?',
}

const foldkitMessageHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-message',
  text: 'Foldkit Message union (30 Messages)',
}

const reactActionHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'react-action',
  text: 'React Action type (19 actions)',
}

const declarationVsProcedureHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'declaration-vs-procedure',
  text: 'Declaration vs Procedure',
}

const reactAppHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'react-app',
  text: 'React App component',
}

const foldkitProgramHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-program',
  text: 'Foldkit program',
}

const stateManagementHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'state-management',
  text: 'Complete State Ownership',
}

const foldkitModelHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-model',
  text: 'Foldkit Model (20 fields)',
}

const reactStateHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'react-state',
  text: 'React State (14 fields)',
}

const completeAnswerHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-complete-answer',
  text: 'The Complete Answer',
}

const foldkitUpdateHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-update',
  text: 'Foldkit update (state + side effects)',
}

const reactReducerHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'react-reducer',
  text: 'React reducer (state only)',
}

const sideEffectsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'side-effects',
  text: 'Side Effects as Data',
}

const foldkitCommandHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-command',
  text: 'Foldkit Command (effect as a named, inspectable value)',
}

const reactUseEffectHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'react-useeffect',
  text: 'React useEffect (effect as an implicit reaction)',
}

const whatYourTestsCanSeeHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-your-tests-can-see',
  text: 'What Your Tests Can See',
}

const foldkitTestHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-test',
  text: 'Foldkit test (state + side effects in one story)',
}

const reactTestHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'react-test',
  text: 'React test (state only)',
}

const reactSideEffectTestHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'react-side-effect-test',
  text: 'React test (side effects require mocking + DOM + async)',
}

const interactionTestingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'interaction-testing',
  text: 'Interaction Testing Without a DOM',
}

const foldkitSceneTestHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-scene-test',
  text: 'Foldkit Scene test (virtual DOM, synchronous)',
}

const reactSceneTestHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'react-scene-test',
  text: 'React Testing Library (jsdom, mocking, imperative)',
}

const streamsVsHooksHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'streams-vs-hooks',
  text: 'Streams vs Hooks',
}

const foldkitSubscriptionsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-subscriptions',
  text: 'Foldkit Subscriptions',
}

const reactHooksHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'react-hooks',
  text: 'React hooks',
}

const yourStateOrTheirsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'your-state-or-theirs',
  text: 'Your State or Theirs',
}

const renderingPerformanceHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'rendering-performance',
  text: 'Rendering Performance',
}

const foldkitMemoizationHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-memoization',
  text: 'Foldkit memoization (data at the boundary)',
}

const reactMemoizationHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'react-memoization',
  text: 'React memoization (closures at the boundary)',
}

const guaranteesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'guarantees',
  text: 'Guarantees React Cannot Provide',
}

const auditLogHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'audit-log',
  text: 'A complete audit log',
}

const exhaustiveMatchingHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'safe-evolution',
  text: 'Safe evolution',
}

const visibleEffectsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'visible-effects',
  text: 'Side effects you can see',
}

const timeTravelHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'time-travel',
  text: 'Time-travel debugging that covers everything',
}

const storyTestsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'side-effect-testing-for-free',
  text: 'Side effect testing for free',
}

const oneFunctionHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'one-update-function',
  text: 'One update function, one source of truth',
}

const noStaleClosuresHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'no-stale-closures',
  text: 'No stale closures',
}

const scalabilityHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'scalability',
  text: 'Which Scales Better?',
}

const remotePersistenceHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'remote-persistence',
  text: 'Remote persistence',
}

const multiplayerHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'multiplayer',
  text: 'Multiplayer editing',
}

const animationTimelineHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'animation-timeline',
  text: 'Animation timeline',
}

const persistentUndoHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'persistent-undo',
  text: 'Persistent undo history',
}

const conclusionHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'conclusion',
  text: 'Conclusion',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  whatDoesThisAppDoHeader,
  foldkitMessageHeader,
  reactActionHeader,
  declarationVsProcedureHeader,
  reactAppHeader,
  foldkitProgramHeader,
  stateManagementHeader,
  foldkitModelHeader,
  reactStateHeader,
  completeAnswerHeader,
  foldkitUpdateHeader,
  reactReducerHeader,
  sideEffectsHeader,
  foldkitCommandHeader,
  reactUseEffectHeader,
  whatYourTestsCanSeeHeader,
  foldkitTestHeader,
  reactTestHeader,
  reactSideEffectTestHeader,
  interactionTestingHeader,
  foldkitSceneTestHeader,
  reactSceneTestHeader,
  streamsVsHooksHeader,
  foldkitSubscriptionsHeader,
  reactHooksHeader,
  yourStateOrTheirsHeader,
  renderingPerformanceHeader,
  foldkitMemoizationHeader,
  reactMemoizationHeader,
  guaranteesHeader,
  auditLogHeader,
  exhaustiveMatchingHeader,
  visibleEffectsHeader,
  timeTravelHeader,
  storyTestsHeader,
  oneFunctionHeader,
  noStaleClosuresHeader,
  scalabilityHeader,
  remotePersistenceHeader,
  multiplayerHeader,
  animationTimelineHeader,
  persistentUndoHeader,
  conclusionHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle(
        'foldkit-vs-react-side-by-side',
        'Foldkit vs React: Side by Side',
      ),

      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'We built the same ',
        link(
          exampleDetailRouter({ exampleSlug: 'pixel-art' }),
          'pixel art editor',
        ),
        ' (',
        link('https://pixel.foldkit.dev', 'try it live'),
        ') in both Foldkit and React. Same features, same styling, same algorithms. The goal: compare the two approaches side by side and highlight where they differ. This is a non-trivial app: grid state with undo/redo stacks, three tools with mirror modes, flood fill, localStorage persistence, PNG export, keyboard shortcuts, accessible UI components, and performance-critical grid rendering. It\u2019s the kind of app where architectural decisions compound over time.',
      ),
      para(
        'The React version uses ',
        inlineCode('useReducer'),
        ', ',
        link('https://headlessui.com', 'Headless UI'),
        ', and all the best practices we\u2019d use in production: TypeScript, Tailwind, memoization, custom hooks. We gave React every advantage. The result is a clean, well-structured app. And Foldkit is still better in nearly every way that matters.',
      ),
      para(
        'Not because React is bad. React is a good library. But Foldkit gives you structural guarantees that React\u2019s component model is architecturally incapable of providing. Those guarantees are what separate a codebase you can maintain with confidence from one you maintain with hope.',
      ),
      infoCallout(
        'Try them both',
        'The Foldkit version is in the ',
        link(
          exampleDetailRouter({ exampleSlug: 'pixel-art' }),
          'examples gallery',
        ),
        '. The ',
        link(
          'https://github.com/foldkit/foldkit/tree/main/comparisons/pixel-art-react',
          'React version source',
        ),
        ' is on GitHub.',
      ),

      tableOfContentsEntryToHeader(whatDoesThisAppDoHeader),
      para(
        'Imagine you\u2019ve just joined a team and opened this codebase for the first time. Your first question: what does this app do?',
      ),
      tableOfContentsEntryToHeader(foldkitMessageHeader),
      para(
        'In Foldkit, you read the Message union. 30 declarations. You now know every way state in this application can change. The Model is the only place state can live, and the Message union is the only way to change the Model.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonFoldkitMessageHighlighted),
          ],
          [],
        ),
        Snippets.comparisonFoldkitMessageRaw,
        'Copy Foldkit messages',
        copiedSnippets,
        'mb-4',
      ),
      para(
        '30 declarations. Each one reads as an English sentence: the user pressed a cell at coordinates x, y. The user selected a tool. The PNG export failed with an error message. The user confirmed a grid size change. The canvas was saved. That union is a complete, readable index of every state transition this application can make. If it\u2019s not in the ',
        inlineCode('Message'),
        ' union, no state in the app changes. When a UI component has its own Submodel, its ',
        inlineCode('Message'),
        ' union gives you the same complete picture one layer deeper, so the full set of state transitions is always right there in the types.',
      ),
      infoCallout(
        'The single source of state changes',
        'Every state change in the Foldkit application starts with a Message. Every side effect outcome comes back as a Message. Every UI component interaction flows through a Message. If it\u2019s not a Message, no state changes.',
      ),
      tableOfContentsEntryToHeader(reactActionHeader),
      para(
        'Now try to answer the same question in React. Since this app uses ',
        inlineCode('useReducer'),
        ', the closest equivalent is the ',
        inlineCode('Action'),
        ' type.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonReactActionHighlighted),
          ],
          [],
        ),
        Snippets.comparisonReactActionRaw,
        'Copy React actions',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'The React ',
        inlineCode('Action'),
        ' type has 19 entries. That\u2019s 11 fewer than Foldkit\u2019s Message union. Where are the missing 11?',
      ),
      para(
        inlineCode('ClickedExport'),
        ' is missing. Export happens through a ',
        inlineCode('useCallback'),
        ' in the App component, not through the reducer. ',
        inlineCode('SucceededExportPng'),
        ' and ',
        inlineCode('CompletedSaveCanvas'),
        ' are missing. These are Command results that don\u2019t exist in React\u2019s model. And 8 ',
        inlineCode('Got*Message'),
        ' variants are missing. RadioGroup focus, Dialog transitions, Switch toggles, and Listbox selection all happen inside Headless UI, invisible to your code.',
      ),
      para(
        'The React ',
        inlineCode('Action'),
        ' type tells you what the reducer handles. Foldkit\u2019s ',
        inlineCode('Message'),
        ' union tells you every way state in the application can change. One is a partial index. The other is a complete one \u2014 the Model is the only place state can live, and the Message union is the only way to change it.',
      ),

      tableOfContentsEntryToHeader(declarationVsProcedureHeader),
      para(
        'The entry point of an application reveals its architecture. In Foldkit, the entry point is a declaration. In React, it\u2019s a procedure.',
      ),
      tableOfContentsEntryToHeader(reactAppHeader),
      para(
        'The React App component initializes the reducer, computes derived values, installs global event listeners, works around stale closures, memoizes callbacks, and manually threads state into 6 child components:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.comparisonReactAppHighlighted)],
          [],
        ),
        Snippets.comparisonReactAppRaw,
        'Copy React App',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Count the hooks: ',
        inlineCode('useReducer'),
        ', two ',
        inlineCode('useMemo'),
        ', one ',
        inlineCode('useRef'),
        ', one ',
        inlineCode('useCallback'),
        ', plus three custom hooks. That\u2019s 8 hooks in a single component. Every one is required. Remove any of them and something breaks.',
      ),
      para(
        'The ',
        inlineCode('useRef'),
        ' on lines 10\u201311 deserves special attention. It exists because ',
        inlineCode('handleExport'),
        ' is wrapped in ',
        inlineCode('useCallback'),
        ' (for memoization), which closes over stale state. So you need a ref to access the current state. This is not a mistake. It\u2019s the standard pattern. React\u2019s closure-based model requires you to manually escape closures when you need current state in a memoized callback.',
      ),
      para(
        'Then look at the JSX. Every child component receives ',
        inlineCode('dispatch'),
        ' as a prop, plus individual slices of state. ',
        inlineCode('Toolbar'),
        ' takes 8 props. ',
        inlineCode('Canvas'),
        ' takes 9. Each component will need its own ',
        inlineCode('useCallback'),
        ' wrappers internally. The prop threading is visible, manual, and exhausting.',
      ),
      tableOfContentsEntryToHeader(foldkitProgramHeader),
      para(
        'The Foldkit entry point declares the initial Model and wires five pieces together:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonFoldkitProgramHighlighted),
          ],
          [],
        ),
        Snippets.comparisonFoldkitProgramRaw,
        'Copy Foldkit program',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'No hooks. No refs. No memoized callbacks. No prop threading. The ',
        inlineCode('init'),
        ' function returns the initial Model and an empty list of startup Commands. ',
        inlineCode('Runtime.makeProgram'),
        ' wires the five pieces together: Model, init, update, view, subscriptions. ',
        inlineCode('Runtime.run'),
        ' starts it. The runtime handles event dispatch, memoization, and side effect execution. You declare what the program is. The framework runs it.',
      ),

      tableOfContentsEntryToHeader(stateManagementHeader),
      para(
        'In Foldkit, the Model is the complete truth. Every bit of application state lives in one place: the focus position of every RadioGroup, the open/closed state of every Dialog, the checked state of every Switch. You can inspect it, serialize it, send it over the wire, and replay it.',
      ),
      tableOfContentsEntryToHeader(foldkitModelHeader),
      para(
        'The Foldkit Model uses Effect Schema types with runtime validation, ',
        inlineCode('Option<T>'),
        ' instead of ',
        inlineCode('null'),
        ', and explicit fields for every UI component: RadioGroup focus, Dialog transitions, Switch toggles, Listbox selection.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonFoldkitModelHighlighted),
          ],
          [],
        ),
        Snippets.comparisonFoldkitModelRaw,
        'Copy Foldkit model',
        copiedSnippets,
        'mb-4',
      ),
      tableOfContentsEntryToHeader(reactStateHeader),
      para(
        'React\u2019s state uses plain TypeScript types (compile-time only, no validation) with ',
        inlineCode('null'),
        ' for absent values. The 6 missing fields (RadioGroup focus, Dialog transition state, Switch toggles, Listbox selection) still exist at runtime, but inside Headless UI. They\u2019re invisible to your reducer, your debugger, and your serialization layer.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonReactStateHighlighted),
          ],
          [],
        ),
        Snippets.comparisonReactStateRaw,
        'Copy React state',
        copiedSnippets,
        'mb-6',
      ),

      tableOfContentsEntryToHeader(completeAnswerHeader),
      para(
        'Foldkit\u2019s ',
        inlineCode('update'),
        ' function answers a complete question: given this Model and this Message, what is the new Model, and what side effects should happen? It returns ',
        inlineCode('[Model, Command[]]'),
        '. React\u2019s ',
        inlineCode('reducer'),
        ' answers half the question: given this state and this action, what is the new state? The other half (what side effects should happen) is scattered across ',
        inlineCode('useEffect'),
        ' hooks elsewhere in the codebase.',
      ),
      tableOfContentsEntryToHeader(foldkitUpdateHeader),
      para(
        'The update function returns ',
        inlineCode('[Model, Command[]]'),
        ': new state and a list of named side effects. It uses ',
        inlineCode('M.tagsExhaustive'),
        ' for exhaustive matching: add a new Message and the compiler forces you to handle it.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonFoldkitUpdateHighlighted),
          ],
          [],
        ),
        Snippets.comparisonFoldkitUpdateRaw,
        'Copy Foldkit update',
        copiedSnippets,
        'mb-4',
      ),
      infoCallout(
        'One function, complete answers',
        'What happens when the user presses a cell? What happens when they undo? You can answer every one of these questions by reading this single function. In Foldkit, that\u2019s the only way to change state. There is no other path.',
      ),
      tableOfContentsEntryToHeader(reactReducerHeader),
      para(
        'The reducer returns only the new state. Side effects happen elsewhere in ',
        inlineCode('useEffect'),
        ' hooks. The ',
        inlineCode('switch/case'),
        ' silently ignores unhandled action types. Add a new action and the compiler won\u2019t catch forgotten cases.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonReactReducerHighlighted),
          ],
          [],
        ),
        Snippets.comparisonReactReducerRaw,
        'Copy React reducer',
        copiedSnippets,
        'mb-6',
      ),

      tableOfContentsEntryToHeader(sideEffectsHeader),
      para(
        'In Foldkit, side effects are Commands: named, typed values that describe work for the runtime to execute. They\u2019re returned from the update function as data. You can see them in Foldkit DevTools, assert on them in tests, and trace exactly which Message caused which effect.',
      ),
      para(
        'In React, side effects are imperative ',
        inlineCode('useEffect'),
        ' hooks that react to state changes. They\u2019re invisible to your reducer, invisible to your debugger, and connected to state only through dependency arrays that the compiler cannot verify.',
      ),
      tableOfContentsEntryToHeader(foldkitCommandHeader),
      para(
        'Commands are defined with ',
        inlineCode('Command.define'),
        ', wrapping an Effect that describes the work. The Command has a name, a return type, and appears in DevTools alongside the Model diff that triggered it.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonFoldkitCommandHighlighted),
          ],
          [],
        ),
        Snippets.comparisonFoldkitCommandRaw,
        'Copy Foldkit command',
        copiedSnippets,
        'mb-4',
      ),
      infoCallout(
        'A complete inventory of side effects',
        'Every side effect triggered by a state transition must be created with ',
        inlineCode('Command.define'),
        '. Want to know what side effects your Foldkit app produces? Open ',
        inlineCode('command.ts'),
        '. This app has exactly two: ',
        inlineCode('SaveCanvas'),
        ' and ',
        inlineCode('ExportPng'),
        '. That\u2019s the complete list. (Subscriptions can also perform lightweight side effects as a consequence of event handling, like ',
        inlineCode('preventDefault'),
        ', but application-level effects always go through Commands.)',
      ),
      tableOfContentsEntryToHeader(reactUseEffectHeader),
      para(
        'The ',
        inlineCode('useEffect'),
        ' hook watches for state changes and fires imperatively. There\u2019s no trace connecting the reducer\u2019s state transition to the effect that fires. The effect is a consequence, not a decision.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonReactUseEffectHighlighted),
          ],
          [],
        ),
        Snippets.comparisonReactUseEffectRaw,
        'Copy React useEffect',
        copiedSnippets,
        'mb-6',
      ),
      para(
        'Now try to produce the same inventory for the React app. There is no ',
        inlineCode('command.ts'),
        ' to open. The PNG export fires from a ',
        inlineCode('useCallback'),
        ' in ',
        inlineCode('App.tsx'),
        '. The localStorage save lives in a ',
        inlineCode('useEffect'),
        ' inside ',
        inlineCode('useLocalStorage.ts'),
        '. Keyboard shortcuts attach window listeners from a ',
        inlineCode('useEffect'),
        ' in ',
        inlineCode('useKeyboardShortcuts.ts'),
        '. Mouse release tracking installs another window listener from ',
        inlineCode('useMouseRelease.ts'),
        '. Dialog focus restoration and transition timing run inside Headless UI, in code you didn\u2019t write and can\u2019t see. To enumerate the side effects, you grep for ',
        inlineCode('useEffect'),
        ', then audit every component for inline handlers and ',
        inlineCode('useCallback'),
        ' bodies, then read the Headless UI source for what its components do internally. There is no list. There is no file you can open. The Foldkit ',
        inlineCode('command.ts'),
        ' is a complete inventory. React\u2019s side effects are a search problem.',
      ),

      tableOfContentsEntryToHeader(whatYourTestsCanSeeHeader),
      para(
        'Both projects have full test suites covering the same behaviors. The tests verify the same things. But the experience of writing and reading them is not comparable.',
      ),
      para(
        'React\u2019s reducer tests dispatch actions and assert on the resulting state. That\u2019s it. They have no way to verify which effects should fire, because effects don\u2019t exist in the reducer\u2019s return type. To test side effects, you need a completely different paradigm: render the full ',
        inlineCode('<App />'),
        ' component in jsdom, mock browser APIs, fire DOM events, and poll with ',
        inlineCode('vi.waitFor()'),
        '.',
      ),
      para(
        'Foldkit\u2019s tests tell a different story. Look at the ',
        inlineCode('Story.resolve'),
        ' call in the snippet below. It asserts that releasing the mouse produced a ',
        inlineCode('SaveCanvas'),
        ' Command, provides the Message that Command will return, and advances the story. The test verifies state and side effects in the same synchronous pipeline. If someone removes the Command, the test breaks. In React, that regression is silent.',
      ),
      para(
        'Every Foldkit test resolves Commands as part of the story. Not just the \u201Cside effect\u201D tests. Every single one.',
      ),
      tableOfContentsEntryToHeader(foldkitTestHeader),
      para(
        inlineCode('Story.story()'),
        ' feeds Messages into the update function and inspects both Model and Commands at every step.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonFoldkitTestHighlighted),
          ],
          [],
        ),
        Snippets.comparisonFoldkitTestRaw,
        'Copy Foldkit test',
        copiedSnippets,
        'mb-4',
      ),
      tableOfContentsEntryToHeader(reactTestHeader),
      para(
        'Notice what\u2019s missing from this test: any assertion about localStorage, PNG export, or any other side effect. The reducer can\u2019t see them.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonReactTestHighlighted),
          ],
          [],
        ),
        Snippets.comparisonReactTestRaw,
        'Copy React test',
        copiedSnippets,
        'mb-4',
      ),
      tableOfContentsEntryToHeader(reactSideEffectTestHeader),
      para(
        'The export test below mocks ',
        inlineCode('localStorage'),
        ', renders the full ',
        inlineCode('<App />'),
        ' component, fires a paint stroke via DOM events, then polls with ',
        inlineCode('vi.waitFor()'),
        ' until the async effect completes.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonReactSideEffectTestHighlighted),
          ],
          [],
        ),
        Snippets.comparisonReactSideEffectTestRaw,
        'Copy React side-effect test',
        copiedSnippets,
        'mb-6',
      ),
      infoCallout(
        'Nothing to mock',
        'Foldkit\u2019s update is a pure function. Side effects are return values, not imperative calls. That means you can test state transitions and side effects together in a unit test with zero mocking, zero DOM, and zero async. In React, testing a side effect means rendering the full component tree in jsdom, mocking browser APIs, firing synthetic events, and polling for async results.',
      ),
      comparisonTable(
        ['', 'Foldkit', 'React'],
        [
          [
            ['State testing'],
            ['Inspect Model at any point in story'],
            ['Assert on final state after dispatch'],
          ],
          [
            ['Effect testing'],
            ['Resolve Commands in same pipeline'],
            ['Separate tests with mocking + DOM'],
          ],
          [
            ['Test reads as'],
            ['Chronological user story'],
            ['State threading with intermediate variables'],
          ],
          [
            ['Catches removed effects'],
            ['Yes: unresolved Command fails the story'],
            ['No: reducer tests can\u2019t see effects'],
          ],
          [
            ['Infrastructure'],
            [inlineCode('Story.story()'), ' (built-in, zero dependencies)'],
            [
              inlineCode('@testing-library/react'),
              ', ',
              inlineCode('jsdom'),
              ', setup file',
            ],
          ],
          [
            ['Async'],
            ['Never: everything is synchronous'],
            [
              'Required for ',
              inlineCode('useEffect'),
              ' (',
              inlineCode('vi.waitFor'),
              ')',
            ],
          ],
        ],
      ),

      tableOfContentsEntryToHeader(interactionTestingHeader),
      para(
        'Story tests verify the state machine: Messages in, Model and Commands out. But what about testing from the user\u2019s perspective \u2014 clicking buttons, reading text, checking disabled states? React uses ',
        inlineCode('@testing-library/react'),
        ' with jsdom. Foldkit uses Scene: a built-in interaction testing API that runs against the virtual DOM. No browser, no jsdom, no mocking. Same synchronous pipeline, same Command resolution, same zero dependencies.',
      ),
      tableOfContentsEntryToHeader(foldkitSceneTestHeader),
      para(
        inlineCode('Scene.scene()'),
        ' renders the view against a virtual DOM, finds elements by accessible role and text content, dispatches click events through the same update function, and resolves Commands inline. The entire test is synchronous. There is no DOM, no ',
        inlineCode('jsdom'),
        ', no ',
        inlineCode('render()'),
        ', no cleanup.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonFoldkitSceneTestHighlighted),
          ],
          [],
        ),
        Snippets.comparisonFoldkitSceneTestRaw,
        'Copy Foldkit scene test',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Scene finds the Dismiss button by ',
        inlineCode("Scene.role('button', { name: 'Dismiss' })"),
        ' \u2014 the same accessible name a screen reader would announce. The click dispatches ',
        inlineCode('DismissedErrorDialog'),
        ' through update, which returns a ',
        inlineCode('CloseDialog'),
        ' Command. Resolve it, and the dialog is gone. Every step is visible, every side effect is accounted for, and the test reads as a chronological user story.',
      ),
      tableOfContentsEntryToHeader(reactSceneTestHeader),
      para(
        'The same test in React requires jsdom, browser API mocking, and async waiting. You mock ',
        inlineCode('HTMLCanvasElement.prototype.getContext'),
        ' to force the export to fail, render the component, and use ',
        inlineCode('findByText'),
        ' to wait for the async state update. The export side effect fires imperatively inside the component \u2014 there is no Command to resolve, so there is no way to assert that the effect happened other than checking the DOM after the fact.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonReactSceneTestHighlighted),
          ],
          [],
        ),
        Snippets.comparisonReactSceneTestRaw,
        'Copy React interaction test',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'The React test is shorter, but shorter is not the same as simpler. The Scene test shows every step of the causality chain as a value: the dispatched Message, the Command the update function returned, the Message that resolution produced, the next state. Each one is a verifiable assertion point. The React test is a black box with assertions at the edges \u2014 click, wait, check the DOM. If it fails with ',
        inlineCode('"Export Failed" not in document'),
        ', you do not know which step broke: did the click fire, did the handler run, did state update, did React re-render, did the mock work? The Scene test tells you exactly.',
      ),
      para(
        'The React test also is not testing the real failure case. It mocks ',
        inlineCode('HTMLCanvasElement.prototype.getContext'),
        ' to return null and hopes the component\u2019s error path responds the same way it would in a real browser. The Scene test says ',
        inlineCode('FailedExportPng({ error: \u2026 })'),
        ' directly. No fake reality, no assumption that the mock behaves like production. And because Commands are values, you can assert on what a click produces without resolving it \u2014 ',
        inlineCode('Scene.expectExactCommands(ExportPng)'),
        ' verifies intent in isolation from outcome. React cannot separate the two: you either mock the effect and run the whole flow, or you do not test it at all.',
      ),
      para(
        'Finally, the React test is coupled to the export implementation. Swap ',
        inlineCode('getContext'),
        ' for a different library and the test breaks at the mock, even though user-facing behavior is unchanged. The Scene test does not care how export is implemented \u2014 it only cares that a ',
        inlineCode('FailedExportPng'),
        ' Message arrives. It tests behavior, not mechanics.',
      ),
      comparisonTable(
        ['', 'Foldkit Scene', 'React Testing Library'],
        [
          [
            ['DOM'],
            ['Virtual (no jsdom)'],
            ['jsdom (full browser simulation)'],
          ],
          [
            ['Events'],
            ['Direct handler invocation'],
            ['Synthetic event simulation'],
          ],
          [
            ['Mocking'],
            ['None'],
            ['Browser APIs (canvas, localStorage, \u2026)'],
          ],
          [
            ['Side effects'],
            ['Commands resolved inline'],
            ['Fire imperatively, assert on DOM after'],
          ],
          [
            ['Timing'],
            ['Synchronous'],
            [
              'May require ',
              inlineCode('act()'),
              ' or ',
              inlineCode('waitFor()'),
            ],
          ],
          [
            ['Queries'],
            [
              inlineCode('Scene.role()'),
              ', ',
              inlineCode('Scene.text()'),
              ', ',
              inlineCode('Scene.label()'),
            ],
            [
              inlineCode('screen.getByRole()'),
              ', ',
              inlineCode('screen.getByText()'),
            ],
          ],
          [
            ['Cleanup'],
            ['None'],
            [inlineCode('cleanup()'), ' in ', inlineCode('afterEach')],
          ],
        ],
      ),

      tableOfContentsEntryToHeader(streamsVsHooksHeader),
      para(
        'Both apps need global event listeners for keyboard shortcuts and mouse release during drawing. Foldkit uses Subscriptions: declarative streams that the runtime manages based on Model state. React uses ',
        inlineCode('useEffect'),
        ' hooks with manual setup and cleanup.',
      ),
      tableOfContentsEntryToHeader(foldkitSubscriptionsHeader),
      para(
        'Subscriptions are declarative streams. The ',
        inlineCode('mouseRelease'),
        ' Subscription conditionally activates based on ',
        inlineCode('model.isDrawing'),
        '. The runtime compares the dependency values on each update and handles subscribe/unsubscribe automatically.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonFoldkitSubscriptionHighlighted),
          ],
          [],
        ),
        Snippets.comparisonFoldkitSubscriptionRaw,
        'Copy Foldkit subscription',
        copiedSnippets,
        'mb-4',
      ),
      tableOfContentsEntryToHeader(reactHooksHeader),
      para(
        inlineCode('useEffect'),
        ' hooks achieve the same result with manual setup, cleanup, and dependency arrays. Miss a dependency and you get stale closures. Foldkit has no closures to go stale. The view and Subscriptions always receive the current Model.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonReactHooksHighlighted),
          ],
          [],
        ),
        Snippets.comparisonReactHooksRaw,
        'Copy React hooks',
        copiedSnippets,
        'mb-6',
      ),

      tableOfContentsEntryToHeader(yourStateOrTheirsHeader),
      para(
        'Foldkit ships accessible UI components (Dialog, RadioGroup, Switch, Listbox) that work like everything else in Foldkit: each has a Model, Messages, and an update function. You initialize them in your Model, delegate their Messages in your update, and compose their views. The state is yours. React uses Headless UI, which provides the same accessible patterns through a component API. But the state is theirs.',
      ),
      comparisonTable(
        ['', 'Foldkit', 'React + Headless UI'],
        [
          [
            ['State'],
            ['Yours: in the Model, visible, serializable'],
            ['Theirs: internal, invisible, not serializable'],
          ],
          [
            ['Events'],
            ['Messages delegated through your update'],
            [
              'Callbacks (',
              inlineCode('onChange'),
              ', ',
              inlineCode('onClose'),
              ')',
            ],
          ],
          [
            ['Accessibility'],
            ['Built-in (aria, focus, keyboard)'],
            ['Built-in (aria, focus, keyboard)'],
          ],
          [
            ['Debugging'],
            ['Full state visible in DevTools'],
            ['Component internals hidden from DevTools'],
          ],
        ],
      ),

      tableOfContentsEntryToHeader(renderingPerformanceHeader),
      para(
        'We profiled both production builds painting across a 32\u00d732 grid (1024 cells) in Chrome. React averages ~16.5ms per frame. Foldkit averages ~16.7ms. Both render at 60fps. The result is the same. The developer experience is not.',
      ),
      tableOfContentsEntryToHeader(foldkitMemoizationHeader),
      para(
        'Declare memoization helpers at the module level. Pass Model data in. The arguments are compared by reference, and ',
        inlineCode('evo()'),
        ' preserves references for unchanged fields, so the check passes naturally for panels whose data hasn\u2019t changed.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonFoldkitMemoizationHighlighted),
          ],
          [],
        ),
        Snippets.comparisonFoldkitMemoizationRaw,
        'Copy Foldkit memoization',
        copiedSnippets,
        'mb-4',
      ),
      para(
        inlineCode('createLazy()'),
        ' and ',
        inlineCode('createKeyedLazy()'),
        ' compare arguments by reference. The key: the arguments are pure data (Model fields, primitive values), not callback functions. There are no closures at the memoization boundary, so there\u2019s nothing to stabilize.',
      ),
      tableOfContentsEntryToHeader(reactMemoizationHeader),
      para(
        'Wrap every component in ',
        inlineCode('memo'),
        '. Wrap every handler in ',
        inlineCode('useCallback'),
        '. Wrap every derived value in ',
        inlineCode('useMemo'),
        '. Thread ',
        inlineCode('dispatch'),
        ' through every component.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.comparisonReactMemoizationHighlighted),
          ],
          [],
        ),
        Snippets.comparisonReactMemoizationRaw,
        'Copy React memoization',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'React\u2019s ',
        inlineCode('React.memo'),
        ' also uses reference equality. But React props include callback functions, which are new references on every render. So you need ',
        inlineCode('useCallback'),
        ' to stabilize them, and ',
        inlineCode('useMemo'),
        ' for derived values. Forget one and the optimization silently breaks.',
      ),

      tableOfContentsEntryToHeader(guaranteesHeader),
      para(
        'The detailed comparisons above tell the story section by section. Here\u2019s the summary: what Foldkit guarantees by construction that React cannot.',
      ),

      tableOfContentsEntryToHeader(auditLogHeader),
      para(
        'The ',
        inlineCode('Message'),
        ' union is a complete, readable specification of every state change, side effect outcome, and UI component interaction. UI Submodels carry their own ',
        inlineCode('Message'),
        ' unions, so you can drill into any component to see exactly what it does. There is no equivalent in React.',
      ),

      tableOfContentsEntryToHeader(exhaustiveMatchingHeader),
      para(
        'Add a new Tool variant or a new Message and TypeScript\u2019s exhaustive match (',
        inlineCode('M.tagsExhaustive'),
        ') shows you every place in the update function that needs to handle it. In React, adding a new action type to the reducer is only part of the job. You still have to find every ',
        inlineCode('useEffect'),
        ', every component callback, and every custom hook that might need updating. Nothing connects them.',
      ),

      tableOfContentsEntryToHeader(visibleEffectsHeader),
      para(
        'Commands have names, appear in DevTools alongside the Model diff, and can be asserted on in tests. React\u2019s ',
        inlineCode('useEffect'),
        ' hooks are invisible to the reducer and invisible to debugging tools.',
      ),

      tableOfContentsEntryToHeader(timeTravelHeader),
      para(
        'Every bit of state lives in the Model, including UI component internals (focus position, transition frames, checked state). Foldkit DevTools can step through the complete history. React\u2019s DevTools show the current component tree, but Headless UI\u2019s internal state is unreachable.',
      ),

      tableOfContentsEntryToHeader(storyTestsHeader),
      para(
        'Foldkit\u2019s ',
        inlineCode('Story.story'),
        ' tests side effects for free with no mocking. Remove a Command and the test breaks. In React, testing side effects requires a separate paradigm: rendering in jsdom, mocking browser APIs, and polling for async results.',
      ),

      tableOfContentsEntryToHeader(oneFunctionHeader),
      para(
        'A bug in Foldkit lives in the update function. That\u2019s the only place state changes. In React, the same bug could be in the reducer, a ',
        inlineCode('useEffect'),
        ', a ',
        inlineCode('useCallback'),
        ', a custom hook, or inside Headless UI. You have to check all of them.',
      ),

      tableOfContentsEntryToHeader(noStaleClosuresHeader),
      para(
        'No dependency arrays. No ',
        inlineCode('useCallback'),
        ' wrappers. No refs to escape closures. The entire class of bugs that comes from React\u2019s closure-based model does not exist in Foldkit.',
      ),

      tableOfContentsEntryToHeader(scalabilityHeader),
      para(
        'A pixel art editor is a non-trivial app. But real products don\u2019t stop here. What happens when the feature set grows? Consider what it would take to add remote persistence, multiplayer editing, or an undo/redo timeline that survives a page refresh.',
      ),

      tableOfContentsEntryToHeader(remotePersistenceHeader),
      para(
        'In Foldkit, you\u2019d define a ',
        inlineCode('SyncToServer'),
        ' Command and return it from the update function. When the user finishes a paint stroke, the ',
        inlineCode('ReleasedMouse'),
        ' handler returns both ',
        inlineCode('SaveCanvas'),
        ' and ',
        inlineCode('SyncToServer'),
        '. Both side effects are visible in one place, appear in DevTools, and your tests verify they were triggered by the right Message. In React, you\u2019d add another ',
        inlineCode('useEffect'),
        ' that watches for state changes and fires a network request. Now you have two independent effects (localStorage and remote sync) that can race, and neither is visible in the reducer.',
      ),

      tableOfContentsEntryToHeader(multiplayerHeader),
      para(
        'Foldkit\u2019s Model is serializable by design. Every field uses Effect Schema types with runtime validation. Sending the Model over a WebSocket and applying remote Messages through the same update function is architecturally trivial: the update function already handles every possible state transition. Remote Messages go through the same pipeline as local ones.',
      ),
      para(
        'In React, Headless UI\u2019s internal state (focus position, transition frames, dialog open/close) can\u2019t be serialized or sent over the wire. You\u2019d need to rebuild UI component state on the receiving end, which means your multiplayer sync and your local UI are working with different sources of truth.',
      ),

      tableOfContentsEntryToHeader(animationTimelineHeader),
      para(
        'Imagine turning this into a frame-by-frame animation tool. You paint multiple grids, arrange them in a timeline, and play them back. In Foldkit, the new state is straightforward: add a ',
        inlineCode('frames: Array<Grid>'),
        ' field, a ',
        inlineCode('currentFrameIndex'),
        ', and an ',
        inlineCode('isPlaying'),
        ' boolean to the Model. Playback is a Subscription that emits ',
        inlineCode('AdvancedFrame'),
        ' Messages on a timer when ',
        inlineCode('isPlaying'),
        ' is true. The update function handles ',
        inlineCode('AdvancedFrame'),
        ' by incrementing the index. The view renders the current frame. All of it flows through the existing architecture.',
      ),
      para(
        'In React, the frame sequence lives in the reducer. But playback needs a ',
        inlineCode('useEffect'),
        ' with a ',
        inlineCode('setInterval'),
        ' and cleanup. The interval callback closes over stale state, so you need a ',
        inlineCode('useRef'),
        ' for the current frame index. Now you have the same state in two places: the reducer (source of truth) and the ref (for the closure). The existing localStorage ',
        inlineCode('useEffect'),
        ' and the playback ',
        inlineCode('useEffect'),
        ' both respond to state changes, and neither knows about the other. Every new real-time feature adds another coordination problem.',
      ),

      tableOfContentsEntryToHeader(persistentUndoHeader),
      para(
        'Foldkit\u2019s undo stack is part of the Model. Persisting it to IndexedDB is another Command. Restoring it on page load is part of ',
        inlineCode('init'),
        '. The entire round-trip (save, restore, resume) flows through the same architecture with no special cases. React\u2019s undo stack lives in ',
        inlineCode('useReducer'),
        ' state, but persisting it means coordinating another ',
        inlineCode('useEffect'),
        ' with the existing localStorage effect, managing serialization of the grid arrays, and ensuring the two effects don\u2019t step on each other.',
      ),
      para(
        'The pattern is always the same: Foldkit\u2019s architecture scales by adding Messages and Commands to existing functions. React\u2019s architecture scales by adding more hooks, more effects, and more coordination between them. The first approach compounds clarity. The second compounds complexity.',
      ),

      tableOfContentsEntryToHeader(conclusionHeader),
      para(
        'React is a good library with a massive ecosystem. We\u2019re not pretending otherwise.',
      ),
      para(
        'But look at what we built. The same app, the same features, the same styling. In React, understanding the app requires reading the reducer, the hooks, the components, and the Headless UI docs. In Foldkit, you read the ',
        inlineCode('Message'),
        ' union to see every state change. You read the ',
        inlineCode('Command'),
        ' definitions to see every side effect. Complete picture.',
      ),
      para(
        'If you care about adding features without fear, onboarding new developers by pointing them at one file, debugging production issues by replaying state, and trusting that your test suite actually catches regressions, Foldkit gives you things React structurally cannot.',
      ),
    ],
  )
