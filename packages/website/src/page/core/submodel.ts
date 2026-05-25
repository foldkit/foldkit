import { Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { Icon } from '../../icon'
import { Message, type TableOfContentsEntry } from '../../main'
import { GotSubmodelMapMessagesDisclosureMessage } from '../../message'
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
  bestPracticesImmutabilityRouter,
  coreDevToolsRouter,
  coreRuntimeRouter,
  exampleDetailRouter,
  testingRouter,
  uiCalendarRouter,
  uiOverviewRouter,
} from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'
import { type PropEntry, propTable } from '../../view/docTable'

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

const perRenderInputsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'per-render-view-inputs',
  text: 'Per-render View Inputs',
}

const boundaryIdHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'boundary-id-and-model-identity',
  text: 'Boundary Id and Model Identity',
}

const multipleInstancesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'multiple-instances',
  text: 'Multiple Instances',
}

const memoizationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'memoization',
  text: 'Memoization Across Submodel Boundaries',
}

const readingParentStateHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'reading-parent-state',
  text: 'Reading Parent State',
}

const parentStateInViewHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'parent-state-in-view',
  text: 'Passing Parent State to a Child Submodel’s view',
}

const parentStateInUpdateHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'parent-state-in-update',
  text: 'Providing Parent State to a Child Submodel’s update',
}

const surfacingFactsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'surfacing-facts',
  text: 'Surfacing Facts to the Parent',
}

const definingOutMessagesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'defining-out-messages',
  text: 'Defining OutMessages',
}

const emittingFromTheChildHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'emitting-from-the-child',
  text: 'Emitting from the Child',
}

const handlingInTheParentHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'handling-in-the-parent',
  text: 'Handling in the Parent',
}

const reflectingExternalStateHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'reflecting-external-state',
  text: 'Reflecting External State',
}

const childAttributesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'child-attributes',
  text: 'childAttributes',
}

const childAttributesProblemHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'child-attributes-the-problem',
  text: 'The Problem',
}

const childAttributesHowItWorksHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'child-attributes-how-it-works',
  text: 'How It Works',
}

const childAttributesWhenToReachHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'child-attributes-when-to-reach',
  text: 'When to Reach For It',
}

const testingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'testing-submodels',
  text: 'Testing Submodels',
}

const devToolsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'debugging-in-devtools',
  text: 'Debugging Submodels in DevTools',
}

const commonPitfallsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'common-pitfalls',
  text: 'Common Pitfalls',
}

const apiReferenceHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'api-reference',
  text: 'API Reference',
}

const apiHSubmodelHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'api-h-submodel',
  text: 'h.submodel',
}

const apiSubmodelConfigHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'api-submodel-config',
  text: 'SubmodelConfig',
}

const apiDefineViewHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'api-define-view',
  text: 'Submodel.defineView',
}

const apiSubmodelViewHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'api-submodel-view',
  text: 'Submodel.View',
}

const apiChildAttributesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'api-child-attributes',
  text: 'childAttributes',
}

const apiChildAttributeHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'api-child-attribute',
  text: 'ChildAttribute',
}

const submodelConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'slotId',
    type: 'string',
    description:
      'DOM-slot identity for this embed site under the current boundary. Must be distinct from every other h.submodel slotId under the same parent boundary. For lists, use a per-item id (row.id); for fixed slots, name by position.',
  },
  {
    name: 'model',
    type: 'View extends SubmodelView<infer Model, ...> ? Model : never',
    description:
      'The child Submodel’s slice of the parent Model. Type is inferred from the branded view.',
  },
  {
    name: 'view',
    type: 'SubmodelView<Model, Message, ViewInputs?>',
    description:
      'The child’s exported view, branded via Submodel.defineView so the embed site can infer the child’s Message type.',
  },
  {
    name: 'viewInputs',
    type: 'ViewInputs | undefined',
    description:
      'Optional per-render data threaded into the view’s second argument. Top-level functions are auto-wrapped to execute in the parent’s boundary; nested functions throw at view-build time.',
  },
  {
    name: 'toParentMessage',
    type: '(message: ChildMessage) => ParentMessage',
    description:
      'Lifts each child Message into the parent’s wrapper Message type, typically a closure over the Got*Message constructor.',
  },
]

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  childSubmodelHeader,
  embeddingHeader,
  embeddingModelHeader,
  neverBypassHeader,
  wrappingMessagesHeader,
  delegatingInUpdateHeader,
  wiringTheViewHeader,
  perRenderInputsHeader,
  boundaryIdHeader,
  multipleInstancesHeader,
  memoizationHeader,
  readingParentStateHeader,
  parentStateInViewHeader,
  parentStateInUpdateHeader,
  surfacingFactsHeader,
  definingOutMessagesHeader,
  emittingFromTheChildHeader,
  handlingInTheParentHeader,
  reflectingExternalStateHeader,
  childAttributesHeader,
  childAttributesProblemHeader,
  childAttributesHowItWorksHeader,
  childAttributesWhenToReachHeader,
  testingHeader,
  devToolsHeader,
  commonPitfallsHeader,
  apiReferenceHeader,
  apiHSubmodelHeader,
  apiSubmodelConfigHeader,
  apiDefineViewHeader,
  apiSubmodelViewHeader,
  apiChildAttributesHeader,
  apiChildAttributeHeader,
]

