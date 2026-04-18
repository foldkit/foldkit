import { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { Link } from '../../link'
import type { TableOfContentsEntry } from '../../main'
import {
  bulletPoint,
  bullets,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
  warningCallout,
} from '../../prose'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const keyingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'keying',
  text: 'Keying',
}

const branchingViewsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'branching-views',
  text: 'Branching Views',
}

const mappedListItemsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'mapped-list-items',
  text: 'Mapped List Items',
}

const conditionalInsertsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'conditional-inserts',
  text: 'Conditional Inserts',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  keyingHeader,
  branchingViewsHeader,
  mappedListItemsHeader,
  conditionalInsertsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('best-practices/keying', 'Keying'),
      tableOfContentsEntryToHeader(keyingHeader),
      para(
        'Foldkit uses ',
        link(Link.snabbdom, 'Snabbdom'),
        ' for virtual DOM diffing. When a view renders different content at the same DOM position, Snabbdom will try to patch one version into the other. This can cause stale input state, mismatched event handlers, and carried-over focus.',
      ),
      warningCallout(
        'Always key branch points',
        'If the same DOM position renders different content depending on your model, key it. Without a key, Snabbdom patches where it should replace.',
      ),
      para(
        'The ',
        inlineCode('keyed'),
        ' function tells Snabbdom that when the key changes, the old tree should be fully removed and the new tree inserted fresh: no diffing, no patching, no carryover.',
      ),
      para('There are three places in a view where keying matters:'),
      bullets(
        bulletPoint(
          'Branching views',
          'a position rendering different content based on a value',
        ),
        bulletPoint(
          'Mapped list items',
          'children rendered by mapping over an array',
        ),
        bulletPoint(
          'Conditional inserts',
          'all children in a list where any appear conditionally',
        ),
      ),
      tableOfContentsEntryToHeader(branchingViewsHeader),
      para('Use a discriminating string as the key, typically a tag:'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.keyingBranchingViewsHighlighted),
          ],
          [],
        ),
        Snippets.keyingBranchingViewsRaw,
        'Copy branching views keying example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The same rule applies to any control-flow branch that produces different content: ',
        inlineCode('Match'),
        ', ',
        inlineCode('if/else'),
        ', and ternaries.',
      ),
      tableOfContentsEntryToHeader(mappedListItemsHeader),
      para(
        'Key list items by a stable model identifier (an id, a UUID), never by array position:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.keyingListItemsHighlighted)],
          [],
        ),
        Snippets.keyingListItemsRaw,
        'Copy list items keying example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Positional diffing looks correct until an entry is removed from the middle of the list or the list is reordered. Snabbdom then patches the old row\u2019s DOM into what should be a different row.',
      ),
      tableOfContentsEntryToHeader(conditionalInsertsHeader),
      para(
        'When a child appears or disappears between stable siblings, key each of them. Given children like ',
        inlineCode('[a, ...(cond ? [b] : []), c]'),
        ', give all three a key:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.keyingConditionalInsertsHighlighted),
          ],
          [],
        ),
        Snippets.keyingConditionalInsertsRaw,
        'Copy conditional inserts keying example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Snabbdom\u2019s diff can often handle conditional inserts correctly by matching elements on their tag and classes, but that is implicit behavior. Explicit keys make the intent clear and stay correct across refactors.',
      ),
    ],
  )
