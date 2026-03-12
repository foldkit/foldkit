import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { TableOfContentsEntry } from '../../main'
import {
  callout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { exampleDetailRouter, patternsOutMessageRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const childModuleHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'child-module',
  text: 'The Child Module',
}

const parentResponsibilitiesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'parent-responsibilities',
  text: 'Parent Responsibilities',
}

const embeddingTheModelHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'embedding-the-model',
  text: 'Embedding the Model',
}

const wrappingMessagesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'wrapping-messages',
  text: 'Wrapping Messages',
}

const delegatingInUpdateHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'delegating-in-update',
  text: 'Delegating in update',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  childModuleHeader,
  parentResponsibilitiesHeader,
  embeddingTheModelHeader,
  wrappingMessagesHeader,
  delegatingInUpdateHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('patterns/submodels', 'Submodels'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'At some point, your app has 30 Messages, a sprawling Model, and an update function that scrolls for days. You\u2019ve outgrown a single Model, Message, and update.',
      ),
      para(
        'The Submodels pattern lets you decompose your app into self-contained modules, each with its own Model, Message, and update \u2014 the same pieces you already know, just scoped to a single feature.',
      ),
      para(
        'In the restaurant analogy, think of a large restaurant with multiple stations \u2014 a sushi bar, a grill, a pastry counter. Each station has its own chef, its own order flow, its own plating. But the head waiter still coordinates: taking the order, routing it to the right station, and combining everything onto the table.',
      ),
      callout(
        'Compare to React',
        'In React, components naturally nest and communicate through props and callbacks. In Foldkit, composition is explicit \u2014 the parent embeds the child\u2019s Model, wraps its Messages, and delegates in update. Every interaction between parent and child is visible in the update function.',
      ),
      tableOfContentsEntryToHeader(childModuleHeader),
      para(
        'A child module has its own Model, Message, and update. Here\u2019s a Settings module that manages theme preferences:',
      ),
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
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Nothing here knows about the parent. The child manages its own state and handles its own Messages. This isolation is the point \u2014 you can develop, test, and reason about each module independently.',
      ),
      tableOfContentsEntryToHeader(parentResponsibilitiesHeader),
      para(
        'The parent has three jobs: embed the child\u2019s Model, wrap the child\u2019s Messages, and delegate to the child\u2019s update.',
      ),
      tableOfContentsEntryToHeader(embeddingTheModelHeader),
      para(
        'The child\u2019s Model becomes a field in the parent\u2019s Model:',
      ),
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
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(wrappingMessagesHeader),
      para(
        'In Foldkit, every Message is a top-level Message \u2014 the runtime only delivers Messages to your app\u2019s update function. There\u2019s no built-in message routing to child modules. Instead, the parent creates a wrapper Message that carries the child\u2019s Message inside it. By convention, these use the ',
        inlineCode('Got*Message'),
        ' prefix \u2014 ',
        inlineCode('GotSettingsMessage'),
        ', ',
        inlineCode('GotProductsMessage'),
        ', etc:',
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
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(delegatingInUpdateHeader),
      para(
        'When the parent receives a ',
        inlineCode('GotSettingsMessage'),
        ', it unwraps the child Message, calls the child\u2019s update, updates the child\u2019s slice of the Model, and maps the child\u2019s returned Commands:',
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
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The Command mapping deserves attention. The child\u2019s Commands produce child Messages when they complete \u2014 but the Foldkit runtime expects top-level Messages. The child doesn\u2019t wrap its own Commands because it could be used across many parents. So the parent uses ',
        inlineCode('Effect.map'),
        ' to wrap each result in ',
        inlineCode('GotSettingsMessage'),
        ', translating child Messages back into the parent\u2019s Message type.',
      ),
      callout(
        'Multiple instances',
        'If you need several instances of the same child (e.g. three accordions), embed each as a separate field. For a dynamic number, use an array and include an ID in the wrapper Message to route updates to the correct instance.',
      ),
      para(
        'See the ',
        link(
          exampleDetailRouter({ exampleSlug: 'shopping-cart' }),
          'Shopping Cart example',
        ),
        ' for a complete Submodels implementation. But what happens when a Message in the child should trigger a change in the parent\u2019s Model \u2014 like a switch from logged-out to logged-in in the root Model, or an item added to a cart in a sibling Submodel? The child can\u2019t update parent state and shouldn\u2019t know about it. That\u2019s what ',
        link(patternsOutMessageRouter(), 'OutMessage'),
        ' solves.',
      ),
    ],
  )
