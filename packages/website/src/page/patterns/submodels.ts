import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
  warningCallout,
} from '../../prose'
import {
  coreMountRouter,
  exampleDetailRouter,
  patternsOutMessageRouter,
} from '../../route'
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

const wiringTheViewHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'wiring-the-view',
  text: 'Wiring the View',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  childModuleHeader,
  parentResponsibilitiesHeader,
  embeddingTheModelHeader,
  wrappingMessagesHeader,
  delegatingInUpdateHeader,
  wiringTheViewHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('patterns/submodels', 'Submodels'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'At some point, your app has 30 Messages, a sprawling Model, and an update function that scrolls for days. You’ve outgrown a single Model, Message, and update.',
      ),
      para(
        'The Submodels pattern lets you decompose your app into self-contained modules, each with its own Model, Message, and update. The same pieces you already know, just scoped to a single feature.',
      ),
      para(
        'In the restaurant analogy, think of a large restaurant with multiple stations: a sushi bar, a grill, a pastry counter. Each station has its own chef, its own order flow, its own plating. But the head waiter still coordinates: taking the order, routing it to the right station, and combining everything onto the table.',
      ),
      infoCallout(
        'Compare to React',
        'In React, components naturally nest and communicate through props and callbacks. In Foldkit, composition is explicit: the parent embeds the child’s Model, wraps its Messages, and delegates in update. Every interaction between parent and child is visible in the update function.',
      ),
      tableOfContentsEntryToHeader(childModuleHeader),
      para(
        'A child module has its own Model, Message, and update. Here’s a Settings module that manages theme preferences:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelChildModuleHighlighted),
          ],
          [],
        ),
        Snippets.submodelChildModuleRaw,
        'Copy child module to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Nothing here knows about the parent. The child manages its own state and handles its own Messages. This isolation is the point: you can develop, test, and reason about each module independently.',
      ),
      tableOfContentsEntryToHeader(parentResponsibilitiesHeader),
      para(
        'The parent has three jobs: embed the child’s Model, wrap the child’s Messages, and delegate to the child’s update.',
      ),
      tableOfContentsEntryToHeader(embeddingTheModelHeader),
      para('The child’s Model becomes a field in the parent’s Model:'),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelParentModelHighlighted),
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
        'In Foldkit, every Message is a top-level Message. The runtime only delivers Messages to your app’s update function, and there’s no built-in message routing to child modules. Instead, the parent creates a wrapper Message that carries the child’s Message inside it. By convention, these use the ',
        inlineCode('Got*Message'),
        ' prefix: ',
        inlineCode('GotSettingsMessage'),
        ', ',
        inlineCode('GotProductsMessage'),
        ', etc:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelWrapperMessageHighlighted),
          ],
          [],
        ),
        Snippets.submodelWrapperMessageRaw,
        'Copy wrapper message to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      warningCallout(
        'DevTools expects this naming convention',
        'The Foldkit DevTools use the ',
        inlineCode('Got*Message'),
        ' pattern to power the Submodel filter, which lets you scope DevTools Messages to a chosen Submodel. If your wrapper Messages don’t follow this naming convention, they won’t appear in the list of filterable Submodel Messages.',
      ),
      tableOfContentsEntryToHeader(delegatingInUpdateHeader),
      para(
        'When the parent receives a ',
        inlineCode('GotSettingsMessage'),
        ', it unwraps the child Message, calls the child’s update, updates the child’s slice of the Model, and maps the child’s returned Commands:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelUpdateDelegationHighlighted),
          ],
          [],
        ),
        Snippets.submodelUpdateDelegationRaw,
        'Copy update delegation to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The Command mapping deserves attention. The child’s Commands produce child Messages when they complete, but the Foldkit runtime expects top-level Messages. The child doesn’t wrap its own Commands because it could be used across many parents. So the parent uses ',
        inlineCode('Command.mapEffect'),
        ' to wrap each result in ',
        inlineCode('GotSettingsMessage'),
        ', translating child Messages back into the parent’s Message type. ',
        inlineCode('Command.mapEffect'),
        ' transforms the inner Effect while preserving the Command’s name, so traces still show the original name from the child module.',
      ),
      para(
        inlineCode('Mount.mapMessage'),
        ' does the same lift for ',
        link(coreMountRouter(), 'OnMount'),
        ' actions. When the child attaches mount-time work via ',
        inlineCode('OnMount'),
        ', the action’s result Message starts in the child’s Message type; ',
        inlineCode('Mount.mapMessage(action, toParentMessage)'),
        ' translates it into the parent’s, just as ',
        inlineCode('Command.mapEffect'),
        ' does for Commands. The name set on the original ',
        inlineCode('Mount.define'),
        ' is preserved through the lift, so DevTools still attributes the action to the child module.',
      ),
      tableOfContentsEntryToHeader(wiringTheViewHeader),
      para(
        'A child that doesn’t know about its parent can’t hard-code the parent’s Message type. Instead, the child’s ',
        inlineCode('view'),
        ' is generic over a ',
        inlineCode('ParentMessage'),
        ' type and binds ',
        inlineCode('html<ParentMessage>()'),
        ' inside. The same callback the parent uses to lift child Messages in update gets passed into view, and any event the child dispatches goes through it:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelChildViewHighlighted),
          ],
          [],
        ),
        Snippets.submodelChildViewRaw,
        'Copy child view to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The parent invokes the child’s view with its own Message type as the explicit type argument, plus a ',
        inlineCode('toParentMessage'),
        ' callback that wraps every child Message in ',
        inlineCode('GotSettingsMessage'),
        ':',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelParentViewHighlighted),
          ],
          [],
        ),
        Snippets.submodelParentViewRaw,
        'Copy parent view to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The same Settings.view could be embedded under any parent that supplies the same wrapping. The child has no static dependency on a particular parent’s Message type; the wiring is supplied at the call site.',
      ),
      infoCallout(
        'Multiple instances',
        'If you need several instances of the same child (e.g. three accordions), embed each as a separate field. For a dynamic number, use an array and include an ID in the wrapper Message to route updates to the correct instance.',
      ),
      para(
        'See the ',
        link(
          exampleDetailRouter({ exampleSlug: 'shopping-cart' }),
          'Shopping Cart example',
        ),
        ' for a complete Submodels implementation. But what happens when a Message in the child should trigger a change in the parent’s Model, like a switch from logged-out to logged-in in the root Model, or an item added to a cart in a sibling Submodel? The child can’t update parent state and shouldn’t know about it. That’s what ',
        link(patternsOutMessageRouter(), 'OutMessage'),
        ' solves.',
      ),
    ],
  )
}
