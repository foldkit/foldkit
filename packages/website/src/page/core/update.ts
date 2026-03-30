import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { Link } from '../../link'
import type { TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { coreArchitectureRouter, coreCommandsRouter } from '../../route'
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
      pageTitle('core/update', 'Update'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The update function is the heart of your application logic. It\u2019s a pure function that takes the current Model and a Message, and returns a new Model along with any Commands to execute.',
      ),
      para(
        'In the ',
        link(
          `${coreArchitectureRouter()}#the-restaurant-analogy`,
          'restaurant analogy',
        ),
        ', the update function is the waiter. Something happens \u2014 a customer flags them down, the kitchen rings the bell \u2014 and the waiter decides what to do next. Update the notebook, maybe write a slip for the kitchen. The waiter doesn\u2019t cook the food or serve it directly \u2014 they take in what happened and decide on next steps.',
      ),
      para(
        'Pure means predictable: given the same Model and the same Message, update always returns the same result. No hidden state, no ambient mutation, no surprises. This makes every state transition easy to reason about and trivial to test: pass in a Model and a Message, assert on the output.',
      ),
      para(
        'Foldkit uses ',
        link(Link.effectMatch, 'Effect.Match'),
        ' for exhaustive pattern matching on Messages. The TypeScript compiler will error if you forget to handle a Message type.',
      ),
      para(
        'Add a new Message to your app and forget to handle it here? The compiler tells you. No forgotten cases, no ',
        inlineCode('default'),
        ' branches silently swallowing new Messages (unless you explicitly opt into a catch-all).',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.counterUpdateHighlighted)],
          [],
        ),
        Snippets.counterUpdateRaw,
        'Copy update example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Notice that update returns a tuple: the new Model and an array of Commands. Commands represent side effects \u2014 HTTP requests, timers, browser API calls. Each Command carries a name for tracing and testing. For the counter, the Commands array is always empty. But when we add a delayed reset on the ',
        link(coreCommandsRouter(), 'Commands'),
        ' page, that will change.',
      ),
      para(
        'Before we get to side effects, there\u2019s one more piece of the counter to understand: the view function, which turns your Model into what the user sees on screen.',
      ),
    ],
  )
