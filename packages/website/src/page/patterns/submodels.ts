import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { Link } from '../../link'
import type { Model, TableOfContentsEntry } from '../../main'
import {
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

const submoduleStructureHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'submodule-structure',
  text: 'Submodule Structure',
}

const parentResponsibilitiesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'parentResponsibilities',
  text: 'Parent Responsibilities',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  submoduleStructureHeader,
  parentResponsibilitiesHeader,
]

export const view = (model: Model): Html =>
  div(
    [],
    [
      pageTitle('patterns/submodels', 'Scaling with Submodels'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'As your app grows, a single Model/Message/Update becomes unwieldy. The submodel pattern lets you split your app into self-contained modules, each with its own Model, Message, init, update, and view.',
      ),
      tableOfContentsEntryToHeader(submoduleStructureHeader),
      para('Each submodule has its own Model, Message, and update:'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.submodelChildModuleHighlighted),
          ],
          [],
        ),
        Snippets.submodelChildModuleRaw,
        'Copy child module to clipboard',
        model,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(parentResponsibilitiesHeader),
      para('The parent model embeds the child model as a field:'),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.submodelParentModelHighlighted),
          ],
          [],
        ),
        Snippets.submodelParentModelRaw,
        'Copy parent model to clipboard',
        model,
        'mb-8',
      ),
      para(
        'The parent has a wrapper message that contains the child message:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.submodelWrapperMessageHighlighted),
          ],
          [],
        ),
        Snippets.submodelWrapperMessageRaw,
        'Copy wrapper message to clipboard',
        model,
        'mb-8',
      ),
      para(
        'In update, delegate to the child and rewrap returned commands:',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.submodelUpdateDelegationHighlighted),
          ],
          [],
        ),
        Snippets.submodelUpdateDelegationRaw,
        'Copy update delegation to clipboard',
        model,
        'mb-8',
      ),
      para(
        'See the ',
        link(
          Link.exampleShoppingCartSubmodel,
          'Shopping Cart example',
        ),
        ' for a complete implementation of this pattern.',
      ),
    ],
  )
