import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { TableOfContentsEntry } from '../../main'
import {
  callout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { patternsSubmodelsRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/messages', 'Messages'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A Message is a fact about something that happened in your application \u2014 not an instruction to do something, just a record of what occurred.',
      ),
      para(
        'In the restaurant analogy, "table 3 asked for the check" is a Message. It doesn\u2019t tell the waiter what to do \u2014 maybe they bring the check immediately, maybe they offer dessert first. The waiter (the update function) decides. The message stays the same either way.',
      ),
      para(
        inlineCode('ClickedIncrement'),
        ' doesn\u2019t say "add one to the count" \u2014 it says "the user clicked the increment button." The update function decides what that means. Maybe today it adds one. Maybe tomorrow it fetches a new count from a server. The Message stays the same.',
      ),
      para('The counter has three Messages:'),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.counterMessagesHighlighted)],
          [],
        ),
        Snippets.counterMessagesRaw,
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
        ' for Command results, and ',
        inlineCode('Got*'),
        ' for ',
        link(patternsSubmodelsRouter(), 'Submodel results'),
        '.',
      ),
      para(
        'The ',
        inlineCode('m()'),
        ' helper creates a ',
        inlineCode('TaggedStruct'),
        ' with a callable constructor. ',
        inlineCode("m('ClickedIncrement')"),
        ' gives you a type you can pattern match on and a function you can call to create instances \u2014 ',
        inlineCode('ClickedIncrement()'),
        '.',
      ),
      callout(
        'Actions without the boilerplate',
        'Messages are similar to Redux action types, but more ergonomic with Effect Schema. Instead of string constants and action creators, you get type inference and pattern matching for free.',
      ),
      para(
        'Messages describe what happened. But who decides what to do about it? That\u2019s the job of the update function \u2014 the single place where your application\u2019s state transitions live.',
      ),
    ],
  )
