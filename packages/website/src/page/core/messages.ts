import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div, em } from '../../html'
import type { Model, TableOfContentsEntry } from '../../main'
import {
  callout,
  inlineCode,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import * as Snippets from '../../snippet'
import { highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
]

export const view = (model: Model): Html =>
  div(
    [],
    [
      pageTitle('core/messages', 'Messages'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Messages represent all the events that can occur in your application. They describe ',
        em([], ['what happened']),
        ', not ',
        em([], ['how to handle it']),
        '. Messages are implemented as tagged unions, providing exhaustive pattern matching and type safety.',
      ),
      para(
        'This distinction matters more than it sounds. A message like ',
        inlineCode('PressedIncrement'),
        " doesn't say ",
        em([], ["'add one to the count'"]),
        ' — it says ',
        em([], ["'the user pressed the increment button.'"]),
        ' The update function decides what that means. Maybe today it adds one. Maybe tomorrow it fetches a new count from a server. The message stays the same.',
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
      para(
        'Messages follow a verb-first, past-tense naming convention: ',
        inlineCode('PressedIncrement'),
        ', not ',
        inlineCode('Increment'),
        ' or ',
        inlineCode('ADD_COUNT'),
        '. The verb prefix acts as a category marker — ',
        inlineCode('Pressed*'),
        ' for button clicks, ',
        inlineCode('Updated*'),
        ' for input changes, ',
        inlineCode('Succeeded*'),
        ' and ',
        inlineCode('Failed*'),
        ' for command results.',
      ),
      para(
        'The ',
        inlineCode('m()'),
        ' helper creates a tagged Schema type with a callable constructor. ',
        inlineCode("m('PressedIncrement')"),
        ' gives you a type you can pattern match on and a function you can call to create instances — ',
        inlineCode('PressedIncrement()'),
        '.',
      ),
      callout(
        'Actions without the boilerplate',
        'Messages are similar to Redux action types, but more ergonomic with Effect Schema. Instead of string constants and action creators, you get type inference and pattern matching for free.',
      ),
      para(
        "Messages describe what happened. But who decides what to do about it? That's the update function — the single place where your application's state transitions live.",
      ),
    ],
  )
