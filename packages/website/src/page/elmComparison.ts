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
  coreCommandsRouter,
  coreDevToolsRouter,
  coreInitAndFlagsRouter,
  coreSubmodelRouter,
  coreSubscriptionsRouter,
  exampleDetailRouter,
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

const sameArchitectureHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'same-architecture',
  text: 'The Architecture You Already Know',
}

const elmMsgHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'elm-msg',
  text: 'Elm Msg',
}

const foldkitMessageHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-message',
  text: 'Foldkit Message union',
}

const updateFunctionHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-update-function',
  text: 'The Update Function',
}

const elmUpdateHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'elm-update',
  text: 'Elm update',
}

const foldkitUpdateHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-update',
  text: 'Foldkit update',
}

const modelHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-model',
  text: 'The Model: Custom Types vs Schema',
}

const elmModelHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'elm-model',
  text: 'Elm Model (type alias and custom types)',
}

const foldkitModelHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-model',
  text: 'Foldkit Model (Schema struct)',
}

const portsVsCommandsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'ports-vs-commands',
  text: 'Ports vs Commands',
}

const elmPortsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'elm-ports',
  text: 'Elm ports (the effect lives in JavaScript)',
}

const foldkitCommandsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-commands',
  text: 'Foldkit Commands (the effect lives with the app)',
}

const jsonHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'json',
  text: 'JSON: Decoders vs Schema',
}

const elmDecodersHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'elm-decoders',
  text: 'Elm decoders and encoders',
}

const foldkitSchemaHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-schema',
  text: 'Foldkit Schema (one definition, both directions)',
}

const subscriptionsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'subscriptions',
  text: 'Subscriptions',
}

const elmSubscriptionsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'elm-subscriptions',
  text: 'Elm subscriptions',
}

const foldkitSubscriptionsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-subscriptions',
  text: 'Foldkit Subscriptions',
}

const renderingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'rendering-performance',
  text: 'Rendering Performance',
}

const elmLazyHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'elm-lazy',
  text: 'Elm Html.Lazy and Html.Keyed',
}

const foldkitLazyHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-lazy',
  text: 'Foldkit createLazy and keyed',
}

const cellViewsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'cell-views',
  text: 'The cell view, twice',
}

const uiComponentsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'ui-components',
  text: 'UI Components',
}

const testingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'testing',
  text: 'Testing',
}

const elmTestHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'elm-test',
  text: 'Elm update test (pure, but the Cmd is opaque)',
}

const foldkitStoryTestHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'foldkit-story-test',
  text: 'Foldkit Story test (Commands are assertable values)',
}

const whatYouGiveUpHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-you-give-up',
  text: 'What You Give Up',
}

const whatYouGainHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'what-you-gain',
  text: 'What You Gain',
}

const conclusionHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'conclusion',
  text: 'Conclusion',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  sameArchitectureHeader,
  elmMsgHeader,
  foldkitMessageHeader,
  updateFunctionHeader,
  elmUpdateHeader,
  foldkitUpdateHeader,
  modelHeader,
  elmModelHeader,
  foldkitModelHeader,
  portsVsCommandsHeader,
  elmPortsHeader,
  foldkitCommandsHeader,
  jsonHeader,
  elmDecodersHeader,
  foldkitSchemaHeader,
  subscriptionsHeader,
  elmSubscriptionsHeader,
  foldkitSubscriptionsHeader,
  renderingHeader,
  elmLazyHeader,
  foldkitLazyHeader,
  cellViewsHeader,
  uiComponentsHeader,
  testingHeader,
  elmTestHeader,
  foldkitStoryTestHeader,
  whatYouGiveUpHeader,
  whatYouGainHeader,
  conclusionHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('foldkit-vs-elm-side-by-side', 'Foldkit vs Elm: Side by Side'),

      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'We built the same ',
        link(
          exampleDetailRouter({ exampleSlug: 'pixel-art' }),
          'pixel art editor',
        ),
        ' (',
        link('https://pixel.foldkit.dev', 'try it live'),
        ') in both Foldkit and Elm. Same features, same styling, same algorithms: grid drawing with undo/redo stacks, three tools with mirror modes, flood fill, localStorage persistence, PNG export, keyboard shortcuts, and a time-travel history panel.',
      ),
      para(
        'Foldkit and Elm agree about architecture, so this page is a translation guide, not an argument. Foldkit is the Elm Architecture, implemented in TypeScript on top of Effect: a single Model, Messages as facts, a pure update function, side effects as data the runtime executes. If you know Elm, you already know how a Foldkit app is shaped. What differs is the host language and what each side gets from it.',
      ),
      para(
        'And to be clear about the direction of respect: Elm is where this architecture comes from. Elm still provides guarantees Foldkit cannot match, and this page says so plainly where it matters.',
      ),
      infoCallout(
        'Read them both',
        'The Foldkit version is in the ',
        link(
          exampleDetailRouter({ exampleSlug: 'pixel-art' }),
          'examples gallery',
        ),
        '. The ',
        link(
          'https://github.com/foldkit/foldkit/tree/main/comparisons/pixel-art-elm',
          'Elm version source',
        ),
        ' is on GitHub: idiomatic Elm 0.19, no npm dependencies, just ',
        inlineCode('elm make'),
        '.',
      ),

      tableOfContentsEntryToHeader(sameArchitectureHeader),
      para(
        'Here is the whole translation table. Every row is a direct conceptual match.',
      ),
      comparisonTable(
        ['', 'Elm', 'Foldkit'],
        [
          [['State'], [inlineCode('Model')], ['Model (Schema struct)']],
          [
            ['Events'],
            [inlineCode('Msg'), ' custom type'],
            ['Message union (Schema)'],
          ],
          [
            ['Transitions'],
            [inlineCode('update : Msg -> Model -> ( Model, Cmd Msg )')],
            [inlineCode('update(model, message): [Model, Command[]]')],
          ],
          [
            ['Side effects'],
            [inlineCode('Cmd Msg'), ' (opaque)'],
            ['Command (a named, inspectable value)'],
          ],
          [
            ['Event streams'],
            [inlineCode('Sub Msg')],
            ['Subscription (Effect Stream)'],
          ],
          [
            ['Boot data'],
            ['Flags (', inlineCode('Json.Decode.Value'), ')'],
            [link(coreInitAndFlagsRouter(), 'Flags'), ' (Schema, an Effect)'],
          ],
          [
            ['JS interop'],
            ['Ports, custom elements'],
            ['n/a (the app is already JavaScript)'],
          ],
          [
            ['Nested state'],
            ['Nested TEA (by hand)'],
            [link(coreSubmodelRouter(), 'Submodel'), ' (first-class)'],
          ],
        ],
      ),
      para(
        'The rest of this page walks through the rows where the differences are interesting. Where a row is boring (in the best way), we say so and move on.',
      ),
      tableOfContentsEntryToHeader(elmMsgHeader),
      para(
        'The Elm ',
        inlineCode('Msg'),
        ' type has 21 variants. It reads exactly like you would expect:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonElmMsgHighlighted),
          ],
          [],
        ),
        Snippet.comparisonElmMsgRaw,
        'Copy Elm Msg',
        copiedSnippets,
        'mb-4',
      ),
      tableOfContentsEntryToHeader(foldkitMessageHeader),
      para(
        'The Foldkit Message union has 22. Same naming convention, same facts, same role as the total input domain of the update function:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonFoldkitMessageHighlighted),
          ],
          [],
        ),
        Snippet.comparisonFoldkitMessageRaw,
        'Copy Foldkit messages',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Why 22 against 21? The difference is structural, not stylistic. Foldkit Commands report back: ',
        inlineCode('CompletedSaveCanvas'),
        ' and ',
        inlineCode('SucceededExportPng'),
        ' exist because every Command resolution returns to update as a Message. In Elm, a fire-and-forget port has no completion Msg unless you wire one through another port. Three more are ',
        inlineCode('Got*Message'),
        ' variants delegating to ',
        link(uiOverviewRouter(), 'Foldkit UI'),
        ' Submodels (Dialog, Listbox). The Elm version hand-rolls those components, so their events collapse into the app’s own Msg variants, including four Msgs Foldkit doesn’t need: ',
        inlineCode('ToggledThemePicker'),
        ' and ',
        inlineCode('SelectedPaletteTheme'),
        ', because the shipped Listbox tracks its own open state and reports selection through its ',
        inlineCode('Got*Message'),
        '; plus ',
        inlineCode('DismissedErrorDialog'),
        ' and ',
        inlineCode('DismissedGridSizeDialog'),
        ', because the shipped Dialog closes itself through its ',
        inlineCode('close'),
        ' bundle.',
      ),
      para(
        'One real difference hides in the type definitions. Elm Msgs are constructors of a custom type: they exist at runtime as opaque tagged values. Foldkit Messages are Schema values: serializable, validatable, printable. That’s what lets ',
        link(coreDevToolsRouter(), 'Foldkit DevTools'),
        ' log, diff, and replay them, and what makes sending Messages over a wire a non-event.',
      ),

      tableOfContentsEntryToHeader(updateFunctionHeader),
      para(
        'This is the section where you should feel at home. The two update functions are the same function wearing different syntax.',
      ),
      tableOfContentsEntryToHeader(elmUpdateHeader),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonElmUpdateHighlighted),
          ],
          [],
        ),
        Snippet.comparisonElmUpdateRaw,
        'Copy Elm update',
        copiedSnippets,
        'mb-4',
      ),
      tableOfContentsEntryToHeader(foldkitUpdateHeader),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonFoldkitUpdateHighlighted),
          ],
          [],
        ),
        Snippet.comparisonFoldkitUpdateRaw,
        'Copy Foldkit update',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Pattern match on the message, return new state plus effects. ',
        inlineCode('case msg of'),
        ' becomes ',
        inlineCode('M.tagsExhaustive'),
        '. Record update syntax becomes ',
        inlineCode('evo'),
        ', which preserves references for unchanged fields exactly the way Elm’s record update does (that reference stability is what makes memoization work in both frameworks; more below). ',
        inlineCode('( model, Cmd.none )'),
        ' becomes ',
        inlineCode('[model, []]'),
        '.',
      ),
      para(
        'Exhaustiveness is worth a closer look. Elm’s compiler enforces it at the language level: a missing case is a compile error, full stop. Foldkit gets the same failure mode through ',
        inlineCode('M.tagsExhaustive'),
        ', which makes a missing Message handler a type error. Both stop you at compile time. The difference is that Elm’s check is unconditional, while Foldkit’s applies wherever update is written with ',
        inlineCode('M.tagsExhaustive'),
        ', which is how every Foldkit program in these docs is written.',
      ),

      tableOfContentsEntryToHeader(modelHeader),
      tableOfContentsEntryToHeader(elmModelHeader),
      para(
        'The Elm Model is a record of custom types. Impossible states are unrepresentable in both versions: the error dialog is open exactly when ',
        inlineCode('exportError'),
        ' is ',
        inlineCode('Just'),
        ', and the confirm dialog is open exactly when ',
        inlineCode('pendingGridSize'),
        ' is ',
        inlineCode('Just'),
        '. No booleans to desynchronize.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonElmModelHighlighted),
          ],
          [],
        ),
        Snippet.comparisonElmModelRaw,
        'Copy Elm model',
        copiedSnippets,
        'mb-4',
      ),
      tableOfContentsEntryToHeader(foldkitModelHeader),
      para(
        'The Foldkit Model is the same shape declared as an Effect Schema struct, with ',
        inlineCode('Option'),
        ' where Elm has ',
        inlineCode('Maybe'),
        ', plus Submodel fields for the stateful UI components:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonFoldkitModelHighlighted),
          ],
          [],
        ),
        Snippet.comparisonFoldkitModelRaw,
        'Copy Foldkit model',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Why declare the Model as a Schema instead of a plain type? Because a Schema is a type that also exists at runtime. It validates data at the boundaries (the localStorage round-trip below), derives encoders and decoders instead of making you write them, and gives DevTools a faithful, serializable picture of your whole application state. Elm’s type system is cleaner to read, and it is sound, which TypeScript’s does not even aim to be. Foldkit’s buys you machinery.',
      ),

      tableOfContentsEntryToHeader(portsVsCommandsHeader),
      para(
        'Here is the deepest real difference between the two frameworks, and this app exercises it twice: saving to localStorage and exporting a PNG. Neither is possible in pure Elm, because Elm code cannot touch browser APIs that aren’t wrapped by an official package. Both go through ports.',
      ),
      tableOfContentsEntryToHeader(elmPortsHeader),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonElmPortsHighlighted),
          ],
          [],
        ),
        Snippet.comparisonElmPortsRaw,
        'Copy Elm ports',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'And the JavaScript half, which lives in ',
        inlineCode('index.html'),
        ':',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonElmPortsJsHighlighted),
          ],
          [],
        ),
        Snippet.comparisonElmPortsJsRaw,
        'Copy port JavaScript',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Ports are a deliberate, principled design, and they deliver something remarkable: JavaScript on the other side of a port can throw, hang, or lie, and your Elm app cannot crash. The boundary is absolute. That’s the pitch, and it’s real.',
      ),
      para(
        'The cost is also real. The export feature is now two codebases: an encoder and port declaration in Elm, and a JavaScript handler somewhere else that the Elm compiler has never heard of. The failure path needs its own port. Rename a field in the encoder and the JavaScript silently receives the old shape of nothing. You can write the JavaScript side in TypeScript and type the port payloads by hand (tools like elm-ts-interop generate those types), but the two sides remain separate programs: nothing checks them against each other.',
      ),
      tableOfContentsEntryToHeader(foldkitCommandsHeader),
      para(
        'Foldkit doesn’t have a JS boundary because the whole app is already in the JS ecosystem. Both effects are ',
        link(coreCommandsRouter(), 'Commands'),
        ': named values wrapping an Effect, with the export logic (an offscreen canvas element, a download link) written inline, typed, and tested alongside everything else.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonFoldkitCommandHighlighted),
          ],
          [],
        ),
        Snippet.comparisonFoldkitCommandRaw,
        'Copy Foldkit commands',
        copiedSnippets,
        'mb-4',
      ),
      infoCallout(
        'What replaces the safety?',
        'Elm’s purity at this boundary is enforced by the compiler; Foldkit’s by the architecture: side effects exist only inside Commands, every Command resolves to a Message (including failures, via ',
        inlineCode('Effect.catch'),
        '), and the update function stays pure. You lose the compiler’s absolute wall and gain the ability to call any npm library three lines from your update function, with the failure path in the same file as the effect.',
      ),

      tableOfContentsEntryToHeader(jsonHeader),
      para(
        'Both apps persist the canvas to localStorage and restore it through flags at boot. That means a JSON round-trip, and the two frameworks make you pay for it differently.',
      ),
      tableOfContentsEntryToHeader(elmDecodersHeader),
      para(
        'Elm requires a decoder for the way in and an encoder for the way out, written separately. The compiler checks each one against your types, but nothing checks them against each other:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonElmFlagsHighlighted),
          ],
          [],
        ),
        Snippet.comparisonElmFlagsRaw,
        'Copy Elm flags',
        copiedSnippets,
        'mb-4',
      ),
      tableOfContentsEntryToHeader(foldkitSchemaHeader),
      para(
        'In Foldkit the ',
        inlineCode('SavedCanvas'),
        ' Schema is declared once, and both directions are derived from it:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonFoldkitFlagsHighlighted),
          ],
          [],
        ),
        Snippet.comparisonFoldkitFlagsRaw,
        'Copy Foldkit flags',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Elm decoders are precise and composable, and many Elm developers genuinely like writing them. But they are a maintenance surface: every field exists in three places (the type, the decoder, the encoder), and the compiler verifies each against the type but not against each other’s field names. ',
        inlineCode('Decode.field "gridSize"'),
        ' and ',
        inlineCode('Encode.object [ ( "gridsize", … ) ]'),
        ' typecheck fine and lose your data. Schema collapses the three places into one.',
      ),

      tableOfContentsEntryToHeader(subscriptionsHeader),
      para(
        'This is the section with the least to translate. Both frameworks derive active event listeners from Model state, and the runtime handles subscribe and unsubscribe as the Model changes. The mouse-release listener exists only while the user is drawing, in both apps, with no manual listener management in either.',
      ),
      tableOfContentsEntryToHeader(elmSubscriptionsHeader),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonElmSubscriptionsHighlighted),
          ],
          [],
        ),
        Snippet.comparisonElmSubscriptionsRaw,
        'Copy Elm subscriptions',
        copiedSnippets,
        'mb-4',
      ),
      tableOfContentsEntryToHeader(foldkitSubscriptionsHeader),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonFoldkitSubscriptionHighlighted),
          ],
          [],
        ),
        Snippet.comparisonFoldkitSubscriptionRaw,
        'Copy Foldkit subscriptions',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'The differences are at the edges. Elm subscriptions are limited to what official packages expose (',
        inlineCode('Browser.Events'),
        ', ',
        inlineCode('Time'),
        ', ports); anything else means a port. Foldkit ',
        link(coreSubscriptionsRouter(), 'Subscriptions'),
        ' are Effect Streams, so any event source you can reach from JavaScript (WebSockets, observers, third-party SDKs) can feed Messages directly, with the Stream combinators for filtering and mapping along the way. Note also the third entry in the Elm list: ',
        inlineCode('exportPngFailed FailedExportPng'),
        ' is port plumbing. The Foldkit version has no equivalent because Command failures already return as Messages.',
      ),

      tableOfContentsEntryToHeader(renderingHeader),
      para(
        'Both apps render a 32×32 grid (1024 cells) at 60fps during paint strokes, and both get there the same way: reference-equality memoization at panel and row boundaries. If you’ve used ',
        inlineCode('Html.Lazy'),
        ', you already know how Foldkit memoization works.',
      ),
      tableOfContentsEntryToHeader(elmLazyHeader),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonElmLazyHighlighted),
          ],
          [],
        ),
        Snippet.comparisonElmLazyRaw,
        'Copy Elm lazy views',
        copiedSnippets,
        'mb-4',
      ),
      tableOfContentsEntryToHeader(foldkitLazyHeader),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonFoldkitMemoizationHighlighted),
          ],
          [],
        ),
        Snippet.comparisonFoldkitMemoizationRaw,
        'Copy Foldkit memoization',
        copiedSnippets,
        'mb-4',
      ),
      para(
        inlineCode('lazy'),
        ' and ',
        inlineCode('createLazy'),
        ' do the identical check: if the arguments are reference-equal to last render, skip the view function. Elm’s record update and Foldkit’s ',
        inlineCode('evo'),
        ' both preserve unchanged references, so in both frameworks the check passes for everything a Message didn’t touch. The mechanical difference: Elm’s ',
        inlineCode('lazy'),
        ' family is arity-indexed (',
        inlineCode('lazy'),
        ' through ',
        inlineCode('lazy8'),
        ', and the wrapped function itself must be a top-level reference), while ',
        inlineCode('createLazy'),
        ' takes an args array and is created once at module level.',
      ),
      tableOfContentsEntryToHeader(cellViewsHeader),
      para(
        'One layer down, the per-cell code is where the two frameworks look most alike, because both treat messages as values at the event boundary. There are no handler closures to stabilize in either:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonElmCellViewHighlighted),
          ],
          [],
        ),
        Snippet.comparisonElmCellViewRaw,
        'Copy Elm cell view',
        copiedSnippets,
        'mb-4',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonFoldkitCellViewHighlighted),
          ],
          [],
        ),
        Snippet.comparisonFoldkitCellViewRaw,
        'Copy Foldkit cell view',
        copiedSnippets,
        'mb-4',
      ),

      tableOfContentsEntryToHeader(uiComponentsHeader),
      para(
        'The Elm version hand-rolls its dialogs, radio groups, switches, and theme listbox: the markup, the ARIA attributes, the open/closed state in the Model, the Escape key in the keyboard decoder, the backdrop click. Elm makes that work pleasant, but it’s on you, and the hand-rolled versions in this app cover less ground than a production component library (no focus trapping, no arrow-key navigation in the radio groups). Community packages exist, and elm-ui takes a different road entirely, but there is no standard accessible component kit.',
      ),
      para(
        'Foldkit ships ',
        link(uiOverviewRouter(), 'UI components'),
        '. The stateful ones (the dialogs and the theme listbox here) are themselves little Elm Architecture programs: each has a Model, Messages, and an update function, and you compose them as ',
        link(coreSubmodelRouter(), 'Submodels'),
        '. Their Models hold interaction state only: the selection stays in your Model, flows into the listbox view as ',
        inlineCode('maybeSelectedValue'),
        ', and comes back as a ',
        inlineCode('Selected'),
        ' OutMessage your update folds. The rest (the radio groups and mirror switches here) are controlled render helpers: your Model owns the value, and the helper bundles the markup, ARIA, and keyboard wiring around it. Focus management, ARIA, keyboard navigation, and transitions come built in, and the state lives in your Model where DevTools and tests can see it. If you ever wrote nested TEA in Elm (the triple of init/update/view, the ',
        inlineCode('Cmd.map'),
        '/',
        inlineCode('Html.map'),
        ' plumbing), Submodels are exactly that pattern with the plumbing standardized.',
      ),
      comparisonTable(
        ['', 'Elm (this app)', 'Foldkit'],
        [
          [
            ['Dialog, RadioGroup, Switch, Listbox'],
            ['Hand-rolled views + Model fields'],
            [
              'Shipped: Dialog and Listbox as Submodels, RadioGroup and Switch as controlled helpers',
            ],
          ],
          [
            ['Accessibility'],
            ['Whatever you write'],
            ['Built-in (aria, focus, keyboard)'],
          ],
          [
            ['Component state'],
            ['Yours, in the Model'],
            ['Yours, in the Model'],
          ],
          [
            ['Wiring pattern'],
            ['Nested TEA by hand'],
            ['Same pattern, built into the framework'],
          ],
        ],
      ),

      tableOfContentsEntryToHeader(testingHeader),
      para(
        'Testing the update function is a pleasure in both frameworks, for the same reason: it’s a pure function, so a test is just calling it. The difference shows up the moment a side effect matters.',
      ),
      tableOfContentsEntryToHeader(elmTestHeader),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonElmTestHighlighted),
          ],
          [],
        ),
        Snippet.comparisonElmTestRaw,
        'Copy Elm test',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Look at the underscores. Each ',
        inlineCode('update'),
        ' call returns a ',
        inlineCode('Cmd'),
        ' and the test throws it away, because a ',
        inlineCode('Cmd'),
        ' is opaque by design: no equality, no pattern matching, no way to ask “was that the save command?”. Delete the save from ',
        inlineCode('ReleasedMouse'),
        ' and this test stays green. The Elm community’s answer is ',
        link(
          'https://package.elm-lang.org/packages/avh4/elm-program-test/latest/',
          'elm-program-test',
        ),
        ', which is excellent but requires restructuring your program around simulatable effect types to use fully.',
      ),
      tableOfContentsEntryToHeader(foldkitStoryTestHeader),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.comparisonFoldkitTestHighlighted),
          ],
          [],
        ),
        Snippet.comparisonFoldkitTestRaw,
        'Copy Foldkit test',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'Because Commands are plain values, ',
        link(testingStoryRouter(), 'Story'),
        ' tests assert on them and resolve them inline, in the same synchronous pipeline as the Model assertions. Remove the ',
        inlineCode('SaveCanvas'),
        ' Command from the update function and this test fails. No program restructuring required: the production update function is already in the shape the test needs. ',
        link(testingSceneRouter(), 'Scene'),
        ' extends the same idea to interaction tests against the virtual DOM, querying by accessible role, no jsdom.',
      ),

      tableOfContentsEntryToHeader(whatYouGiveUpHeader),
      para('If you move from Elm to Foldkit, these are real losses.'),
      para(
        h.strong([], ['Enforced purity. ']),
        'Nothing in TypeScript stops a teammate from calling ',
        inlineCode('Date.now()'),
        ' in the middle of a Foldkit update function. The framework’s conventions, ',
        inlineCode('Story'),
        ' tests, and review culture catch it; in Elm it cannot be written at all.',
      ),
      para(
        h.strong([], ['No runtime exceptions. ']),
        'Elm’s flagship claim holds up in practice. Foldkit confines effects and models failures as Messages, and Effect makes error channels explicit, but the host language can still throw, and dependencies from npm can do anything at all.',
      ),
      para(
        h.strong([], ['A small language. ']),
        'Elm fits in your head. No ',
        inlineCode('any'),
        ', no type assertions, no six ways to write a function, one formatter with no options, and packages that cannot perform side effects. TypeScript plus Effect is a far larger surface, and Foldkit’s conventions are doing work the Elm language does by construction.',
      ),
      para(
        h.strong([], ['Smaller bundles. ']),
        'Dead code elimination is Elm’s home turf. ',
        inlineCode('elm make --optimize'),
        ' produces famously tiny assets. A Foldkit app carries the Effect runtime; tree-shaking helps, but Elm wins this one comfortably.',
      ),

      tableOfContentsEntryToHeader(whatYouGainHeader),
      para(
        h.strong([], ['The npm ecosystem, without a boundary. ']),
        'Every chart library, auth SDK, websocket client, and date library is a direct import inside a Command. The pixel art app’s canvas export went from “a port, an encoder, and a script tag” to a typed function next to the update that triggers it. This is the single biggest practical difference, and it compounds with every feature.',
      ),
      para(
        h.strong([], ['Gradual adoption, both directions. ']),
        'Elm embeds in an existing page too, talking to the host through flags and ports. A Foldkit program embedded in a TypeScript app shares its types and calls its modules directly; nothing is serialized across a boundary.',
      ),
      para(
        h.strong([], ['Schema as one source of truth. ']),
        'Types that validate, encode, and decode. No hand-written decoder/encoder pairs to keep in sync, and runtime validation at every boundary where the outside world hands you data.',
      ),
      para(
        h.strong([], ['Commands you can hold. ']),
        'Elm’s ',
        inlineCode('Cmd'),
        ' is opaque to your tests and your debugger. Foldkit Commands are named values: ',
        link(coreDevToolsRouter(), 'DevTools'),
        ' shows every Command next to the Message that produced it, and tests assert on them directly. Elm’s time-traveling debugger shows you every Msg and Model; Foldkit DevTools shows you those plus the effects.',
      ),
      para(
        h.strong([], ['Effect underneath. ']),
        'Retries, timeouts, concurrency, resource safety, and structured error handling are library primitives you compose inside Commands, not patterns you reinvent with Cmds and Msgs.',
      ),
      para(
        h.strong([], ['Shipped UI components. ']),
        'The accessible component kit Elm leaves to the community comes in the box, built on the same architecture as your app.',
      ),

      tableOfContentsEntryToHeader(conclusionHeader),
      para(
        'If Elm fits your constraints (greenfield frontend, a team excited by it, light interop needs), it remains one of the best ways to build a web application, and nothing on this page argues otherwise. Foldkit exists for the situations where Elm’s walled garden is the dealbreaker: a TypeScript codebase you can’t leave, npm dependencies you can’t wrap, teammates you can’t retrain.',
      ),
      para(
        'The bet Foldkit makes is that the Elm Architecture is the most durable idea in frontend, worth carrying into the ecosystem where most teams actually live, even at the cost of trading guarantees the compiler enforces for guarantees you would have to go out of your way to break. You can audit that trade concretely: read ',
        link(
          'https://github.com/foldkit/foldkit/tree/main/comparisons/pixel-art-elm',
          'the Elm source',
        ),
        ' and ',
        link(
          'https://github.com/foldkit/foldkit/tree/main/examples/pixel-art',
          'the Foldkit source',
        ),
        ' side by side. They are recognizably the same program. That’s the point.',
      ),
    ],
  )
}
