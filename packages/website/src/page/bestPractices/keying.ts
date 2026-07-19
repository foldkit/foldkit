import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
  warningCallout,
} from '../../prose'
import * as Snippet from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const keyingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'keying',
  text: 'Keying and Identity',
}

const viewFunctionBoundariesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'view-function-boundaries',
  text: 'View Functions Are Identity Boundaries',
}

const mappedListItemsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'mapped-list-items',
  text: 'Mapped List Items',
}

const inlineBranchesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'inline-same-tag-branches',
  text: 'Inline Same-Tag Branches',
}

const withoutBuildIntegrationHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'without-the-build-integration',
  text: 'Without the Build Integration',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  keyingHeader,
  viewFunctionBoundariesHeader,
  mappedListItemsHeader,
  inlineBranchesHeader,
  withoutBuildIntegrationHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('best-practices/keying', 'Keying'),
      tableOfContentsEntryToHeader(keyingHeader),
      para(
        'Foldkit tracks two independent kinds of identity while diffing. A key, which you write, names which sibling an element is inside a dynamic list. An identity, which the framework manages, decides whether a matched position is still the same thing: when identity changes, the old node is replaced instead of patched, so focus, scroll positions, uncontrolled input values, and open ',
        inlineCode('details'),
        ' elements never bleed from one logical element into another. Identity comes from the ',
        inlineCode('@foldkit/vite-plugin'),
        ' build, which every Foldkit app should use. The keying rule that remains is the one only your data can answer: key mapped list items by a stable identifier.',
      ),
      para(
        'If you know React, you already know this model. A view function is to Foldkit’s differ what a component type is to React’s: the same function at a position patches, a different function replaces. Keys do exactly what React keys do: they name list items, and they reset a position when the entity it shows changes, React’s “resetting state with a key” pattern. Two differences: identity is stamped by the build, so every branching syntax gets this behavior, and children arrays can be built freely, where React needs its inline conditional shape to keep sibling positions stable.',
      ),
      tableOfContentsEntryToHeader(viewFunctionBoundariesHeader),
      para(
        'The build brands every function you write with its own identity and stamps it onto the vnodes the function returns. Which branching syntax selects the function is irrelevant: ',
        inlineCode('if'),
        '/',
        inlineCode('else'),
        ', ternaries, ',
        inlineCode('Match'),
        ', switch statements, and pattern-matching libraries all behave identically, because identity attaches to the function that produced the subtree, not to the branch that chose it.',
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
        'Copy branching views example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Neither arm carries a key. ',
        inlineCode('editorView'),
        ' and ',
        inlineCode('summaryView'),
        ' have different identities, so switching replaces the subtree even though both render the same root tag. The flip side is continuity: a position keeps its DOM alive as long as the same view function keeps rendering it, so states that share a scaffold should route through one function. Match arms are covered whether they delegate or build their element inline, because each arm handler is itself a function. Conditional inserts between view-function siblings need no keys either:',
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
        'Copy conditional inserts example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'When the discount toggles, the differ still matches ',
        inlineCode('summaryView'),
        ' and ',
        inlineCode('checkoutView'),
        ' by their identities, so both keep their DOM while the discount subtree is inserted or removed cleanly.',
      ),
      para(
        'Plain view values are fine too. A const ',
        inlineCode('Html'),
        ' shared across positions or renders is safe: the runtime clones a reused vnode before diffing, so sharing never corrupts the tree. What a plain value lacks is an identity of its own, so two different consts swapping at one position patch in place by position, exactly like two same-tag JSX literals in React. When that switch must reset DOM state, reach for named view functions.',
      ),
      tableOfContentsEntryToHeader(mappedListItemsHeader),
      para(
        'Rows mapped from an array all come from the same function, so identity cannot tell them apart; that is by design, since which row is which is a fact about your data. Key list items by a stable Model identifier (an id, a UUID), never by array position:',
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
        'The same rule covers one more case: the same view function rendering different entities at one position over time. A detail page renders every article through one function, so every article shares that function’s identity, and without a key navigating from one article to the next patches the old page’s DOM, scroll position and open state included, into the new one. Key the root by which entity it is showing:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.keyingDetailPageHighlighted),
          ],
          [],
        ),
        Snippet.keyingDetailPageRaw,
        'Copy detail page keying example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Two hand-written siblings from one view function whose entities can swap are a list in disguise: rewrite them as a real mapped list over those entities, keyed like any other list item, rather than keying the pair in place. In every shape of this rule, key by what a thing is, never by what it shows. A key derived from displayed data changes whenever the content changes, which turns every edit into a teardown that discards focus, scroll position, and text selection:',
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
      tableOfContentsEntryToHeader(inlineBranchesHeader),
      para(
        'One edge matches React exactly: a ternary of two inline element constructions with the same tag, inside a single function, patches in place, because both arms share that function’s identity. When switching such a branch must reset DOM state, extract the arms into named view functions; each becomes its own identity boundary, and it is the view decomposition Foldkit code leans on everywhere anyway.',
      ),
      tableOfContentsEntryToHeader(withoutBuildIntegrationHeader),
      warningCallout(
        'Always build with the plugin',
        'Identity is stamped by @foldkit/vite-plugin, which create-foldkit-app includes by default. Do not build a Foldkit app without it.',
      ),
      para(
        'A build without the plugin falls back to positional matching plus keys, where every branch point needs a hand-written key at each arm root. That mode exists for unusual build setups, not as a choice.',
      ),
    ],
  )
}
