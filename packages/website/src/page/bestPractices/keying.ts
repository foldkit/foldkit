import { Html, html } from 'foldkit/html'

import { Link } from '../../link'
import { Message, type TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
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
  text: 'Keying',
}

const automaticBranchIdentityHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'automatic-branch-identity',
  text: 'Automatic Branch Identity',
}

const mappedListItemsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'mapped-list-items',
  text: 'Mapped List Items',
}

const delegatedBranchArmsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'delegated-branch-arms',
  text: 'Delegated Branch Arms',
}

const continuityHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'continuity-across-branches',
  text: 'Continuity Across Branches',
}

const withoutBuildIntegrationHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'without-the-build-integration',
  text: 'Without the Build Integration',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  keyingHeader,
  automaticBranchIdentityHeader,
  mappedListItemsHeader,
  delegatedBranchArmsHeader,
  continuityHeader,
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
        'Foldkit uses ',
        link(Link.snabbdom, 'Snabbdom'),
        ' for virtual DOM diffing. A key tells the differ which thing occupies a DOM position, so it can decide between patching an element in place and replacing it. With ',
        inlineCode('@foldkit/vite-plugin'),
        ' in the build, branch identity is handled for you: every conditional view arm that constructs its element directly receives a key derived from its call site. What remains manual is small: key mapped list items by a stable identifier, and key the branch site when an arm delegates to another view function.',
      ),
      tableOfContentsEntryToHeader(automaticBranchIdentityHeader),
      para(
        'When a view renders different content at the same DOM position, an unkeyed differ patches one version into the other. Focus, scroll positions, uncontrolled input values, and open ',
        inlineCode('details'),
        ' elements bleed across what is logically a different element. The build integration closes this hole. Ternary arms, if/else returns, ',
        inlineCode('Match'),
        ' arms, ',
        inlineCode('Option.match'),
        ' and ',
        inlineCode('Array.match'),
        ' handlers, and inline conditional inserts all get a call-site key, so switching branches replaces the subtree:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.keyingAutomaticBranchesHighlighted),
          ],
          [],
        ),
        Snippet.keyingAutomaticBranchesRaw,
        'Copy automatic branch identity example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Neither branch carries a key. The build gives each arm its own identity, so toggling replaces the whole arm instead of patching the summary into the editor.',
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
        'Positional diffing looks correct until an entry is removed from the middle of the list or the list is reordered; the differ then patches one row’s DOM into what should be a different row. Automatic keys deliberately stay out of mapped rows: a call-site key would repeat on every row, so a row’s identity has to come from your data.',
      ),
      para(
        'Key by what the row is, never by what it shows. A key derived from displayed data changes whenever the content changes, which turns every edit into a teardown that discards focus, scroll position, and text selection.',
      ),
      tableOfContentsEntryToHeader(delegatedBranchArmsHeader),
      para(
        'The build can only key an arm whose element construction it can see. When an arm delegates to another view function, the element call lives inside the callee, so the branch site carries the key instead: one ',
        inlineCode('keyed'),
        ' wrapper with the discriminating tag.',
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
        'The ',
        inlineCode('keyed-required-for-delegated-arms'),
        ' lint rule flags delegated arms whose branch site carries no key. Conditional inserts of delegated content between stable siblings need the same treatment:',
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
      tableOfContentsEntryToHeader(continuityHeader),
      para(
        'Automatic keys make replacement the default. The rare inverse case is wanting an element to survive a branch switch: a draft input that must keep its text, focus, and scroll while the layout around it changes. Explicit keys always win over injected ones, and sharing one explicit key across arm roots claims the arms are the same element:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.keyingContinuityOverrideHighlighted),
          ],
          [],
        ),
        Snippet.keyingContinuityOverrideRaw,
        'Copy continuity override example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The shared root key keeps the wrapper patching in place across the toggle, and the keyed textarea inside it is matched across positions, so its state survives. Use this sparingly: a shared key asserts that the arms render compatible trees, and nothing checks that they stay compatible as the code evolves.',
      ),
      para(
        'The same discipline applies in the other direction: never derive an explicit key from displayed data to force a refresh.',
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
      warningCallout(
        'Keys are not change detection',
        'Key by what a thing is (a stable id, a discriminating tag), never by what it shows. If a key can change while the same conceptual thing stays on screen, the key is wrong.',
      ),
      tableOfContentsEntryToHeader(withoutBuildIntegrationHeader),
      warningCallout(
        'Branch identity requires the build integration',
        'Automatic branch keys are injected by @foldkit/vite-plugin, which create-foldkit-app includes by default. A build without the plugin keeps the old semantics: unkeyed branches patch in place.',
      ),
      para(
        'If your build cannot use the plugin, key branch points by hand: give every arm of a branching position its own key at its root, one key per branch, exactly as the sections above do for delegated arms.',
      ),
    ],
  )
}
