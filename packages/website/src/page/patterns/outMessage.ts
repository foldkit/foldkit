import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { Link } from '../../link'
import type { Model, TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
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
      pageTitle(
        'patterns/parent-child-communication',
        'Parent-Child Communication with OutMessage',
      ),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        "Sometimes a child module needs to trigger a change in the parent's state. Child modules cannot directly update parent state—they only manage their own. The ",
        inlineCode('OutMessage'),
        ' pattern solves this—children emit semantic events that parents then handle.',
      ),
      para(
        'Define ',
        inlineCode('OutMessage'),
        ' schemas alongside your child ',
        inlineCode('Message'),
        ':',
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
        model,
        'mb-8',
      ),
      para(
        'The child update function returns a 3-tuple: model, commands, and an optional ',
        inlineCode('OutMessage'),
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
        model,
        'mb-8',
      ),
      para(
        'The parent handles the ',
        inlineCode('OutMessage'),
        ' with ',
        inlineCode('Option.match'),
        ', taking action when present:',
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
        model,
        'mb-8',
      ),
      para(
        'Use ',
        inlineCode('Array.map'),
        ' with ',
        inlineCode('Effect.map'),
        ' to wrap child commands in parent message types:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.outMessageMappedCommandsHighlighted),
          ],
          [],
        ),
        Snippets.outMessageMappedCommandsRaw,
        'Copy command mapping to clipboard',
        model,
        'mb-8',
      ),
      para(
        inlineCode('OutMessage'),
        's are semantic events (like ',
        inlineCode('LoginSucceeded'),
        ') while commands are side effects. This separation keeps child modules focused on their domain while parents handle cross-cutting concerns. See the ',
        link(Link.exampleAuth, 'Auth example'),
        ' for a complete implementation.',
      ),
    ],
  )
