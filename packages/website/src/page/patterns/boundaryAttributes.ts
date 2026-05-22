import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { coreSubmodelRouter } from '../../route'
import { type CopiedSnippets } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const theProblemHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-problem',
  text: 'The Problem',
}

const howItWorksHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'how-it-works',
  text: 'How It Works',
}

const whenToReachForItHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'when-to-reach-for-it',
  text: 'When to Reach For It',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  theProblemHeader,
  howItWorksHeader,
  whenToReachForItHeader,
]

export const view = (_copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('patterns/boundary-attributes', 'boundaryAttributes'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        inlineCode('boundaryAttributes'),
        ' is how a ',
        link(coreSubmodelRouter(), 'Submodel'),
        ' publishes attribute bundles to its parent without losing the wiring that routes its own events back through its own update function. The Submodel calls ',
        inlineCode('boundaryAttributes([...])'),
        ' to brand each attribute, and the consumer spreads the result onto whatever element they want with ',
        inlineCode("[...attrs.button, h.Class('...')]"),
        '. The branded handlers route correctly even though the consumer attached them inside their own view, under their own boundary.',
      ),
      tableOfContentsEntryToHeader(theProblemHeader),
      para(
        'A Submodel’s view builds attributes like ',
        inlineCode('h.OnClick(Toggled())'),
        ', where ',
        inlineCode('Toggled'),
        ' is the Submodel’s own Message. When the click fires, the dispatch must route through the Submodel’s ',
        inlineCode('toParentMessage'),
        ' wrap so the parent receives ',
        inlineCode('GotChildMessage({ message: Toggled() })'),
        ' and delegates back to the child’s update.',
      ),
      para(
        'But the Submodel doesn’t render its own DOM. It hands attributes to a consumer’s ',
        inlineCode('toView'),
        ' slot, and the consumer composes them into their own elements. The consumer’s slot runs in the parent’s boundary, not the child’s. If the OnClick attribute were processed at the moment the consumer spread it onto a button, the click would dispatch through the parent’s frame, bypassing the Submodel’s wrap entirely. The parent would receive a raw ',
        inlineCode('Toggled()'),
        ' it doesn’t know how to handle.',
      ),
      tableOfContentsEntryToHeader(howItWorksHeader),
      para(
        inlineCode('boundaryAttributes'),
        ' snapshots the Submodel’s dispatcher at the moment of publishing. Each attribute in the returned array carries that captured dispatcher with it. When the consumer’s element constructor (',
        inlineCode('h.button'),
        ', ',
        inlineCode('h.input'),
        ', etc.) sees a branded ',
        inlineCode('BoundaryAttribute'),
        ', it uses the carried dispatcher instead of the current one. The handler ends up wired to the Submodel’s frame even though the element lives in the parent’s view.',
      ),
      para('In code, the Submodel’s view looks like:'),
      h.pre(
        [
          h.Class(
            'bg-gray-50 dark:bg-gray-900 rounded p-4 text-sm font-mono overflow-x-auto mb-4',
          ),
        ],
        [
          `// Inside the Submodel's view, running in the child's boundary:
return inputs.toView({
  button: boundaryAttributes([
    h.OnClick(Toggled()),
    h.AriaExpanded(model.isOpen),
    h.Id(buttonId(model.id)),
  ]),
  panel: boundaryAttributes([
    h.Id(panelId(model.id)),
  ]),
})`,
        ],
      ),
      para(
        'And the consumer’s ',
        inlineCode('toView'),
        ' callback, running in the parent’s boundary:',
      ),
      h.pre(
        [
          h.Class(
            'bg-gray-50 dark:bg-gray-900 rounded p-4 text-sm font-mono overflow-x-auto mb-4',
          ),
        ],
        [
          `// Parent's view, threading published attributes onto its own elements:
toView: ({ button, panel }) =>
  h.div([], [
    h.button(
      [...button, h.Class('px-3 py-2 rounded')],
      ['Toggle'],
    ),
    model.disclosure.isOpen
      ? h.div([...panel, h.Class('mt-2 p-4 bg-gray-50')], ['Panel content'])
      : h.empty,
  ])`,
        ],
      ),
      para(
        'When the button is clicked, the ',
        inlineCode('OnClick'),
        ' attribute’s branded dispatcher routes the ',
        inlineCode('Toggled()'),
        ' message through the Submodel’s ',
        inlineCode('toParentMessage'),
        ' wrap, producing ',
        inlineCode('GotDisclosureMessage({ message: Toggled() })'),
        ' for the parent. The consumer’s own ',
        inlineCode('h.Class'),
        ' attribute is untouched: it’s a styling attribute with no message wiring.',
      ),
      tableOfContentsEntryToHeader(whenToReachForItHeader),
      para(
        'If you’re consuming a Foldkit UI primitive, you don’t call ',
        inlineCode('boundaryAttributes'),
        ' yourself. The primitive’s view publishes branded attributes; you just spread them.',
      ),
      para(
        'If you’re authoring your own Submodel and publishing attribute bundles to a consumer’s slot callback, every published attribute group must be wrapped in ',
        inlineCode('boundaryAttributes'),
        '. Forgetting this is a quiet bug: handlers will route through the parent’s frame and the Submodel’s update will never see its own events. Read the published Submodels in ',
        inlineCode('packages/foldkit/src/ui/'),
        ' for the canonical pattern.',
      ),
      infoCallout(
        'Render helpers don’t need this',
        'Stateless render helpers like ',
        inlineCode('Ui.Button'),
        ' and ',
        inlineCode('Ui.Input'),
        ' don’t publish via ',
        inlineCode('boundaryAttributes'),
        '. They’re not Submodels; their ',
        inlineCode('onClick'),
        ' or ',
        inlineCode('onInput'),
        ' values flow into element constructors in the consumer’s own frame, which is correct. The boundary wiring only matters when there’s a Submodel boundary to wire through.',
      ),
    ],
  )
}
