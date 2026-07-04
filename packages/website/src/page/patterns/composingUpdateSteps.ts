import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  bullets,
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import {
  asyncDataRouter,
  bestPracticesImmutabilityRouter,
  coreCommandsRouter,
  coreSubmodelRouter,
  coreUpdateRouter,
  patternsInformingSubmodelsRouter,
  patternsRevalidatingCachesRouter,
  uiToastRouter,
} from '../../route'
import * as Snippet from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const updateReturnShapeHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-update-return-shape',
  text: 'The Update Return Shape',
}

const combineCombinatorHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-combine-combinator',
  text: 'The combine Combinator',
}

const namedFactoriesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'steps-as-named-factories',
  text: 'Steps as Named Factories',
}

const helpersThatSlotInHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'helpers-that-slot-in',
  text: 'Helpers That Slot In',
}

const dynamicStepListHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'building-the-step-list-dynamically',
  text: 'Building the Step List Dynamically',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  updateReturnShapeHeader,
  combineCombinatorHeader,
  namedFactoriesHeader,
  helpersThatSlotInHeader,
  dynamicStepListHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('patterns/composing-update-steps', 'Composing Update Steps'),
      infoCallout(
        'Prerequisite',
        'This page builds on core ',
        link(coreUpdateRouter(), 'update'),
        ' and ',
        link(coreCommandsRouter(), 'Commands'),
        '. Read those first if the ',
        inlineCode('[Model, Commands]'),
        ' return shape or how a Command carries a Message back into update is unfamiliar.',
      ),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'One Message often calls for several independent responses. A note gets created, so the “All Notes” feed should revalidate, the note’s notebook feed should revalidate, and a toast should appear. Each of those is a small, self-contained edit to the Model paired with zero or more Commands. Written by hand, they turn into a tangle of intermediate tuples: thread ',
        inlineCode('model'),
        ' into the first step, destructure, thread the next model into the second step, concatenate the Commands, and so on.',
      ),
      para(
        inlineCode('Update.combine'),
        ' removes that tangle. It takes a flat list of steps, runs each one against the Model the previous step produced, and concatenates all the Commands into one batch. A step can both edit state and request effects, and the result is a recipe you can read top to bottom: every line is one part of how update responds to the Message.',
      ),
      para(
        inlineCode('combine'),
        ' ships in ',
        inlineCode('foldkit/update'),
        ', independent of the AsyncData module, but it is what lets several AsyncData cache writes compose into a single update return.',
      ),
      tableOfContentsEntryToHeader(updateReturnShapeHeader),
      para(
        'Everything here rests on one type. An update step hands back the next Model and the Commands to run, as a readonly pair: ',
        inlineCode('Update.Return'),
        '. Each update module pins its concrete Model and Message once, aliases the result, and pins the matching Match return type next to it, so every handler and step in that module deals in the same shape. The root update and every Submodel define their own pair.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.composingUpdateStepsUpdateReturnHighlighted),
          ],
          [],
        ),
        Snippet.composingUpdateStepsUpdateReturnRaw,
        'Copy update return shape code to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        inlineCode('UpdateReturn'),
        ' is the currency every step deals in, and ',
        inlineCode('withUpdateReturn'),
        ' pins the same shape onto every ',
        inlineCode('Match'),
        ' pipeline (you will see it at the call sites below). The last type parameter is the services the app’s Commands need; leave it off for applications without resources. The module also ships ',
        inlineCode('Update.noOp'),
        ', the identity step: it returns the Model untouched and asks for no Commands. It is both the seed value for the ',
        inlineCode('combine'),
        ' fold and a real step you can drop into a list when a branch has nothing to do.',
      ),
      infoCallout(
        'With an OutMessage',
        inlineCode('combine'),
        ' composes two-tuple steps. An update that also surfaces an OutMessage (the three-element ',
        inlineCode('Update.ReturnWithOutMessage'),
        ') runs its steps first and attaches the Option at the end: destructure ',
        inlineCode('const [nextModel, commands]'),
        ' from the ',
        inlineCode('combine'),
        ' call, then return ',
        inlineCode('[nextModel, commands, Option.some(...)]'),
        '. The steps themselves stay OutMessage-free.',
      ),
      tableOfContentsEntryToHeader(combineCombinatorHeader),
      para(
        inlineCode('Update.combine'),
        ' takes the flat list of steps and returns a single step: hand it the Model and it folds, threading the Model forward and concatenating the Commands.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.composingUpdateStepsCombineHighlighted),
          ],
          [],
        ),
        Snippet.composingUpdateStepsCombineRaw,
        'Copy combine code to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para('Two rules of that fold are the whole contract:'),
      bullets(
        h.span(
          [],
          [
            'Each step sees the Model the previous step produced, not the original. Steps run in order, and later steps observe earlier edits. If ',
            inlineCode('prependNewNote'),
            ' adds a note to a cache and a later step reads that cache, the note is there.',
          ],
        ),
        'Commands only ever accumulate. A step cannot cancel or replace another step’s Commands. Every Command any step returns ends up in the final batch, in order.',
        h.span(
          [],
          [
            'No Command runs during the fold. ',
            inlineCode('combine'),
            ' only collects them; the runtime runs the batch after update returns. Steps communicate with each other only through the Model.',
          ],
        ),
      ),
      para(
        'The fold seeds with ',
        inlineCode('Update.noOp'),
        ', so combining an empty list is just the Model unchanged with no Commands. That makes ',
        inlineCode('combine([])'),
        ' safe, which matters when the list is built conditionally (see the last section).',
      ),
      tableOfContentsEntryToHeader(namedFactoriesHeader),
      para(
        'A step is any ',
        inlineCode('(model: Model) => UpdateReturn'),
        ', the shape foldkit names ',
        inlineCode('Update.Step'),
        '. In practice you rarely write one inline. You write a named factory that returns a step, so the call site reads as a list of intentions rather than a list of closures. The refreshers are the archetype: ',
        inlineCode('refreshAllNotes'),
        ' and friends each return a step that revalidates one cache.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.composingUpdateStepsRefreshersHighlighted),
          ],
          [],
        ),
        Snippet.composingUpdateStepsRefreshersRaw,
        'Copy refreshers code to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        inlineCode('refreshAllNotes'),
        ' is a step directly. ',
        inlineCode('refreshNote(id)'),
        ' is a factory: call it with an id and you get a step back. Either way the result is a ',
        inlineCode('(model) => UpdateReturn'),
        ' that ',
        inlineCode('combine'),
        ' can run. ',
        inlineCode('Update.noOp'),
        ' is the do-nothing member of the same family, useful when a factory has nothing to contribute for a given input.',
      ),
      infoCallout(
        'The refresh helper',
        'The ',
        inlineCode('Update.refresh'),
        ' helper and its ',
        inlineCode('Update.Refreshable'),
        ' capability record (',
        inlineCode('read'),
        ', ',
        inlineCode('revalidate'),
        ', ',
        inlineCode('write'),
        ', ',
        inlineCode('load'),
        ') are covered in full on ',
        link(
          patternsRevalidatingCachesRouter(),
          'Revalidating Caches After a Mutation',
        ),
        '. Here the only thing that matters is that ',
        inlineCode('AsyncData.revalidate'),
        ' moves a ',
        inlineCode('Success'),
        ' or ',
        inlineCode('Stale'),
        ' cache entry to ',
        inlineCode('Refreshing'),
        ', and each refresher returns a step.',
      ),
      para(
        'The same idea folds a settled fetch into a cache. When a Command resolves, you have a settled ',
        inlineCode('Result'),
        ', and you want to write it into the previous cache entry while keeping the last-good data if it failed. ',
        inlineCode('AsyncData.settle'),
        ' does exactly that merge, and wrapping it in a step lets it join a ',
        inlineCode('combine'),
        ' list:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.composingUpdateStepsSettleNoteHighlighted),
          ],
          [],
        ),
        Snippet.composingUpdateStepsSettleNoteRaw,
        'Copy settle step code to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        inlineCode('AsyncData.settle'),
        ' folds the settled result into the previous state: a ',
        inlineCode('Success'),
        ' result becomes ',
        inlineCode('Success'),
        ', and a ',
        inlineCode('Failure'),
        ' result becomes ',
        inlineCode('Stale'),
        ' (error plus the previous data) when the entry already had data, or a bare ',
        inlineCode('Failure'),
        ' when it did not. That is the keep-stale behavior a hand-written ',
        inlineCode('Succeeded'),
        '/',
        inlineCode('Failed'),
        ' pair also expresses; ',
        inlineCode('settle'),
        ' packages it into one call. Both styles are valid, and the ',
        link(asyncDataRouter(), 'Async Data'),
        ' page shows the pair form.',
      ),
      tableOfContentsEntryToHeader(helpersThatSlotInHeader),
      para(
        'Not every step is a refresher. ',
        inlineCode('showToast'),
        ' is a ',
        inlineCode('Function.dual'),
        ' helper: it works as a standalone update return, and, because its data-last overload is a ',
        inlineCode('(model) => UpdateReturn'),
        ', it also drops straight into a ',
        inlineCode('combine'),
        ' list.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.composingUpdateStepsShowToastHighlighted),
          ],
          [],
        ),
        Snippet.composingUpdateStepsShowToastRaw,
        'Copy toast helper code to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Called data-first, ',
        inlineCode("showToast(model, 'Success', 'Saved')"),
        ' is a complete ',
        inlineCode('UpdateReturn'),
        ' you can return on its own. Called data-last, ',
        inlineCode("showToast('Success', 'Saved')"),
        ' is a step whose input is the Model, which is exactly the shape ',
        inlineCode('combine'),
        ' wants. One helper serves both the “this Message only calls for a toast” case and the “this Message calls for five things, one of which is a toast” case.',
      ),
      tableOfContentsEntryToHeader(dynamicStepListHeader),
      para(
        'The list handed to ',
        inlineCode('combine'),
        ' is a normal array, so you can build it with the usual tools: map, filter, and above all the conditional spread. ',
        inlineCode('editNote'),
        ' is the case that needs it. Editing a note can move it to a different notebook, and only when it moves does the previous notebook’s feed need revalidating. That extra step appears exactly when ',
        inlineCode('hasMoved'),
        ' is true.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.composingUpdateStepsEditNoteHighlighted),
          ],
          [],
        ),
        Snippet.composingUpdateStepsEditNoteRaw,
        'Copy edit note code to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The shape ',
        inlineCode(
          'pipe(model, replaceNoteInCaches(note), Update.combine([...]))',
        ),
        ' is the canonical call site. First a pure Model edit (',
        inlineCode('replaceNoteInCaches'),
        ' writes the updated note into ',
        inlineCode('allNotes'),
        ', ',
        inlineCode('notesByNotebook'),
        ', and ',
        inlineCode('noteById'),
        '), then ',
        inlineCode('combine'),
        ' runs the steps against that already-edited Model and gathers their Commands. The conditional spread ',
        inlineCode(
          '...(hasMoved ? [refreshNotebookNotes(previousNotebookId)] : [])',
        ),
        ' adds a step or contributes nothing, and because every step is just a value in an array, the recipe stays flat and readable no matter how many branches feed it.',
      ),
      para('Compare that to threading the tuples by hand:'),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.composingUpdateStepsManualThreadingHighlighted),
          ],
          [],
        ),
        Snippet.composingUpdateStepsManualThreadingRaw,
        'Copy manual threading code to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Every intermediate name (',
        inlineCode('m1'),
        ', ',
        inlineCode('c1'),
        ', ...) is an opportunity to thread the wrong Model or forget a Command in the final concat. ',
        inlineCode('combine'),
        ' makes those mistakes unrepresentable: the Model is threaded for you, and no Command can be dropped.',
      ),
      para(
        'The ',
        link(coreUpdateRouter(), 'update'),
        ' guide covers the base ',
        inlineCode('[Model, Commands]'),
        ' contract this page composes, and ',
        link(coreCommandsRouter(), 'Commands'),
        ' covers how the runtime runs the accumulated batch. The ',
        inlineCode('UpdatedNote'),
        ' OutMessage handled above comes from the ',
        link(coreSubmodelRouter(), 'Submodel'),
        ' pattern, and ',
        link(patternsInformingSubmodelsRouter(), 'Informing Submodels'),
        ' is the sibling pattern for changes a Submodel does not own.',
      ),
      para(
        link(bestPracticesImmutabilityRouter(), 'Immutability'),
        ' explains why each step returns a new Model via ',
        inlineCode('evo'),
        ' rather than mutating, and ',
        link(uiToastRouter(), 'UI Toast'),
        ' covers the toast surface ',
        inlineCode('showToast'),
        ' drives. ',
        link(
          patternsRevalidatingCachesRouter(),
          'Revalidating Caches After a Mutation',
        ),
        ' consumes ',
        inlineCode('combine'),
        ' to compose its AsyncData cache writes.',
      ),
    ],
  )
}
