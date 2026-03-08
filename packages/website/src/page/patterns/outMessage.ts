import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { Link } from '../../link'
import type { TableOfContentsEntry } from '../../main'
import {
  callout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const definingOutMessagesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'defining-out-messages',
  text: 'Defining OutMessages',
}

const emittingFromTheChildHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'emitting-from-the-child',
  text: 'Emitting from the Child',
}

const handlingInTheParentHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'handling-in-the-parent',
  text: 'Handling in the Parent',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  definingOutMessagesHeader,
  emittingFromTheChildHeader,
  handlingInTheParentHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('patterns/parent-child-communication', 'OutMessage'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Your login Submodel has authenticated the user. Now what? The child can\u2019t transition the root Model to a logged-in state because it only knows about its own Model. And it shouldn\u2019t know about the root Model \u2014 that would break the encapsulation that makes Submodels useful in the first place.',
      ),
      para(
        'The OutMessage pattern solves this. The child emits a semantic event \u2014 "login succeeded, here\u2019s the session." The parent decides what to do with it. The child describes what happened; the parent decides the consequences.',
      ),
      callout(
        'Compare to React',
        'In React, you\u2019d pass an ',
        inlineCode('onLoginSuccess'),
        ' callback as a prop. This works but couples the child to the parent\u2019s interface. In Foldkit, OutMessage keeps the boundary clean \u2014 the child emits facts, the parent interprets them.',
      ),
      tableOfContentsEntryToHeader(definingOutMessagesHeader),
      para(
        'OutMessages live alongside the child\u2019s Message and follow the same naming conventions \u2014 past-tense facts describing what happened. ',
        inlineCode('SucceededLogin'),
        ', not ',
        inlineCode('TransitionToLoggedIn'),
        '. ',
        inlineCode('RequestedLogout'),
        ', not ',
        inlineCode('DoLogout'),
        '. The child doesn\u2019t know or care what the parent does with the information.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.outMessageDefinitionHighlighted),
          ],
          [],
        ),
        Snippets.outMessageDefinitionRaw,
        'Copy OutMessage definition to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(emittingFromTheChildHeader),
      para(
        'The child\u2019s update function returns a 3-tuple instead of the usual 2-tuple: Model, Commands, and an ',
        inlineCode('Option<OutMessage>'),
        '. Most Messages return ',
        inlineCode('Option.none()'),
        ' \u2014 only the significant "I need to tell the parent something" moments return ',
        inlineCode('Option.some(...)'),
        ':',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.outMessageChildUpdateHighlighted),
          ],
          [],
        ),
        Snippets.outMessageChildUpdateRaw,
        'Copy child update to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The ',
        inlineCode('Option'),
        ' makes the boundary explicit. ',
        inlineCode('SubmittedLoginForm'),
        ' fires a Command and returns ',
        inlineCode('Option.none()'),
        ' \u2014 nothing for the parent to act on yet. But when the login succeeds, the child emits ',
        inlineCode('Option.some(SucceededLogin({ sessionId }))'),
        ' \u2014 that\u2019s the signal the parent needs.',
      ),
      tableOfContentsEntryToHeader(handlingInTheParentHeader),
      para(
        'The parent uses ',
        inlineCode('Option.match'),
        ' on the OutMessage. ',
        inlineCode('onNone'),
        ' means the child handled it internally \u2014 just update the child\u2019s slice of the Model. ',
        inlineCode('onSome'),
        ' means the child is surfacing something the parent needs to act on:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.outMessageParentHandleHighlighted),
          ],
          [],
        ),
        Snippets.outMessageParentHandleRaw,
        'Copy parent handling to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'This is where the power of the pattern shows. When ',
        inlineCode('SucceededLogin'),
        ' arrives, the parent can do things the child has no knowledge of \u2014 transition to a completely different Model state, save the session, redirect the URL. The child stays focused on its domain; the parent handles cross-cutting concerns.',
      ),
      para(
        'See the ',
        link(Link.exampleAuth, 'Auth example'),
        ' for a complete implementation: a login module emits ',
        inlineCode('SucceededLogin'),
        ' when authentication completes, and the parent transitions to the logged-in state, saves the session, and updates the URL \u2014 all triggered by a single OutMessage.',
      ),
    ],
  )
