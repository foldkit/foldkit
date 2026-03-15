import { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { Link } from '../../link'
import type { TableOfContentsEntry } from '../../main'
import {
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

const keyingRouteViewsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'keying-route-views',
  text: 'Route Views',
}

const keyingLayoutBranchesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'keying-layout-branches',
  text: 'Layout Branches',
}

const keyingModelStateHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'keying-model-state',
  text: 'Model State Branches',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  keyingHeader,
  keyingRouteViewsHeader,
  keyingLayoutBranchesHeader,
  keyingModelStateHeader,
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
        ' for virtual DOM diffing. When a view branches into structurally different trees in the same DOM position, Snabbdom will try to patch one tree into the other. This causes stale input state, mismatched event handlers, broken focus, and bugs that are extremely hard to track down.',
      ),
      warningCallout(
        'Always key branch points',
        'Any time your view switches between structurally different trees \u2014 routes, layouts, or model states \u2014 wrap the branch in a ',
        inlineCode('keyed'),
        ' element. Without it, the virtual DOM patches instead of replacing, which causes subtle and hard-to-diagnose bugs.',
      ),
      para(
        'The ',
        inlineCode('keyed'),
        ' function tells Snabbdom that when the key changes, the old tree should be fully removed and the new tree inserted fresh \u2014 no diffing, no patching, no carryover. In React, this happens automatically when component types differ. In Foldkit, you opt in explicitly.',
      ),
      tableOfContentsEntryToHeader(keyingRouteViewsHeader),
      para(
        'The most common case. When rendering route content, key by ',
        inlineCode('model.route._tag'),
        ' so navigating between routes replaces the DOM rather than patching it:',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.keyingRouteViewsHighlighted)],
          [],
        ),
        Snippets.keyingRouteViewsRaw,
        'Copy route views keying example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(keyingLayoutBranchesHeader),
      para(
        'When the app switches between entirely different layouts \u2014 a landing page vs. a docs layout with sidebar vs. a dashboard \u2014 key the outermost container of each branch with a stable string:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.keyingLayoutBranchesHighlighted),
          ],
          [],
        ),
        Snippets.keyingLayoutBranchesRaw,
        'Copy layout branches keying example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Without this, navigating from a full-width landing page to a sidebar docs layout would cause Snabbdom to try to morph one into the other \u2014 reusing DOM nodes across completely different structures.',
      ),
      tableOfContentsEntryToHeader(keyingModelStateHeader),
      para(
        'When the model itself is a discriminated union with structurally different views per variant, key on ',
        inlineCode('model._tag'),
        ':',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.keyingModelStateHighlighted)],
          [],
        ),
        Snippets.keyingModelStateRaw,
        'Copy model state keying example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'This ensures that logging in fully tears down the login form and builds the dashboard from scratch, rather than patching one into the other.',
      ),
    ],
  )
