import { Html } from 'foldkit/html'

import { Class, InnerHTML, div, em, strong } from '../html'
import { Link } from '../link'
import type { Model, TableOfContentsEntry } from '../main'
import {
  callout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'
import { advancedPatternsRouter } from '../route'
import * as Snippets from '../snippet'
import { highlightedCodeBlock } from '../view/codeBlock'

const counterExampleHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'counter-example',
  text: 'A Simple Counter Example',
}

const modelHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'model',
  text: 'Model',
}

const messagesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'messages',
  text: 'Messages',
}

const updateHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'update',
  text: 'update',
}

const viewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'view',
  text: 'view',
}

const typedHtmlHelpersHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'typed-html-helpers',
  text: 'Typed HTML Helpers',
}

const eventHandlingHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'event-handling',
  text: 'Event Handling',
}

const commandsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'commands',
  text: 'Commands',
}

const subscriptionsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'subscriptions',
  text: 'Subscriptions',
}

const resourcesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'resources',
  text: 'Resources',
}

const providingMultipleServicesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'providing-multiple-services',
  text: 'Providing Multiple Services',
}

const managedResourcesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'managed-resources',
  text: 'Managed Resources',
}

const accessingManagedResourcesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'accessing-managed-resources',
  text: 'Accessing Managed Resources in Commands',
}

const initHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'init',
  text: 'init',
}

const flagsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'flags',
  text: 'flags',
}

const taskHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'task',
  text: 'Task',
}

const runningAppHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'running-the-app',
  text: 'Running the App',
}

const makeElementVsApplicationHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'make-element-vs-application',
  text: 'makeElement vs makeApplication',
}

const errorViewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'error-view',
  text: 'Error View',
}

const slowViewWarningHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'slow-view-warning',
  text: 'Slow View Warning',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  counterExampleHeader,
  modelHeader,
  messagesHeader,
  updateHeader,
  viewHeader,
  typedHtmlHelpersHeader,
  eventHandlingHeader,
  commandsHeader,
  subscriptionsHeader,
  initHeader,
  flagsHeader,
  taskHeader,
  runningAppHeader,
  makeElementVsApplicationHeader,
  resourcesHeader,
  providingMultipleServicesHeader,
  managedResourcesHeader,
  accessingManagedResourcesHeader,
  errorViewHeader,
  slowViewWarningHeader,
]