export const view = (
  copiedSnippets: CopiedSnippets,
  mapMessagesDisclosure: Ui.Disclosure.Model,
): Html => {
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
        'A Submodel is a self-contained Model, Message, update, and Commands: the same pieces you already know, just embedded inside a larger program. A parent embeds the child by reserving a field for its Model, declaring a wrapper Message that carries the child’s Message, and delegating to it in update.',
      ),
      para('You’ll reach for a Submodel for one of two reasons:'),
      bullets(
        h.span(
          [],
          [
            h.strong([], ['Encapsulation.']),
            ' The Submodel is a self-contained unit with its own state, keyboard handling, and accessibility wiring; the parent doesn’t need to see inside. Every stateful ',
            link(uiOverviewRouter(), 'Foldkit UI primitive'),
            ' (',
            inlineCode('Ui.Dialog'),
            ', ',
            inlineCode('Ui.Menu'),
            ', ',
            inlineCode('Ui.Listbox'),
            ', etc.) is shipped this way, which is how they hand you their behavior without you having to know how they work inside.',
          ],
        ),
        h.span(
          [],
          [
            h.strong([], ['Decomposition.']),
            ' Your own app has grown large enough that splitting feature areas (for example Settings, Dashboard, or Profile) into Submodels keeps things organized. These children aren’t strictly black boxes; they may need to ',
            link('#reading-parent-state', 'read parent state'),
            ' or ',
            link('#surfacing-facts', 'surface domain facts back to the parent'),
            '.',
          ],
        ),
      ),
      para(
        'Either way, you’ll often want ',
        link('#multiple-instances', 'multiple instances'),
        ' of the same Submodel, for example several accordions on a page, each entry in a form with its own internal state, or repeated cards in a wizard. The Submodel is the unit you instantiate.',
      ),
      infoCallout(
        'The word "boundary"',
        'Each ',
        inlineCode('h.submodel'),
        ' call creates a boundary: a runtime scope holding that embed site’s ',
        inlineCode('slotId'),
        ' and ',
        inlineCode('toParentMessage'),
        '. When the child dispatches a Message, the runtime crosses the boundary, applying ',
        inlineCode('toParentMessage'),
        ' to lift the Message into the parent’s Message type. Nested Submodels chain boundaries; dispatch walks up through all of them to reach the top-level Message. The term appears throughout this page.',
      ),
      para(
        'In the restaurant analogy, think of a large restaurant with multiple stations, for example a sushi bar, a grill, or a pastry counter. Each station has its own chef, its own order flow, its own plating. But the head waiter still coordinates: taking the order, routing it to the right station, and combining everything onto the table.',
      ),
      infoCallout(
        'Compare to React',
        'In React, components nest and communicate through props and callbacks. In Foldkit, composition is explicit: the parent embeds the child’s Model, wraps its Messages, and delegates in update. Every message that crosses the boundary is visible in the update function.',
      ),
      infoCallout(
        'When NOT to use a Submodel',
        'If a piece of UI is just a function of parent state with no internal Messages or update logic, write it as an ordinary render function, not a Submodel. The Submodel machinery (wrapper Messages, ',
        inlineCode('defineView'),
        ' brand, ',
        inlineCode('h.submodel'),
        ' embedding) is overhead unless the child genuinely owns its own state machine. Foldkit UI primitives are Submodels because they have keyboard handling, focus state, dismissal logic, animation lifecycles. A reusable card that takes a title and content as props isn’t a Submodel; it’s a render function.',
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
        link(`${bestPracticesImmutabilityRouter()}#immutable-updates`, 'evo'),
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
      para(
        'Instead, go through the child’s update. When the parent has its own Message that needs to change child state (for example, a click handler in the parent), the canonical form is to call a helper the child exports. The parent writes ',
        inlineCode('Settings.setTheme(model.settings, "Light")'),
        ' and never imports ',
        inlineCode('ChangedTheme'),
        '. The child’s Message surface stays internal; the helper is the public verb the parent sees. The snippet’s ',
        inlineCode('Command.mapMessages'),
        ' and ',
        inlineCode('GotSettingsMessage'),
        ' are covered just below, in ',
        link('#wrapping-messages', 'Wrapping Messages'),
        ' and ',
        link('#delegating-in-update', 'Delegating in update'),
        ':',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelDelegateViaHelperHighlighted),
          ],
          [],
        ),
        Snippets.submodelDelegateViaHelperRaw,
        'Copy helper delegation to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'This is the same delegation pattern the stateful Foldkit UI primitives use for parent-initiated operations. ',
        inlineCode('Listbox.selectItem'),
        ', ',
        inlineCode('Popover.close'),
        ', and ',
        inlineCode('Tabs.selectTab'),
        ' are helpers a parent calls without ever constructing the child’s Message, so the child can restructure its Messages later without touching any consumer. Each is a thin wrapper over the child’s ',
        inlineCode('update'),
        ' and returns the same shape that update does. Settings has no OutMessage, so ',
        inlineCode('setTheme'),
        ' returns ',
        inlineCode('[Model, Commands]'),
        '. The UI primitives ',
        link('#surfacing-facts', 'surface facts'),
        ', so theirs return the ',
        inlineCode('[Model, Commands, Option<OutMessage>]'),
        ' 3-tuple and emit. When the parent instead needs to conform the child to an external value without emitting, the silent counterpart is the ',
        inlineCode('reflect*'),
        ' family covered in ',
        link('#reflecting-external-state', 'Reflecting External State'),
        '.',
      ),
      para(
        'This only applies to parent-initiated changes. For Messages that came from the child via ',
        inlineCode('GotChildMessage'),
        ' (a toggle dispatched from the user clicking the child’s button, a Command result returning back into the child), you already have the Message; just call ',
        inlineCode('Child.update(model.child, message)'),
        ' directly. The helper pattern is for the inverse direction: parent code that needs to drive the child.',
      ),
      para('Three things break when the parent bypasses the child’s update.'),
      para(
        'First, DevTools never sees the change as a Submodel Message, so it disappears from the Submodel filter and the timeline reads wrong.',
      ),
      para(
        'Second, any invariant the child’s update was enforcing (for example validation, derived fields, or state-machine transitions) is silently violated. The parent has no way to type-check against the child’s contract.',
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
      h.submodel({
        slotId: 'submodel-map-messages-disclosure',
        model: mapMessagesDisclosure,
        view: Ui.Disclosure.view,
        viewInputs: {
          toView: attributes =>
            h.div(
              [h.Class('mb-8')],
              [
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      'w-full flex items-center justify-between px-4 py-3 text-left text-base font-normal cursor-pointer transition border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded-lg data-[open]:rounded-b-none select-none',
                    ),
                  ],
                  [
                    h.span(
                      [],
                      ['Under the hood: the Command.mapMessages chain'],
                    ),
                    h.span(
                      [
                        h.Class(
                          `text-gray-600 dark:text-gray-300 transition-transform ${mapMessagesDisclosure.isOpen ? 'rotate-180' : ''}`,
                        ),
                      ],
                      [Icon.chevronDown('w-4 h-4')],
                    ),
                  ],
                ),
                mapMessagesDisclosure.isOpen
                  ? h.div(
                      [
                        ...attributes.panel,
                        h.Class(
                          'px-4 py-3 border-x border-b border-gray-300 dark:border-gray-700 rounded-b-lg text-gray-800 dark:text-gray-200',
                        ),
                      ],
                      [
                        h.div(
                          [h.Class('-mt-8')],
                          [
                            highlightedCodeBlock(
                              h.div(
                                [
                                  h.Class('text-sm'),
                                  h.InnerHTML(
                                    Snippets.commandMapMessagesUnderHoodHighlighted,
                                  ),
                                ],
                                [],
                              ),
                              Snippets.commandMapMessagesUnderHoodRaw,
                              'Copy snippet to clipboard',
                              copiedSnippets,
                              'mb-4',
                            ),
                          ],
                        ),
                        h.p(
                          [h.Class('leading-relaxed')],
                          [
                            'Three small layers compose into ',
                            inlineCode('mapMessages'),
                            '. ',
                            inlineCode('Array.map'),
                            ' iterates; ',
                            inlineCode('mapMessage'),
                            ' rebuilds each Command with its Effect re-typed; ',
                            inlineCode('mapEffect'),
                            ' is the actual rebuild (a spread that swaps in the transformed Effect). The Command’s ',
                            inlineCode('name'),
                            ' and ',
                            inlineCode('args'),
                            ' ride through untouched, which is why DevTools traces still attribute each Command to its original Submodel.',
                          ],
                        ),
                      ],
                    )
                  : h.empty,
              ],
            ),
        },
        toParentMessage: message =>
          GotSubmodelMapMessagesDisclosureMessage({ message }),
      }),
      tableOfContentsEntryToHeader(wiringTheViewHeader),
      para(
        'The Submodel exports a view defined with ',
        inlineCode('Submodel.defineView<Model, Message>'),
        '. The function takes the child’s ',
        inlineCode('model'),
        ' and returns ',
        inlineCode('Html'),
        ', the same shape a top-level program’s view has.',
      ),
      para(
        'The ',
        inlineCode('<Model, Message>'),
        ' type arguments aren’t just annotations: they brand the view, attaching the child’s Message type to the value at the type level. The ',
        inlineCode('h.submodel'),
        ' call site reads that brand to type-check the embed site without you having to spell it out. A third optional type parameter, ',
        inlineCode('ViewInputs'),
        ', threads per-render data from the parent; the next section covers it.',
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
        ', passing four things:',
      ),
      bullets(
        h.span(
          [],
          [
            inlineCode('slotId'),
            ': a string that uniquely identifies this embed site under the current boundary. For a single instance, a stable name like ',
            inlineCode("'settings'"),
            ' works; for repeated instances, a per-instance value like ',
            inlineCode('row.id'),
            '.',
          ],
        ),
        h.span(
          [],
          [inlineCode('model'), ': the child’s slice of the parent Model.'],
        ),
        h.span(
          [],
          [
            inlineCode('view'),
            ': the child’s exported view, branded by ',
            inlineCode('Submodel.defineView'),
            ' so the embed site can infer the child’s Message type.',
          ],
        ),
        h.span(
          [],
          [
            inlineCode('toParentMessage'),
            ': a callback that lifts each child Message into the parent’s wrapper Message.',
          ],
        ),
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
      tableOfContentsEntryToHeader(perRenderInputsHeader),
      para(
        'Some Submodels need data from the parent on every render that doesn’t belong in the child’s ',
        inlineCode('model'),
        '. A Listbox needs the array of items and a callback that renders each one. A Menu needs the items and the trigger button’s content. A collapsible panel needs the summary and the content the parent wants to show. None of this is the child’s state. It’s configuration the parent supplies fresh on every render.',
      ),
      para(
        'For these Submodels, ',
        inlineCode('defineView'),
        ' takes a third type parameter ',
        inlineCode('ViewInputs'),
        '. The view receives ',
        inlineCode('viewInputs'),
        ' as its second argument:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelChildViewInputsHighlighted),
          ],
          [],
        ),
        Snippets.submodelChildViewInputsRaw,
        'Copy child view with view inputs to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'At the embed site, the parent passes the ',
        inlineCode('viewInputs'),
        ' alongside ',
        inlineCode('model'),
        ' and the other fields:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelParentViewInputsHighlighted),
          ],
          [],
        ),
        Snippets.submodelParentViewInputsRaw,
        'Copy parent view with view inputs to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The split between ',
        inlineCode('model'),
        ' and ',
        inlineCode('viewInputs'),
        ' is load-bearing. ',
        inlineCode('model'),
        ' is the child’s internal state, owned by the child and mutated only through the child’s ',
        inlineCode('update'),
        '. ',
        inlineCode('viewInputs'),
        ' is per-render configuration, owned by the parent and rebuilt fresh each render. Putting per-render config in the model would force the parent to write update handlers that store its own configuration; putting state in the viewInputs would lose it across renders.',
      ),
      para(
        'A common pattern is to put a slot callback (often called ',
        inlineCode('toView'),
        ') in ',
        inlineCode('viewInputs'),
        ' so the child hands the parent attribute bundles and lets the parent shape the markup. Functions at the top level of ',
        inlineCode('viewInputs'),
        ' get auto-wrapped to execute in the parent’s boundary, so any handlers the parent builds inside them (e.g. ',
        inlineCode('h.OnClick(ParentMessage())'),
        ') dispatch through the parent’s wrapping chain, not the child’s. See the ',
        link('#child-attributes', 'childAttributes'),
        ' section below for the complementary mechanism: how the child publishes attribute bundles that route back through its own boundary.',
      ),
      warningCallout(
        'Keep slot callbacks at the top level',
        'Functions nested inside an object or array inside ',
        inlineCode('viewInputs'),
        ' (e.g. ',
        inlineCode('viewInputs: { config: { onSubmit } }'),
        ') throw at view-build time with a path-based error like ',
        inlineCode('viewInputs.config.onSubmit'),
        '. The auto-wrap only descends one level, so a nested function would otherwise dispatch through the child’s boundary instead of the parent’s. The check is runtime-only, so a misuse compiles cleanly and surfaces the first time the boundary renders. Lift slot callbacks to the top level of ',
        inlineCode('viewInputs'),
        '.',
      ),
      tableOfContentsEntryToHeader(boundaryIdHeader),
      para(
        'The ',
        inlineCode('slotId'),
        ' you pass to ',
        inlineCode('h.submodel'),
        ' is ',
        h.strong([], ['DOM-slot identity, not model identity.']),
        ' Each ',
        inlineCode('h.submodel'),
        ' call under the same parent boundary must use a distinct ',
        inlineCode('slotId'),
        ', even when two call sites embed the same model.',
      ),
      para(
        'If you render the same Submodel in two slots (desktop + mobile, master + detail, mirror layouts), give each slot its own id like ',
        inlineCode("'desktop-sidebar'"),
        ' and ',
        inlineCode("'mobile-sidebar'"),
        ', not just ',
        inlineCode('model.id'),
        '. For lists, the per-item id (',
        inlineCode('row.id'),
        ') is the right choice because each row IS a different slot.',
      ),
      para(
        'Defaulting to ',
        inlineCode('model.id'),
        ' works for the common case of one model rendered in one slot, but silently collides as soon as the model appears twice. The runtime catches the collision with a duplicate-slotId throw at view-build time. The throw is the convention’s safety net; the prevention is naming slot ids by slot from the start.',
      ),
      tableOfContentsEntryToHeader(multipleInstancesHeader),
      para(
        'A parent often embeds several instances of the same Submodel, for example a list of form entries, an array of accordions, or repeated cards on a dashboard. There are two shapes.',
      ),
      para(
        'For a fixed number of instances, embed each as a separate field on the parent Model with its own ',
        inlineCode('slotId'),
        '. ',
        inlineCode("h.submodel({ slotId: 'profile', ... })"),
        ' and ',
        inlineCode("h.submodel({ slotId: 'preferences', ... })"),
        ' are two unrelated boundaries, each with its own wrap.',
      ),
      para(
        'For a dynamic number, hold the instances in an array on the parent Model, iterate it in the view, and route updates back through a wrapper Message that carries a per-instance identifier:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelMultipleInstancesHighlighted),
          ],
          [],
        ),
        Snippets.submodelMultipleInstancesRaw,
        'Copy multiple instances snippet to clipboard',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'The ',
        inlineCode('slotId'),
        ' on each ',
        inlineCode('h.submodel'),
        ' is the per-instance identifier the runtime uses for boundary identity. The same identifier travels with the wrapper Message as ',
        inlineCode('entryId'),
        ' so the parent’s update can find the matching slice and delegate to ',
        inlineCode('Applicant.update'),
        '. See the ',
        link(
          exampleDetailRouter({ exampleSlug: 'job-application' }),
          'job-application example',
        ),
        ' for a working version: per-entry education and work-history Submodels, each embedded with its own ',
        inlineCode('entryId'),
        '.',
      ),
      tableOfContentsEntryToHeader(memoizationHeader),
      para(
        'An ',
        inlineCode('h.submodel'),
        ' call re-runs the child’s view on every parent render. For a short list of Submodels this is cheap; for a long list (hundreds of rows) or expensive child views, memoize the embed site with ',
        inlineCode('createKeyedLazy'),
        ' from ',
        inlineCode('foldkit/html'),
        '. The keyed lazy compares its deps tuple by ',
        inlineCode('==='),
        ' and reuses the cached VNode when nothing changed.',
      ),
      para(
        'Why this works across the Submodel boundary: ',
        inlineCode('h.submodel'),
        ' is designed so the per-render-fresh ',
        inlineCode('toParentMessage'),
        ' closure stays out of the cached VNode. The boundary’s wrap is stored in a runtime registry keyed by id, not captured by the VNode itself, so a cache hit preserves the wrap from the previous render. Snabbdom’s destroy hook deregisters the wrap when the DOM node is actually removed, so memoization across boundaries doesn’t leak.',
      ),
      para(
        'Default: don’t memoize. Reach for ',
        inlineCode('createKeyedLazy'),
        ' when a profile shows the parent re-renders are doing measurable work.',
      ),
      tableOfContentsEntryToHeader(readingParentStateHeader),
      para(
        'Decomposition Submodels (Settings, Dashboard, Profile) often share state with their siblings: the current user, the active locale, the session token. Forcing every such child to be fully encapsulated pushes you to duplicate that state into the child Model and keep both copies in sync, which is worse on every axis. Foldkit gives you two precise seams for parent state to reach the child instead:',
      ),
      bullets(
        h.span(
          [],
          [
            'When a child view needs to render state that lives in the parent Model, thread it through ',
            inlineCode('viewInputs'),
            ' on ',
            inlineCode('h.submodel'),
            '.',
          ],
        ),
        h.span(
          [],
          [
            'When a child update needs context from the parent, add a third ',
            inlineCode('context'),
            ' argument to the child’s update.',
          ],
        ),
      ),
      para(
        'Both are typed contracts the child declares and the parent honors.',
      ),
      tableOfContentsEntryToHeader(parentStateInViewHeader),
      para(
        'Slice the parent state out of the parent Model and pass it through ',
        inlineCode('viewInputs'),
        ' on ',
        inlineCode('h.submodel'),
        '. Because ',
        inlineCode('viewInputs'),
        ' is rebuilt every render, the child always sees the current value without storing a copy:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelParentStateInViewHighlighted),
          ],
          [],
        ),
        Snippets.submodelParentStateInViewRaw,
        'Copy snippet to clipboard',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'The mechanism is the same one ',
        link('#per-render-view-inputs', 'Per-render View Inputs'),
        ' describes; parent state is just one of the things ',
        inlineCode('viewInputs'),
        ' can carry.',
      ),
      tableOfContentsEntryToHeader(parentStateInUpdateHeader),
      para(
        'The child’s update signature grows a third argument: ',
        inlineCode('(model, message, context) => result'),
        '. The child declares a ',
        inlineCode('Context'),
        ' type alongside its other types; the parent assembles the context inline when delegating in its own update handler:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelParentStateInUpdateHighlighted),
          ],
          [],
        ),
        Snippets.submodelParentStateInUpdateRaw,
        'Copy snippet to clipboard',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'The update stays pure. Same ',
        inlineCode('(model, message, context)'),
        ' always produces the same result; no hidden state, no time-dependent behavior. The child reads ',
        inlineCode('context.currentUser'),
        ' at the moment the message is being processed, and because the parent assembles the context fresh on every dispatch, the next call automatically sees any parent changes. Single source of truth, no sync obligation.',
      ),
      para(
        'A context argument gives the child the current value when update runs. It does not notify the child when that value changes. If the child needs to respond to ',
        inlineCode('currentUser'),
        ' changing (for example to clear caches or reset a form), the canonical move is for the parent to dispatch a child Message through ',
        inlineCode('GotChildMessage'),
        ' carrying the new value. Context-arg is for reading current parent state inside an update tick, not for observing parent state over time.',
      ),
      tableOfContentsEntryToHeader(surfacingFactsHeader),
      para(
        'So far the child only sends its own Messages back through the parent’s wrapper. That covers internal state changes, but it doesn’t tell the parent that something the parent cares about happened: a date was committed, a tab was selected, a menu item was picked. For that, the child’s ',
        inlineCode('update'),
        ' returns a third element: ',
        inlineCode('Option<OutMessage>'),
        ' (Effect’s ',
        inlineCode('Option'),
        ' type for representing a value that may or may not be present). The parent pattern-matches the third element inside ',
        inlineCode('GotChildMessage'),
        ' and lifts the fact into a domain Message of its own.',
      ),
      para(
        'Your login Submodel has authenticated the user. Now what? The child can’t transition the root Model to a logged-in state because it only knows about its own Model. And it shouldn’t know about the root Model. That would break the encapsulation that makes Submodels useful in the first place.',
      ),
      para(
        'The OutMessage shape solves this. The child emits a semantic event: "login succeeded, here’s the session." The parent decides what to do with it. The child describes what happened; the parent decides the consequences.',
      ),
      infoCallout(
        'Compare to React',
        'In React, you’d pass an ',
        inlineCode('onLoginSuccess'),
        ' callback as a prop. This works but couples the child to the parent’s interface. In Foldkit, OutMessage keeps the boundary clean: the child emits facts, the parent interprets them.',
      ),
      tableOfContentsEntryToHeader(definingOutMessagesHeader),
      para(
        'OutMessages live alongside the child’s Message and follow the same naming conventions: past-tense facts describing what happened. ',
        inlineCode('SucceededLogin'),
        ', not ',
        inlineCode('TransitionToLoggedIn'),
        '. ',
        inlineCode('RequestedLogout'),
        ', not ',
        inlineCode('DoLogout'),
        '. The child doesn’t know or care what the parent does with the information.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.outMessageDefinitionHighlighted),
          ],
          [],
        ),
        Snippets.outMessageDefinitionRaw,
        'Copy OutMessage definition to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(emittingFromTheChildHeader),
      para(
        'The child’s update function returns a 3-tuple instead of the usual 2-tuple: Model, Commands, and an ',
        inlineCode('Option<OutMessage>'),
        '. Most Messages return ',
        inlineCode('Option.none()'),
        '. Only the significant "I need to tell the parent something" moments return ',
        inlineCode('Option.some(...)'),
        ':',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.outMessageChildUpdateHighlighted),
          ],
          [],
        ),
        Snippets.outMessageChildUpdateRaw,
        'Copy child update to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The ',
        inlineCode('Option'),
        ' makes the boundary explicit. ',
        inlineCode('SubmittedLoginForm'),
        ' fires a Command and returns ',
        inlineCode('Option.none()'),
        ': nothing for the parent to act on yet. But when login succeeds, the ',
        inlineCode('SucceededAuthenticate'),
        ' arm emits ',
        inlineCode('Option.some(SucceededLogin({ sessionId }))'),
        ', the signal the parent needs.',
      ),
      tableOfContentsEntryToHeader(handlingInTheParentHeader),
      para(
        'The parent uses ',
        inlineCode('Option.match'),
        ' on the OutMessage. ',
        inlineCode('onNone'),
        ' means the child handled it internally: just update the child’s slice of the Model. ',
        inlineCode('onSome'),
        ' means the child is surfacing something the parent needs to act on:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.outMessageParentHandleHighlighted),
          ],
          [],
        ),
        Snippets.outMessageParentHandleRaw,
        'Copy parent handling to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'This is where the power of the boundary shows. When ',
        inlineCode('SucceededLogin'),
        ' arrives, the parent can do things the child has no knowledge of: transition to a completely different Model state, save the session, redirect the URL. The child stays focused on its domain; the parent handles cross-cutting concerns.',
      ),
      para(
        'See the ',
        link(exampleDetailRouter({ exampleSlug: 'auth' }), 'Auth example'),
        ' for a complete implementation: a login module emits ',
        inlineCode('SucceededLogin'),
        ' when authentication completes, and the parent transitions to the logged-in state, saves the session, and updates the URL, all triggered by a single OutMessage.',
      ),
      tableOfContentsEntryToHeader(reflectingExternalStateHeader),
      para(
        'OutMessage is outbound: the user interacts with the child, the child changes, and it surfaces a fact so the parent can act. The child is the source. ',
        inlineCode('reflect*'),
        ' is the inbound direction. Something outside the child changes (a URL or route, a server push, restored storage, parent state, or a sibling Submodel), and the parent conforms the child to that external value. The external thing is the source.',
      ),
      para(
        'A ',
        inlineCode('reflect*'),
        ' helper returns ',
        inlineCode('Model'),
        ' directly, not the ',
        inlineCode('[Model, Commands, Option<OutMessage>]'),
        ' tuple the choice-based setters return. The narrower return type makes the contract visible at the call site: a ',
        inlineCode('reflect*'),
        ' write cannot emit. It is silent on purpose. The external value is already the source of truth, so emitting an OutMessage would echo it back to whatever just set it and risk a write loop.',
      ),
      para(
        'The helpers are ',
        inlineCode('Function.dual'),
        ', so they read point-free inside an ',
        link(`${bestPracticesImmutabilityRouter()}#immutable-updates`, 'evo'),
        ' callback. The parent reflects a URL filter onto a Listbox from the handler that processes the route change:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelReflectExternalStateHighlighted),
          ],
          [],
        ),
        Snippets.submodelReflectExternalStateRaw,
        'Copy reflect handler to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The child never calls its own ',
        inlineCode('reflect*'),
        '. It is the sanctioned way for the owner to write into the child, the complement to the ',
        link('#never-bypass-the-update', 'never-bypass'),
        ' rule: the parent conforms the child to an external value through a helper instead of reaching into the child’s slice with ',
        inlineCode('evo'),
        '. The child’s own user interactions still go through its ',
        inlineCode('update'),
        ' and emit its OutMessage along the choice path.',
      ),
      para(
        '"Outside" is relative to the child’s boundary, not the app’s. A sibling field changing is outside the child it feeds. A start-date field that updates an end-date picker’s minimum is the canonical case: the parent handles the start-date Message and reflects the new minimum onto the end-date Submodel, which had no part in the change. The ',
        link(`${uiCalendarRouter()}#programmatic-helpers`, 'Calendar'),
        ' config setters (',
        inlineCode('reflectMinDate'),
        ', ',
        inlineCode('reflectMaxDate'),
        ', ',
        inlineCode('reflectDisabledDates'),
        ', ',
        inlineCode('reflectDisabledDaysOfWeek'),
        ') are reflect helpers for exactly this.',
      ),
      para(
        'Across the stateful Foldkit UI primitives the choice-based setters keep domain verbs (',
        inlineCode('selectItem'),
        ', ',
        inlineCode('select'),
        ', ',
        inlineCode('selectTab'),
        ', ',
        inlineCode('selectDate'),
        ', ',
        inlineCode('setChecked'),
        ', ',
        inlineCode('toggle'),
        '), and they emit. The ',
        inlineCode('reflect*'),
        ' family is the uniform name for the silent inbound setter: ',
        inlineCode('reflectSelectedItem'),
        ' and ',
        inlineCode('reflectSelectedItems'),
        ' (Listbox, Combobox), ',
        inlineCode('reflectSelectedValue'),
        ' (RadioGroup), ',
        inlineCode('reflectSelectedTab'),
        ' (Tabs), ',
        inlineCode('reflectSelectedDate'),
        ' (Calendar, DatePicker), ',
        inlineCode('reflectChecked'),
        ' (Checkbox, Switch), ',
        inlineCode('reflectOpenState'),
        ' (Disclosure), ',
        inlineCode('reflectValue'),
        ' and ',
        inlineCode('reflectRange'),
        ' (Slider). It is a framework convention any Submodel can adopt; the Foldkit UI primitives are the canonical adopters.',
      ),
      tableOfContentsEntryToHeader(childAttributesHeader),
      para(
        'Some Submodels (Disclosure, Tooltip, Dialog, Popover, the selection family) hand the consumer ',
        h.strong([], ['attribute bundles']),
        ' rather than rendering their own DOM. The consumer spreads those attributes onto their own elements, deciding markup and styling, while the Submodel keeps owning the wiring.',
      ),
      para(
        'The wiring problem this creates: an attribute like ',
        inlineCode('h.OnClick(Toggled())'),
        ' is built inside the Submodel’s view (the Submodel’s own boundary) but ends up on an element inside the consumer’s view (the parent’s boundary). The dispatch needs to route through the Submodel’s ',
        inlineCode('toParentMessage'),
        ', not the parent’s. ',
        inlineCode('childAttributes'),
        ' solves this by branding each attribute with the Submodel’s dispatcher at publish time, so element constructors use the right one regardless of where the attribute is spread.',
      ),
      tableOfContentsEntryToHeader(childAttributesProblemHeader),
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
        ' slot, and the consumer composes them into their own elements. The consumer’s slot runs in the parent’s boundary, not the child’s. If the OnClick attribute were processed at the moment the consumer spread it onto a button, the click would dispatch through the parent’s boundary, bypassing the Submodel’s wrap entirely. The parent would receive a raw ',
        inlineCode('Toggled()'),
        ' it doesn’t know how to handle.',
      ),
      tableOfContentsEntryToHeader(childAttributesHowItWorksHeader),
      para(
        inlineCode('childAttributes'),
        ' snapshots the Submodel’s dispatcher at the moment of publishing. Each attribute in the returned array carries that captured dispatcher with it. When the consumer’s element constructor (',
        inlineCode('h.button'),
        ', ',
        inlineCode('h.input'),
        ', etc.) sees a branded ',
        inlineCode('ChildAttribute'),
        ', it uses the carried dispatcher instead of the current one. The handler ends up wired to the Submodel’s boundary even though the element lives in the parent’s view.',
      ),
      para('In code, the Submodel’s view publishes branded attribute groups:'),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelChildAttributesPublishHighlighted),
          ],
          [],
        ),
        Snippets.submodelChildAttributesPublishRaw,
        'Copy snippet to clipboard',
        copiedSnippets,
        'mb-4',
      ),
      para(
        'And the consumer’s ',
        inlineCode('toView'),
        ' callback, running in the parent’s boundary, threads those groups onto its own elements:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.submodelChildAttributesConsumeHighlighted),
          ],
          [],
        ),
        Snippets.submodelChildAttributesConsumeRaw,
        'Copy snippet to clipboard',
        copiedSnippets,
        'mb-4',
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
      tableOfContentsEntryToHeader(childAttributesWhenToReachHeader),
      para(
        'If you’re consuming a Foldkit UI primitive, you don’t call ',
        inlineCode('childAttributes'),
        ' yourself. The primitive’s view publishes branded attributes; you just spread them.',
      ),
      para(
        'If you’re authoring your own Submodel and publishing attribute bundles to a consumer’s slot callback, every published attribute group must be wrapped in ',
        inlineCode('childAttributes'),
        '. Forgetting this is a quiet bug: handlers can route through the parent’s boundary and the Submodel’s update will never see its own events. Read the published Submodels in ',
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
        inlineCode('childAttributes'),
        '. They’re not Submodels; their ',
        inlineCode('onClick'),
        ' or ',
        inlineCode('onInput'),
        ' values flow into element constructors in the consumer’s own boundary, which is correct. The boundary wiring only matters when there’s a Submodel boundary to wire through.',
      ),
      tableOfContentsEntryToHeader(testingHeader),
      para(
        'A Submodel tests the same way as a top-level program. A two-argument child ',
        inlineCode('update'),
        ' is a pure function from ',
        inlineCode('(model, message)'),
        ' to ',
        inlineCode('[Model, Commands]'),
        ' or ',
        inlineCode('[Model, Commands, Option<OutMessage>]'),
        ', so it slots straight into ',
        inlineCode('Story.story'),
        '. The child’s view is a pure function too; assert against the rendered VNode through ',
        inlineCode('Scene.scene'),
        '.',
      ),
      para(
        'For Submodels that emit OutMessages, assert the third tuple element via ',
        inlineCode('Story.expectOutMessage'),
        '. For Submodels with a context-arg ',
        inlineCode('update'),
        ', close the context over the two-argument function you pass to ',
        inlineCode('Story.story'),
        ': ',
        inlineCode(
          '(model, message) => Settings.update(model, message, { currentUser })',
        ),
        '. Each message step carries only a Message, so the context stays fixed for the story run.',
      ),
      para(
        'The ',
        link(
          exampleDetailRouter({ exampleSlug: 'counters' }),
          'counters example',
        ),
        ' has a Story test for the parent’s wrapper-Message routing (',
        inlineCode('GotCounterMessage'),
        ' delivers to the right row by ',
        inlineCode('id'),
        ', unknown ids are a no-op) and a Scene test for the rendered list. See the ',
        link(testingRouter(), 'Testing page'),
        ' for the full Story and Scene reference.',
      ),
      tableOfContentsEntryToHeader(devToolsHeader),
      para(
        'The ',
        inlineCode('Got*Message'),
        ' wrapper convention powers the Submodel filter in ',
        link(coreDevToolsRouter(), 'Foldkit DevTools'),
        '. Pick a Submodel from the filter dropdown and the Message timeline scopes to dispatches that crossed that Submodel’s boundary. Model diffs show only the child’s slice.',
      ),
      para(
        'If your wrapper Messages don’t follow the ',
        inlineCode('Got*'),
        ' naming, the filter can’t discover them; the Messages still flow correctly but they won’t appear in the Submodel dropdown. The warning callout under ',
        link('#wrapping-messages', 'Wrapping Messages'),
        ' is the same rule from the DevTools side.',
      ),
      para(
        'When a Submodel emits an OutMessage, the parent’s ',
        inlineCode('GotChildMessage'),
        ' handler shows both the wrapper and any domain Message the parent dispatched in response. The full causal chain is visible in the timeline.',
      ),
      tableOfContentsEntryToHeader(commonPitfallsHeader),
      para('Issues new Submodel users hit, and where to read about the fix:'),
      bullets(
        h.span(
          [],
          [
            h.strong([], ['Duplicate slotId thrown at view-build time.']),
            ' Two ',
            inlineCode('h.submodel'),
            ' calls under the same parent share a ',
            inlineCode('slotId'),
            '. See ',
            link(
              '#boundary-id-and-model-identity',
              'Boundary Id and Model Identity',
            ),
            '.',
          ],
        ),
        h.span(
          [],
          [
            h.strong([], ['Child events not reaching the parent’s update.']),
            ' The wrapper Message isn’t named ',
            inlineCode('Got*Message'),
            ', or the wrapper variant hasn’t been added to the parent’s update. See ',
            link('#wrapping-messages', 'Wrapping Messages'),
            ' and ',
            link('#delegating-in-update', 'Delegating in update'),
            '.',
          ],
        ),
        h.span(
          [],
          [
            h.strong([], ['Child’s view sees stale parent state.']),
            ' Parent state was copied into the child Model and forgotten on update. Thread it through ',
            inlineCode('viewInputs'),
            ' (rebuilt every render) instead. See ',
            link(
              '#parent-state-in-view',
              'Passing Parent State to a Child Submodel’s view',
            ),
            '.',
          ],
        ),
        h.span(
          [],
          [
            h.strong(
              [],
              [
                'Handlers dispatched from a slot callback fire in the wrong boundary.',
              ],
            ),
            ' The Submodel published an attribute group without wrapping it in ',
            inlineCode('childAttributes'),
            '. See ',
            link('#child-attributes', 'childAttributes'),
            '.',
          ],
        ),
        h.span(
          [],
          [
            h.strong([], ['View-build error like ']),
            inlineCode('viewInputs.config.onSubmit'),
            '. A slot callback was nested inside an object or array in ',
            inlineCode('viewInputs'),
            '. Lift it to the top level. See the warning callout under ',
            link('#per-render-view-inputs', 'Per-render View Inputs'),
            '.',
          ],
        ),
        h.span(
          [],
          [
            h.strong([], ['Long list of Submodels feels slow.']),
            ' Default is to re-render each row every parent render. See ',
            link('#memoization', 'Memoization Across Submodel Boundaries'),
            '.',
          ],
        ),
      ),
      tableOfContentsEntryToHeader(apiReferenceHeader),
      tableOfContentsEntryToHeader(apiHSubmodelHeader),
      para(inlineCode('h.submodel(config: SubmodelConfig<View>): Html')),
      para(
        'Embeds a child Submodel under the current boundary. Creates a runtime boundary holding the embed site’s ',
        inlineCode('slotId'),
        ' and ',
        inlineCode('toParentMessage'),
        ', dispatches Messages from inside the child through the wrap chain to the parent, and deregisters the boundary when the DOM node is destroyed. See ',
        link('#wiring-the-view', 'Wiring the View with h.submodel'),
        ' for usage; see ',
        link(
          '#boundary-id-and-model-identity',
          'Boundary Id and Model Identity',
        ),
        ' for ',
        inlineCode('slotId'),
        ' semantics.',
      ),
      tableOfContentsEntryToHeader(apiSubmodelConfigHeader),
      para(
        'The configuration record passed to ',
        inlineCode('h.submodel'),
        '.',
      ),
      propTable(submodelConfigProps),
      tableOfContentsEntryToHeader(apiDefineViewHeader),
      para(
        inlineCode(
          'Submodel.defineView<Model, Message, ViewInputs = void>(fn): SubmodelView<Model, Message, ViewInputs>',
        ),
      ),
      para(
        'Brands a view function with its Message type so ',
        inlineCode('h.submodel'),
        ' can type-check the embed site without a per-call type argument. The ',
        inlineCode('<Model, Message>'),
        ' parameters are required at the definition site; ',
        inlineCode('ViewInputs'),
        ' is optional and, when supplied, makes the view take a second ',
        inlineCode('viewInputs'),
        ' argument. Also exported as ',
        inlineCode('defineView'),
        ' from ',
        inlineCode('foldkit/html'),
        '.',
      ),
      tableOfContentsEntryToHeader(apiSubmodelViewHeader),
      para(
        inlineCode(
          'Submodel.View<Model, Message, ViewInputs = void> = (model, viewInputs) => Html',
        ),
      ),
      para(
        'The branded view type produced by ',
        inlineCode('Submodel.defineView'),
        '. Carries the child’s Message type at the type level. Consumers don’t usually annotate values with this type directly; the brand and ',
        inlineCode('Parameters<View>'),
        ' carry the inference at the embed site. Also exported as ',
        inlineCode('SubmodelView'),
        ' from ',
        inlineCode('foldkit/html'),
        '.',
      ),
      tableOfContentsEntryToHeader(apiChildAttributesHeader),
      para(
        inlineCode(
          'childAttributes<Attribute>(attributes: ReadonlyArray<Attribute>): ReadonlyArray<ChildAttribute>',
        ),
      ),
      para(
        'Snapshots the Submodel’s dispatcher at publish time and brands each attribute so handlers route through the Submodel’s boundary when later spread into the consumer’s elements. Called inside a Submodel that publishes attribute bundles to a consumer’s ',
        inlineCode('toView'),
        ' slot. See ',
        link('#child-attributes', 'childAttributes'),
        ' for the full mechanism.',
      ),
      tableOfContentsEntryToHeader(apiChildAttributeHeader),
      para(
        inlineCode('ChildAttribute'),
        ' is the branded attribute type returned by ',
        inlineCode('childAttributes'),
        '. Element constructors (',
        inlineCode('h.button'),
        ', ',
        inlineCode('h.input'),
        ', etc.) accept ',
        inlineCode('ChildAttribute'),
        ' alongside ordinary ',
        inlineCode('Attribute<Message>'),
        ' values, using the carried dispatcher when present.',
      ),
      para(
        'With Model, Messages, update, view, Commands, and Submodels in place, you have the full vocabulary for describing a Foldkit app. The next page covers the ',
        link(coreRuntimeRouter(), 'Runtime'),
        ': the engine that executes Commands, runs Subscriptions, manages Mount and ManagedResource lifecycles, and routes Messages back into update.',
      ),
    ],
  )
}
