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

const identityNotDataHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'keys-carry-identity-not-data',
  text: 'Keys Carry Identity, Not Data',
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
  identityNotDataHeader,
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
        ' for virtual DOM diffing. When a view renders different content at the same DOM position, and the two versions share a root tag, Snabbdom will try to patch one version into the other. This can cause stale input state, mismatched event handlers, and carried-over focus.',
      ),
      warningCallout(
        'Key branch points that share a root tag',
        'If the same DOM position renders different branches depending on your model, and those branches share a root tag, give each branch root its own key. Without keys, Snabbdom patches where it should replace.',
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
          'a position rendering different branches that share a root tag',
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
      para(
        'Snabbdom only patches two elements when they share a tag. A branch whose root tag differs from every other branch can never be patched into one of them; a tag change is always a full teardown and replacement. Branches whose root tags all differ therefore need no keys:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.keyingDifferentTagsHighlighted),
          ],
          [],
        ),
        Snippet.keyingDifferentTagsRaw,
        'Copy different tags keying example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'When branches share a root tag, keys are what keep them apart. Give each branch’s root element its own discriminating key, typically the branch tag, one key per branch:',
      ),
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
        'The key lives on the element that is the branch. Never introduce a wrapper element whose only job is to carry the key: the wrapper adds a DOM node, and it is itself torn down and rebuilt on every branch change.',
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
      tableOfContentsEntryToHeader(identityNotDataHeader),
      para(
        'Every key above names an identity: which branch occupies a position, which row an element belongs to. The inverse mistake is deriving a key from the data a view displays, so that the key changes whenever the content changes. A key answers which thing occupies this position, never what that thing currently shows.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.keyingIdentityNotDataHighlighted),
          ],
          [],
        ),
        Snippet.keyingIdentityNotDataRaw,
        'Copy identity keying example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'When only data changed, the element should stay and patch: that is the diff working as intended. A data-derived key turns every content change into a teardown, which discards DOM state the next render cannot recreate: focus, scroll position, text selection, an open ',
        inlineCode('details'),
        ' element.',
      ),
      warningCallout(
        'Keys are not change detection',
        'Key by what a thing is (a branch tag, a stable id), never by what it shows. If a key can change while the same conceptual thing stays on screen, the key is wrong.',
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
        'Snabbdom’s diff can often handle conditional inserts correctly by matching elements on their tag, but that is implicit behavior. Explicit keys make the intent clear and stay correct across refactors.',
      ),
    ],
  )
}