export const view = (model: Model): Html =>
  div(
    [],
    [
      pageTitle('architectureAndConcepts', 'Architecture & Concepts'),
      tableOfContentsEntryToHeader(counterExampleHeader),
      para(
        'The easiest way to learn how Foldkit works is to first look at examples, then dive deeper to understand each piece in isolation.',
      ),
      para(
        "Here's a simple counter application that demonstrates Foldkit's core concepts: the ",
        strong([], ['Model']),
        ' (application state), ',
        strong([], ['Messages']),
        ' (model updates), ',
        strong([], ['Update']),
        ' (state transitions), and ',
        strong([], ['View']),
        ' (rendering). Take a look at the counter example below in full, then continue to see a more detailed explanation of each piece.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.counterHighlighted)],
          [],
        ),
        Snippets.counterRaw,
        'Copy counter example to clipboard',
        model,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(modelHeader),
      para(
        'The Model represents your entire application state in a single, immutable data structure. In Foldkit, the Model is defined using ',
        link(Link.effectSchema, 'Effect Schema'),
        ', which provides runtime validation, type inference, and a single source of truth for your application state.',
      ),
      para('In the counter example, the model is simply a number.'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterModelHighlighted),
          ],
          [],
        ),
        Snippets.counterModelRaw,
        'Copy model example to clipboard',
        model,
        'mb-8',
      ),
      callout(
        'For React developers',
        'Think of the Model as combining useState, useContext, and your Redux store into one typed structure. Instead of state scattered across components, everything lives here.',
      ),
      tableOfContentsEntryToHeader(messagesHeader),
      para(
        'Messages represent all the events that can occur in your application. They describe ',
        em([], ['what happened']),
        ', not ',
        em([], ['how to handle it']),
        '. Messages are implemented as tagged unions, providing exhaustive pattern matching and type safety.',
      ),
      para('The counter example has three simple messages:'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterMessagesHighlighted),
          ],
          [],
        ),
        Snippets.counterMessagesRaw,
        'Copy messages example to clipboard',
        model,
        'mb-8',
      ),
      callout(
        'For React developers',
        'Messages are similar to Redux action types, but more ergonomic with Effect Schema. Instead of string constants and action creators, you get type inference and pattern matching for free.',
      ),
      tableOfContentsEntryToHeader(updateHeader),
      para(
        "The update function is the heart of your application logic. It's a pure function that takes the current model and a message, and returns a new model along with any commands to execute. Commands represent side effects and are covered later on this page.",
      ),
      para(
        'Foldkit uses ',
        link(Link.effectMatch, 'Effect.Match'),
        ' for exhaustive pattern matching on messages. The TypeScript compiler will error if you forget to handle a message type.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterUpdateHighlighted),
          ],
          [],
        ),
        Snippets.counterUpdateRaw,
        'Copy update example to clipboard',
        model,
        'mb-8',
      ),
      callout(
        'For React developers',
        "Like a Redux reducer, but update returns Commands instead of triggering useEffect. You'll never wonder why an effect ran — it's explicit in the return value.",
      ),
      tableOfContentsEntryToHeader(viewHeader),
      para(
        'The view function is a pure function that transforms your model into HTML. Given the same model, it always produces the same HTML output. The view never directly modifies state — instead, it dispatches messages through event handlers.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterViewHighlighted),
          ],
          [],
        ),
        Snippets.counterViewRaw,
        'Copy view example to clipboard',
        model,
        'mb-8',
      ),
      callout(
        'For React developers',
        'The view is like a functional component, but guaranteed pure — no hooks, no effects, no local state. It\'s a function from Model to Html. This simplicity means no "rules of hooks" to follow.',
      ),
      tableOfContentsEntryToHeader(typedHtmlHelpersHeader),
      para(
        "Foldkit's HTML functions are typed to your Message type. This ensures event handlers only accept valid Messages from your application. You create these helpers by calling ",
        inlineCode('html<Message>()'),
        ' and destructuring the elements and attributes you need:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.htmlHelpersHighlighted),
          ],
          [],
        ),
        Snippets.htmlHelpersRaw,
        'Copy HTML helpers example to clipboard',
        model,
        'mb-8',
      ),
      para(
        "This pattern might seem unusual if you're coming from React, but it provides strong type safety. If you try to pass an invalid Message to ",
        inlineCode('OnClick'),
        ', TypeScript will catch it at compile time. You only need to do this once per module — most apps create a single ',
        inlineCode('html.ts'),
        ' file and import from there.',
      ),
      tableOfContentsEntryToHeader(eventHandlingHeader),
      para(
        'Event handlers in Foldkit work differently from React. Instead of passing a callback function, you pass a Message. When the event fires, Foldkit dispatches that Message to your update function.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.eventHandlingHighlighted),
          ],
          [],
        ),
        Snippets.eventHandlingRaw,
        'Copy event handling example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'For simple events like clicks, you pass the Message directly. For events that carry data (like input changes), you pass a function that receives the event and returns a Message. This keeps your view declarative — it describes what Messages should be sent, not how to handle them.',
      ),
      tableOfContentsEntryToHeader(commandsHeader),
      para(
        "You're probably wondering how to handle side effects like HTTP requests, timers, or interacting with the browser API. In Foldkit, side effects are managed through commands returned by the update function. This keeps your update logic pure and testable.",
      ),
      para(
        "Let's start simple. Say we want to wait one second before resetting the count if the user clicks reset. This is how we might implement that:",
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterCommandsHighlighted),
          ],
          [],
        ),
        Snippets.counterCommandsRaw,
        'Copy commands example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'Now, what if we want to get the next count from an API instead of incrementing locally? We can create a Command that performs the HTTP request and returns a Message when it completes:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.counterHttpCommandHighlighted),
          ],
          [],
        ),
        Snippets.counterHttpCommandRaw,
        'Copy HTTP command example to clipboard',
        model,
        'mb-8',
      ),
      para(
        "Let's zoom in on ",
        inlineCode('fetchCount'),
        " to understand what's happening here:",
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(
              Snippets.counterHttpCommandFetchCountHighlighted,
            ),
          ],
          [],
        ),
        Snippets.counterHttpCommandFetchCountRaw,
        'Copy HTTP command fetchCount example to clipboard',
        model,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(subscriptionsHeader),
      para(
        'Commands are great for one-off side effects, but what about ongoing streams of events? Think timers, WebSocket connections, or keyboard input. For these, Foldkit provides ',
        strong([], ['Subscriptions']),
        '.',
      ),
      para(
        'A Subscription is a reactive binding between your model and a long-running stream. You declare which part of the model the subscription depends on, and Foldkit manages the stream lifecycle automatically, starting it when the component mounts and restarting it whenever those dependencies change.',
      ),
      para(
        "Let's look at a stopwatch example. We want a timer that ticks every 100ms, but only when ",
        inlineCode('isRunning'),
        ' is ',
        inlineCode('true'),
        '. This gives us a way to start and stop the stopwatch based on user input.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.stopwatchSubscriptionHighlighted),
          ],
          [],
        ),
        Snippets.stopwatchSubscriptionRaw,
        'Copy subscription example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'The key concept is ',
        inlineCode('SubscriptionDeps'),
        '. This schema defines what parts of the model your subscriptions depend on. Each subscription has two functions:',
      ),
      para(
        inlineCode('modelToDependencies'),
        ' extracts the relevant dependencies from the model.',
      ),
      para(
        inlineCode('depsToStream'),
        ' creates a stream based on those dependencies.',
      ),
      para(
        'Foldkit structurally compares the dependencies between updates. The stream is only restarted when the dependencies actually change, not on every model update.',
      ),
      para(
        'When ',
        inlineCode('isRunning'),
        ' changes from ',
        inlineCode('false'),
        ' to ',
        inlineCode('true'),
        ', the stream starts ticking. When it changes back to ',
        inlineCode('false'),
        ', the stream stops. Foldkit handles all the lifecycle management for you.',
      ),
      para(
        'For a more complex example using WebSocket connections, see the ',
        link(Link.websocketChatExample, 'websocket-chat example'),
        '. For a full real-world application, check out ',
        link(Link.typingTerminal, 'Typing Terminal'),
        ' (',
        link(Link.typingTerminalSource, 'source'),
        ').',
      ),
      para(
        "If you're coming from Elm, Subscriptions in Foldkit produce ",
        inlineCode('Command<Message>'),
        ' rather than plain ',
        inlineCode('Message'),
        '. This means each item in the stream can do async work before resolving to a message, avoiding extra round-trips through ',
        inlineCode('update'),
        '.',
      ),
      tableOfContentsEntryToHeader(initHeader),
      para(
        'The ',
        inlineCode('init'),
        ' function returns the initial model and any commands to run on startup. It returns a tuple of ',
        inlineCode('[Model, ReadonlyArray<Command<Message>>]'),
        '.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.initSimpleHighlighted),
          ],
          [],
        ),
        Snippets.initSimpleRaw,
        'Copy init example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'For elements (components without routing), init takes no arguments. For applications with routing, init receives the current URL so you can set up initial state based on the route.',
      ),
      tableOfContentsEntryToHeader(flagsHeader),
      para(
        'Flags let you pass initialization data into your application — things like persisted state from localStorage or configuration values. Define a Flags schema and provide an Effect that loads the flags.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.flagsDefinitionHighlighted),
          ],
          [],
        ),
        Snippets.flagsDefinitionRaw,
        'Copy flags definition to clipboard',
        model,
        'mb-8',
      ),
      para(
        'When using flags, your init function receives them as the first argument:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.initWithFlagsHighlighted),
          ],
          [],
        ),
        Snippets.initWithFlagsRaw,
        'Copy init with flags to clipboard',
        model,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(taskHeader),
      para(
        'Foldkit provides utility functions for common side effects that return commands you can use in your update function.',
      ),
      para(
        inlineCode('Task.getTime'),
        ' gets the current UTC time. ',
        inlineCode('Task.getZonedTime'),
        ' gets time with the system timezone. ',
        inlineCode('Task.getZonedTimeIn'),
        ' gets time in a specific timezone.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.taskGetTimeHighlighted),
          ],
          [],
        ),
        Snippets.taskGetTimeRaw,
        'Copy task time examples to clipboard',
        model,
        'mb-8',
      ),
      para(
        inlineCode('Task.focus'),
        ' focuses an element by CSS selector (useful after form submission). ',
        inlineCode('Task.randomInt'),
        ' generates random integers.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.taskFocusHighlighted),
          ],
          [],
        ),
        Snippets.taskFocusRaw,
        'Copy task focus example to clipboard',
        model,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(runningAppHeader),
      para(
        'To run a Foldkit application, create a runtime with ',
        inlineCode('makeElement'),
        ' or ',
        inlineCode('makeApplication'),
        ', then call ',
        inlineCode('Runtime.run'),
        '.',
      ),
      tableOfContentsEntryToHeader(makeElementVsApplicationHeader),
      para(
        inlineCode('makeElement'),
        ' creates a component without URL handling. The init function takes no URL argument (or just flags if you use them). Use this for standalone widgets or components embedded in existing pages.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.runMakeElementHighlighted),
          ],
          [],
        ),
        Snippets.runMakeElementRaw,
        'Copy makeElement example to clipboard',
        model,
        'mb-8',
      ),
      para(
        inlineCode('makeApplication'),
        ' creates a full-page application with routing. The init function receives the current URL, and you must provide a ',
        inlineCode('browser'),
        ' config to handle URL changes.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.runMakeApplicationHighlighted),
          ],
          [],
        ),
        Snippets.runMakeApplicationRaw,
        'Copy makeApplication example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'The ',
        inlineCode('browser'),
        ' config has two handlers: ',
        inlineCode('onUrlRequest'),
        ' is called when a link is clicked (giving you a chance to handle internal vs external links), and ',
        inlineCode('onUrlChange'),
        ' is called when the URL changes (so you can update your model with the new route).',
      ),
      tableOfContentsEntryToHeader(resourcesHeader),
      para(
        'Commands are self-contained by default — each execution starts fresh with no shared state. But some browser APIs like ',
        inlineCode('AudioContext'),
        ', ',
        inlineCode('RTCPeerConnection'),
        ', or ',
        inlineCode('CanvasRenderingContext2D'),
        ' need a single long-lived instance shared across commands. That\u2019s what ',
        inlineCode('resources'),
        ' is for.',
      ),
      para(
        'Define a service using ',
        link(Link.effectService, 'Effect.Service'),
        ', then pass its default layer to ',
        inlineCode('makeElement'),
        ' or ',
        inlineCode('makeApplication'),
        ' via the ',
        inlineCode('resources'),
        ' config field. The runtime memoizes the layer once and provides it to every command and subscription automatically.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.resourcesHighlighted),
          ],
          [],
        ),
        Snippets.resourcesRaw,
        'Copy resources example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'Commands declare their resource requirements in the type signature via the third type parameter of ',
        inlineCode('Command'),
        '. This makes dependencies explicit and type-checked — if a command requires a service that isn\u2019t provided via ',
        inlineCode('resources'),
        ', you\u2019ll get a compile error.',
      ),
      callout(
        'When not to use resources',
        para(
          'Resources are for mutable browser singletons with lifecycle — things that must be created once and reused. Stateless services like ',
          inlineCode('HttpClient'),
          ' or ',
          inlineCode('BrowserKeyValueStore'),
          ' should be provided per-command with ',
          inlineCode('Effect.provide'),
          ' instead.',
        ),
      ),
      tableOfContentsEntryToHeader(providingMultipleServicesHeader),
      para(
        'The ',
        inlineCode('resources'),
        ' field takes a single ',
        inlineCode('Layer'),
        ', but Effect layers compose. Use ',
        inlineCode('Layer.mergeAll'),
        ' to combine multiple service layers into one.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.resourcesMultipleHighlighted),
          ],
          [],
        ),
        Snippets.resourcesMultipleRaw,
        'Copy multiple resources example to clipboard',
        model,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(managedResourcesHeader),
      para(
        'Resources live for the entire application lifecycle. But some resources are heavy and should only be active while the model is in a particular state — a camera stream during a video call, a WebSocket connection while on a chat page, or a Web Worker pool during a computation. ',
        strong([], ['Managed resources']),
        ' provide model-driven acquire/release lifecycle, using the same deps-diffing engine as subscriptions.',
      ),
      para(
        'Define a managed resource identity with ',
        inlineCode('ManagedResource.tag'),
        ', then wire its lifecycle with ',
        inlineCode('makeManagedResources'),
        '. The ',
        inlineCode('modelToMaybeRequirements'),
        ' function returns ',
        inlineCode('Option.some(params)'),
        ' when the resource should be active, and ',
        inlineCode('Option.none()'),
        ' when it should be released.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.managedResourcesHighlighted),
          ],
          [],
        ),
        Snippets.managedResourcesRaw,
        'Copy managed resources example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'When requirements change, the runtime handles the lifecycle automatically. If ',
        inlineCode('modelToMaybeRequirements'),
        ' transitions from ',
        inlineCode('Option.none()'),
        ' to ',
        inlineCode('Option.some(params)'),
        ', the resource is acquired and ',
        inlineCode('onAcquired'),
        ' is sent. When it goes back to ',
        inlineCode('Option.none()'),
        ', the resource is released and ',
        inlineCode('onReleased'),
        ' is sent. If the params change while active (e.g. switching cameras), the old resource is released and a new one is acquired with the new params.',
      ),
      para(
        'If acquisition fails, ',
        inlineCode('onAcquireError'),
        ' is sent as a message. The resource daemon continues watching for the next deps change — a failed acquisition does not crash the application.',
      ),
      tableOfContentsEntryToHeader(accessingManagedResourcesHeader),
      para(
        'Commands access the resource value via ',
        inlineCode('.get'),
        '. Since the resource might not be active, ',
        inlineCode('.get'),
        ' can fail with ',
        inlineCode('ResourceNotAvailable'),
        '. The type system enforces this — your command won\u2019t compile unless you handle the error.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.managedResourcesCommandHighlighted),
          ],
          [],
        ),
        Snippets.managedResourcesCommandRaw,
        'Copy managed resource command example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'This is the same ',
        inlineCode('catchTag'),
        ' pattern you already use for command errors. If your model correctly gates commands (only dispatching ',
        inlineCode('takePhoto'),
        ' after ',
        inlineCode('AcquiredCamera'),
        ' has been received), the ',
        inlineCode('catchTag'),
        ' is a safety net that never fires. But if your model logic has a bug, you get a graceful error message instead of a crash.',
      ),
      callout(
        'Resources vs Managed Resources',
        para(
          'Use ',
          inlineCode('resources'),
          ' for things that live forever (AudioContext, CanvasRenderingContext2D). Use ',
          inlineCode('managedResources'),
          ' for things tied to a model state (camera streams, WebSocket connections, media recorders).',
        ),
      ),
      tableOfContentsEntryToHeader(errorViewHeader),
      para(
        'When Foldkit hits an unrecoverable error during ',
        inlineCode('update'),
        ', ',
        inlineCode('view'),
        ', or command execution, it stops all processing and renders a fallback UI. This is not error handling \u2014 there is no recovery from this state. The runtime is dead.',
      ),
      para(
        'By default, Foldkit shows a built-in error screen with the error message and a reload button. Pass an ',
        inlineCode('errorView'),
        ' function to ',
        inlineCode('makeElement'),
        ' or ',
        inlineCode('makeApplication'),
        ' to customize it. It receives the ',
        inlineCode('Error'),
        ' and returns ',
        inlineCode('Html'),
        ':',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.errorViewCustomHighlighted),
          ],
          [],
        ),
        Snippets.errorViewCustomRaw,
        'Custom errorView example',
        model,
        'mb-8',
      ),
      para(
        'Call ',
        inlineCode('html<never>()'),
        ' with ',
        inlineCode('never'),
        ' as the type parameter. Since the runtime has stopped, no messages will ever be dispatched \u2014 ',
        inlineCode('never'),
        ' makes this explicit and prevents event handlers like ',
        inlineCode('OnClick'),
        ' from being used.',
      ),
      para(
        'Foldkit\u2019s event handlers like ',
        inlineCode('OnClick'),
        ' work by dispatching messages to the runtime. Since the runtime has stopped, those handlers are silently ignored. For interactivity, like a reload button, use ',
        inlineCode("Attribute('onclick', 'location.reload()')"),
        '. This sets a raw DOM event handler directly on the element, bypassing Foldkit\u2019s dispatch system entirely.',
      ),
      callout(
        'Only in errorView',
        'In a normal Foldkit app, always use ',
        inlineCode('OnClick'),
        ' with messages \u2014 never raw DOM event attributes. ',
        inlineCode('errorView'),
        ' is the one exception because the runtime is no longer running.',
      ),
      para(
        'If your custom ',
        inlineCode('errorView'),
        ' itself throws an error, Foldkit catches it and falls back to the default error screen showing both the original error and the ',
        inlineCode('errorView'),
        ' error.',
      ),
      para(
        'See the ',
        link(Link.exampleErrorView, 'error-view example'),
        ' for a working demonstration.',
      ),
      tableOfContentsEntryToHeader(slowViewWarningHeader),
      para(
        'During development, Foldkit warns in the console when a ',
        inlineCode('view'),
        ' call takes longer than the frame budget. A view that exceeds 16ms is already dropping frames. The warning nudges you to move computation into ',
        inlineCode('update'),
        ' or memoize expensive subtrees with ',
        link(
          advancedPatternsRouter.build({}) + '#create-lazy',
          'createLazy',
        ),
        ' and ',
        link(
          advancedPatternsRouter.build({}) + '#create-keyed-lazy',
          'createKeyedLazy',
        ),
        '.',
      ),
      para(
        'The warning only runs in dev mode (gated behind ',
        inlineCode('import.meta.hot'),
        '), so there is zero runtime cost in production builds.',
      ),
      para(
        'The default threshold is 16ms (one frame at 60fps). Pass ',
        inlineCode('slowViewThresholdMs'),
        ' to ',
        inlineCode('makeElement'),
        ' or ',
        inlineCode('makeApplication'),
        ' to customize it:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.slowViewThresholdHighlighted),
          ],
          [],
        ),
        Snippets.slowViewThresholdRaw,
        'Custom slow view threshold',
        model,
        'mb-8',
      ),
      para(
        'Set ',
        inlineCode('slowViewThresholdMs'),
        ' to ',
        inlineCode('false'),
        ' to disable the warning entirely.',
      ),
    ],
  )
