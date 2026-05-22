import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  bullets,
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
  warningCallout,
} from '../../prose'
import {
  coreRuntimeRouter,
  exampleDetailRouter,
  uiTypedPrimitivesRouter,
} from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const childSubmodelHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'child-submodel',
  text: 'The Child Submodel',
}

const embeddingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'embedding',
  text: 'Embedding the Submodel',
}

const embeddingModelHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'embedding-the-model',
  text: 'Embedding the Model',
}

const neverBypassHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'never-bypass-the-update',
  text: 'Never Bypass the Child’s Update',
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
  text: 'Wiring the View with h.submodel',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  childSubmodelHeader,
  embeddingHeader,
  embeddingModelHeader,
  neverBypassHeader,
  wrappingMessagesHeader,
  delegatingInUpdateHeader,
  wiringTheViewHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/submodel', 'Submodel'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'At some point, your app has 30 Messages, a sprawling Model, and an update function that scrolls for days. You’ve outgrown a single Model, Message, and update. It’s time to decompose into Submodels.',
      ),
      para(
        'A Submodel is a self-contained Model, Message, update, and Commands: the same pieces you already know, just encapsulated and reusable. A parent embeds the child Submodel by reserving a field for its Model, declaring a wrapper Message that carries the child’s Message, and delegating to it in update.',
      ),
      para('You’ll reach for Submodels in three places:'),
      bullets(
        h.span(
          [],
          [
            'Every interactive Foldkit UI primitive (',
            inlineCode('Ui.Dialog'),
            ', ',
            inlineCode('Ui.Menu'),
            ', ',
            inlineCode('Ui.Listbox'),
            ', etc.) is shipped as a Submodel. That’s how they hand you their own keyboard handling and accessibility wiring without you having to know how they work inside.',
          ],
        ),
        h.span(
          [],
          [
            'Feature pages (Settings, Dashboard, Login) and reusable interactive components (DatePicker, Calendar) you build yourself.',
          ],
        ),
        h.span(
          [],
          [
            'Anywhere you need multiple stateful instances of the same module: several accordions on a page, each entry in a form that has its own internal state, repeated forms in a wizard. The Submodel is the unit you instantiate.',
          ],
        ),
      ),
      para(
        'In the restaurant analogy, think of a large restaurant with multiple stations: a sushi bar, a grill, a pastry counter. Each station has its own chef, its own order flow, its own plating. But the head waiter still coordinates: taking the order, routing it to the right station, and combining everything onto the table.',
      ),
      infoCallout(
        'Compare to React',
        'In React, components nest and communicate through props and callbacks. In Foldkit, composition is explicit: the parent embeds the child’s Model, wraps its Messages, and delegates in update. Every interaction between parent and child is visible in the update function.',
      ),
      tableOfContentsEntryToHeader(childSubmodelHeader),
      para(
        'A child Submodel has its own Model, Message, update, and Commands. For example, here’s a Settings Submodel for an app’s Settings page:',
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
        'Copy Submodel to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Notice that this Submodel has no awareness of its parent. It manages its own state and handles its own Messages in update. This isolation is the point: you can reason about each Submodel independently.',
      ),
      tableOfContentsEntryToHeader(embeddingHeader),
      para(
        'The parent has three jobs: embed the child’s Model, wrap its Messages, and delegate to its update.',
      ),
      tableOfContentsEntryToHeader(embeddingModelHeader),
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
      tableOfContentsEntryToHeader(neverBypassHeader),
      para(
        'Having the child’s Model as a field doesn’t give the parent license to reach into it. Every change to the child’s state must go through the child’s update, never through ',
        inlineCode('evo'),
        ' on the child’s slice. Here’s the antipattern:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelDirectEvoAntipatternHighlighted),
          ],
          [],
        ),
        Snippets.submodelDirectEvoAntipatternRaw,
        'Copy antipattern to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para('Instead, dispatch the child’s own Message:'),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelDelegateCorrectHighlighted),
          ],
          [],
        ),
        Snippets.submodelDelegateCorrectRaw,
        'Copy delegation to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para('Three things break when the parent bypasses the child’s update.'),
      para(
        'First, DevTools never sees the change as a Submodel Message, so it disappears from the Submodel filter and the timeline reads wrong.',
      ),
      para(
        'Second, any invariant the child’s update was enforcing (validation, derived fields, state-machine transitions) is silently violated. The parent has no way to type-check against the child’s contract.',
      ),
      para(
        'Third, the bypass becomes a refactor landmine: the moment the child adds a new invariant or restructures its internal state, the parent’s direct write breaks in ways the type system can’t catch.',
      ),
      tableOfContentsEntryToHeader(wrappingMessagesHeader),
      para(
        'To the Foldkit runtime, every Message is top-level. Each Message is processed by your program’s main update function, and routing to a child Submodel is explicit: the parent wraps the child’s Message at the boundary in a Message its own update can process. Use the ',
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
      para(
        'A wrapper Message carries routing, not payload. Its job is delivery: it holds the inner child Message and, when several instances of the same Submodel are embedded, the per-instance identifier (e.g. ',
        inlineCode('GotEntryMessage({ entryId, message })'),
        '). Anything else belongs inside the child Message, where the child’s update can process it. Mixing domain payload into the wrapper smuggles parent-side logic past the child’s boundary, which is exactly the encapsulation breach this whole pattern is designed to prevent.',
      ),
      tableOfContentsEntryToHeader(delegatingInUpdateHeader),
      para(
        'When the parent receives a ',
        inlineCode('GotSettingsMessage'),
        ', it unwraps the child Message, calls the child’s update, updates the child’s slice of the Model, and maps the child’s returned Commands back into the parent’s Message type:',
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
        'About the Command mapping: the Submodel’s Commands produce child Messages when they complete, but the Foldkit runtime expects top-level Messages. The child can’t wrap its own Commands because it doesn’t know its parent’s Message type. So the parent uses ',
        inlineCode('Command.mapMessages'),
        ' to lift every Command in the list, wrapping each result in ',
        inlineCode('GotSettingsMessage'),
        '. The helper preserves each Command’s name and args, so DevTools traces still show each Command’s original name.',
      ),
      h.details(
        [
          h.Class(
            'mb-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3',
          ),
        ],
        [
          h.summary(
            [
              h.Class(
                'cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
              ),
            ],
            ['Under the hood: Command.mapMessages is one line'],
          ),
          h.pre(
            [
              h.Class(
                'mt-3 overflow-x-auto rounded bg-gray-100 dark:bg-gray-800 p-3 text-xs leading-6',
              ),
            ],
            [
              h.code(
                [],
                [
                  'export const mapMessages = (commands, f) =>\n  Array.map(commands, mapEffect(Effect.map(f)))',
                ],
              ),
            ],
          ),
          h.p(
            [
              h.Class(
                'mt-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed',
              ),
            ],
            [
              'No magic. The helper composes the three things you’d otherwise write by hand: ',
              inlineCode('Array.map'),
              ' over the list, ',
              inlineCode('Command.mapEffect'),
              ' to lift each Command, and ',
              inlineCode('Effect.map'),
              ' to transform the result Message inside the Effect. The singular complement, ',
              inlineCode('Command.mapMessage'),
              ', is the same shape without the outer ',
              inlineCode('Array.map'),
              '.',
            ],
          ),
        ],
      ),
      tableOfContentsEntryToHeader(wiringTheViewHeader),
      para(
        'The Submodel exports a view defined with ',
        inlineCode('Submodel.defineView<Model, Message>'),
        ', which produces a function from the child’s Model + Message to ',
        inlineCode('Html'),
        ':',
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
        'The parent embeds the Submodel via ',
        inlineCode('h.submodel'),
        ', passing four things: an ',
        inlineCode('id'),
        ' that uniquely identifies this instance under the current boundary, the child’s exported ',
        inlineCode('view'),
        ', the embedded ',
        inlineCode('model'),
        ' slice, and a ',
        inlineCode('toParentMessage'),
        ' callback that lifts each child Message into the parent’s wrapper:',
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
        'The same ',
        inlineCode('Settings.view'),
        ' embeds under any parent that supplies a compatible ',
        inlineCode('toParentMessage'),
        '. The child has no static dependency on a particular parent.',
      ),
      infoCallout(
        'Multiple instances',
        'If you need several instances of the same child (e.g. three accordions), embed each as a separate field with its own ',
        inlineCode('id'),
        '. For a dynamic number, use an array and include an identifier in the wrapper Message to route updates to the correct instance. See the ',
        link(
          exampleDetailRouter({ exampleSlug: 'job-application' }),
          'job-application example',
        ),
        ' for a working list of per-instance Submodels (education and work-history entries, each embedded with its own ',
        inlineCode('entryId'),
        ').',
      ),
      para(
        'Foldkit UI primitives like Listbox, Combobox, and RadioGroup expose a ',
        inlineCode('create<Item>()'),
        ' factory that fixes the Item type at one site and pairs view and update behind it. See ',
        link(uiTypedPrimitivesRouter(), 'Foldkit UI Primitives'),
        ' for how the factory works and why each primitive shapes its type parameter the way it does.',
      ),
      para(
        'With Model, Messages, update, view, Commands, Subscriptions, init, and Submodels in place, you have the full vocabulary for describing an app. The next page covers the ',
        link(coreRuntimeRouter(), 'Runtime'),
        ': the engine that executes Commands, runs Subscriptions, manages Mount and ManagedResource lifecycles, and routes Messages back into update.',
      ),
    ],
  )
}
