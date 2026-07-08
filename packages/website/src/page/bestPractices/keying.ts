import { Html, html } from 'foldkit/html'

import { Link } from '../../link'
import { Message, type TableOfContentsEntry } from '../../main'
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
import { asyncDataRouter } from '../../route'
import * as Snippet from '../../snippet'
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

const oneKeyPerBranchHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'one-key-per-branch',
  text: 'One Key per Branch',
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
  oneKeyPerBranchHeader,
  mappedListItemsHeader,
  conditionalInsertsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
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
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.keyingBranchingViewsHighlighted),
          ],
          [],
        ),
        Snippet.keyingBranchingViewsRaw,
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
      tableOfContentsEntryToHeader(oneKeyPerBranchHeader),
      para(
        'Every branch gets its own key, and a key is never shared across branches. The temptation to share shows up with async data: ',
        inlineCode('Success'),
        ', ',
        inlineCode('Refreshing'),
        ', and ',
        inlineCode('Stale'),
        ' all render the same list, and giving them one key keeps the DOM (scroll position, focus, transitions) alive through a background refresh instead of rebuilding it on every revalidation.',
      ),
      para(
        'Sharing the key is the wrong fix. It splits one identity claim across two places that must now agree forever: the match arms say the states are different things, the key says they are the same thing, and nothing checks that the branches sharing a key keep rendering compatible trees. When they drift apart, Snabbdom patches one branch into another, which is the exact corruption keying exists to prevent.',
      ),
      para(
        'Restructure the view instead, so the branch structure itself carries the identity: collapse the states that render the same scaffold into one branch, and express their differences as keyed conditional inserts inside it. With ',
        link(asyncDataRouter(), 'AsyncData'),
        ' that is ',
        inlineCode('matchDataSplitEmpty'),
        ': four branches, four keys, and the ',
        inlineCode('Refreshing'),
        ' badge and ',
        inlineCode('Stale'),
        ' banner become inserts driven by ',
        inlineCode('isRefreshing'),
        ' and ',
        inlineCode('getError'),
        '.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.keyingOneKeyPerBranchHighlighted),
          ],
          [],
        ),
        Snippet.keyingOneKeyPerBranchRaw,
        'Copy one key per branch example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      warningCallout(
        'One key per branch',
        'If two branches want to share a key, they want to be one branch. Restructure the view rather than aliasing keys.',
      ),
      tableOfContentsEntryToHeader(mappedListItemsHeader),
      para(
        'Key list items by a stable model identifier (an id, a UUID), never by array position:',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippet.keyingListItemsHighlighted)],
          [],
        ),
        Snippet.keyingListItemsRaw,
        'Copy list items keying example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Positional diffing looks correct until an entry is removed from the middle of the list or the list is reordered. Snabbdom then patches the old row’s DOM into what should be a different row.',
      ),
      tableOfContentsEntryToHeader(conditionalInsertsHeader),
      para(
        'When a child appears or disappears between stable siblings, key each of them. Given children like ',
        inlineCode('[a, ...(cond ? [b] : []), c]'),
        ', give all three a key:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.keyingConditionalInsertsHighlighted),
          ],
          [],
        ),
        Snippet.keyingConditionalInsertsRaw,
        'Copy conditional inserts keying example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Snabbdom’s diff can often handle conditional inserts correctly by matching elements on their tag and classes, but that is implicit behavior. Explicit keys make the intent clear and stay correct across refactors.',
      ),
    ],
  )
}
