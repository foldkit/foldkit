import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { Link } from '../../link'
import type { TableOfContentsEntry } from '../../main'
import {
  bullets,
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { bestPracticesImmutabilityRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const createLazyHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'create-lazy',
  text: 'createLazy',
}

const createKeyedLazyHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'create-keyed-lazy',
  text: 'createKeyedLazy',
}

const whenToUseLazyHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'when-to-use-lazy',
  text: 'When to Use Lazy Views',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  createLazyHeader,
  createKeyedLazyHeader,
  whenToUseLazyHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/view-memoization', 'View Memoization'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'In ',
        link(Link.elmArchitecture, 'The Elm Architecture'),
        ', every model change triggers a full call to ',
        inlineCode('view(model)'),
        '. The entire virtual DOM tree is rebuilt from scratch, then diffed against the previous tree to compute minimal DOM updates. For most apps this is fast enough, but when a view contains a large subtree that rarely changes, the cost of rebuilding and diffing that subtree on every render adds up.',
      ),
      para(
        'Foldkit provides two functions for skipping unnecessary view work: ',
        inlineCode('createLazy'),
        ' for single views and ',
        inlineCode('createKeyedLazy'),
        ' for lists. Both work by caching the VNode returned by a view function. When the function reference and all arguments are referentially equal (',
        inlineCode('==='),
        ") to the previous call, the cached VNode is returned without re-running the view function. Snabbdom's diff algorithm short-circuits when it sees the same VNode reference, so both VNode construction ",
        'and subtree diffing are skipped.',
      ),
      tableOfContentsEntryToHeader(createLazyHeader),
      para(
        inlineCode('createLazy'),
        ' creates a single memoization slot. Call it at module level to create a cache, then use it in your view to wrap an expensive subtree:',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.createLazyHighlighted)], []),
        Snippets.createLazyRaw,
        'Copy createLazy example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Both the view function and the lazy slot must be defined at module level. If the view function is defined inside the view, a new function reference is created on every render, which means the ',
        inlineCode('fn === previousFn'),
        ' check always fails and the cache is never used.',
      ),
      para(
        'Arguments are compared by reference, not by value. This works naturally with ',
        link(`${bestPracticesImmutabilityRouter()}#immutable-updates`, 'evo'),
        ' \u2014 when a model field isn\u2019t updated, ',
        inlineCode('evo'),
        ' preserves its reference. Only fields that actually changed get new references, so unchanged arguments automatically pass the ',
        inlineCode('==='),
        ' check.',
      ),
      tableOfContentsEntryToHeader(createKeyedLazyHeader),
      para(
        inlineCode('createKeyedLazy'),
        ' creates a ',
        inlineCode('Map'),
        '-backed cache where each key gets its own independent memoization slot. This is designed for lists where individual items change independently:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.createKeyedLazyHighlighted)],
          [],
        ),
        Snippets.createKeyedLazyRaw,
        'Copy createKeyedLazy example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'When one item in the list changes, only that item is recomputed. All other items return their cached VNodes instantly. This turns an ',
        inlineCode('O(n)'),
        ' view rebuild into ',
        inlineCode('O(1)'),
        ' for the common case where only one or two items change.',
      ),
      tableOfContentsEntryToHeader(whenToUseLazyHeader),
      para('Lazy views help most when:'),
      bullets(
        'A large view subtree changes infrequently relative to how often the parent re-renders',
        'A list has many items but only a few change at a time (table of contents, contact lists, dashboards)',
        'The view function is expensive to compute (deeply nested trees, many elements)',
      ),
      para(
        'Lazy views are unnecessary for small views, views that change on every model update, or leaf nodes with minimal children. The memoization check itself has a small cost, so applying it everywhere would add overhead without benefit.',
      ),
      infoCallout(
        'How it works under the hood',
        'Foldkit\u2019s virtual DOM library (',
        link(Link.snabbdom, 'Snabbdom'),
        ') compares the old and new VNode by reference before diffing. When ',
        inlineCode('oldVnode === newVnode'),
        ', it returns immediately — no attribute comparison, no child reconciliation, no DOM touching. ',
        inlineCode('createLazy'),
        ' and ',
        inlineCode('createKeyedLazy'),
        ' exploit this by returning the exact same VNode object when inputs are unchanged.',
      ),
    ],
  )
