import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
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
      pageTitle('core/commands', 'Commands'),
      tableOfContentsEntryToHeader(overviewHeader),
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
      callout(
        'Errors are tracked, not hidden',
        'Commands use Effect\u2019s typed error channel \u2014 if a command can fail, the type signature tells you. ',
        inlineCode('Effect.catchAll'),
        ' turns failures into messages like ',
        inlineCode('FailedWeatherFetch'),
        ', and once all errors are handled, the type confirms it. The update function handles errors the same way it handles success: as facts about what happened.',
      ),
    ],
  )
