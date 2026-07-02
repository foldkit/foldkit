import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import {
  coreArchitectureRouter,
  coreDevToolsRouter,
  coreSubmodelRouter,
  testingStoryRouter,
} from '../../route'
import * as Snippet from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const fireAndForgetHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'fire-and-forget-acknowledgments',
  text: 'Fire-and-Forget Acknowledgments',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  fireAndForgetHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/messages', 'Messages'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A Message is a fact about something that happened in your application. Not an instruction to do something, just a record of what occurred.',
      ),
      para(
        'In the ',
        link(
          `${coreArchitectureRouter()}#the-restaurant-analogy`,
          'restaurant analogy',
        ),
        ', “table 3 asked for the check” is a Message. It doesn’t tell the waiter what to do: maybe they bring the check immediately, maybe they offer dessert first. The waiter (the update function) decides. The message stays the same either way.',
      ),
      para(
        inlineCode('ClickedIncrement'),
        ' doesn’t say “add one to the count.” It says “the user clicked the increment button.” The update function decides what that means. Maybe today it adds one. Maybe tomorrow it fetches a new count from a server. The Message stays the same.',
      ),
      para('The counter has three Messages:'),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippet.counterMessagesHighlighted)],
          [],
        ),
        Snippet.counterMessagesRaw,
        'Copy messages example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'By convention, Messages follow a verb-first, past-tense naming pattern: ',
        inlineCode('ClickedIncrement'),
        ', not ',
        inlineCode('Increment'),
        ' or ',
        inlineCode('ADD_COUNT'),
        '. The verb prefix functions as a category marker, e.g. ',
        inlineCode('Clicked*'),
        ' for button clicks, ',
        inlineCode('Updated*'),
        ' for input changes, ',
        inlineCode('Succeeded*'),
        ' and ',
        inlineCode('Failed*'),
        ' for Command results that can meaningfully fail, ',
        inlineCode('Completed*'),
        ' for fire-and-forget Command acknowledgments, and ',
        inlineCode('Got*'),
        ' for ',
        link(coreSubmodelRouter(), 'Submodel results'),
        '.',
      ),
      para(
        'The ',
        inlineCode('m()'),
        ' helper creates a ',
        inlineCode('TaggedStruct'),
        ' with a callable constructor. ',
        inlineCode("m('ClickedIncrement')"),
        ' gives you a type you can pattern match on and a function you can call to create instances: ',
        inlineCode('ClickedIncrement()'),
        '.',
      ),
      infoCallout(
        'Actions without the boilerplate',
        'Messages are similar to Redux action types, but more ergonomic with Effect Schema. Instead of string constants and action creators, you get type inference and pattern matching for free.',
      ),
      tableOfContentsEntryToHeader(fireAndForgetHeader),
      para(
        'Some Commands exist only for their side effect: lock scroll while a dialog is open, focus an element, run a rendering pass over the DOM after it commits. Nothing comes back for the Model. Every Command still declares at least one result Message, so a fire-and-forget Command declares a per-Command acknowledgment named after it: Command ',
        inlineCode('LockScroll'),
        ' produces ',
        inlineCode('CompletedLockScroll'),
        ', ',
        inlineCode('RenderDiagrams'),
        ' produces ',
        inlineCode('CompletedRenderDiagrams'),
        '. The update arm is one line, ',
        inlineCode('[model, []]'),
        ': the deliberate, visible decision that this fact warrants no state change.',
      ),
      para(
        'This is what the “never ',
        inlineCode('NoOp'),
        '” convention actually bans: a shared do-nothing Message that multiple Commands return. It doesn’t mean every Message must change the Model. Two things depend on the distinct names.',
      ),
      para(
        'The first is the ',
        link(coreDevToolsRouter(), 'DevTools'),
        ' timeline, whose value is that every entry is a named fact. Per-Command acknowledgments like ',
        inlineCode('CompletedLockScroll'),
        ' and ',
        inlineCode('CompletedRenderDiagrams'),
        ' are distinct, searchable, attributable entries. One shared ',
        inlineCode('NoOp'),
        ' collapses every fire-and-forget completion into the same indistinguishable row: you see that something finished, but never what.',
      ),
      para(
        'The second is testing. ',
        link(testingStoryRouter(), 'Story'),
        ' resolves a pending Command with its declared result Message, and assertions hang off distinct update arms. A per-Command acknowledgment lets you write “when ',
        inlineCode('RenderDiagrams'),
        ' completes, nothing changes” as a specific, falsifiable test. A shared ',
        inlineCode('NoOp'),
        ' funnels unrelated flows through one arm: the assertion becomes vacuous, a regression where the wrong Command completes is invisible, and the exhaustive match stops documenting anything for that arm.',
      ),
      para(
        inlineCode('Completed*'),
        ' also says less than ',
        inlineCode('Succeeded*'),
        ': it asserts only that the attempt finished, not that it succeeded. That’s exactly right for a Command that swallows its errors with ',
        inlineCode('Effect.ignore'),
        '. A result named ',
        inlineCode('RenderedDiagrams'),
        ' claims rendering happened even when it failed; ',
        inlineCode('CompletedRenderDiagrams'),
        ' stays true either way. When failure is meaningful, declare a ',
        inlineCode('Succeeded*'),
        '/',
        inlineCode('Failed*'),
        ' pair instead.',
      ),
      para(
        'When several acknowledgments warrant identical handling, the one-line arms don’t have to multiply. Group them into a single ',
        inlineCode('M.tag'),
        ' arm after the substantive ',
        inlineCode('M.tags'),
        ' arms, with ',
        inlineCode('M.exhaustive'),
        ' still verifying that every Message in the union is handled. The facts stay distinct in the union, in DevTools, and in tests; only the handling groups:',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippet.completedAcksHighlighted)],
          [],
        ),
        Snippet.completedAcksRaw,
        'Copy fire-and-forget acknowledgments example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Messages describe what happened. But who decides what to do about it? That’s the job of the update function: the single place where your application’s state transitions live.',
      ),
    ],
  )
}
