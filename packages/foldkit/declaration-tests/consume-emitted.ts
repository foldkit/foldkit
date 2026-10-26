import { Effect, Layer } from 'effect'
import * as Block from 'foldkit/block'
import * as Command from 'foldkit/command'
import type { Html } from 'foldkit/html'
import * as Mount from 'foldkit/mount'
import * as Runtime from 'foldkit/runtime'
import * as Update from 'foldkit/update'

import {
  ApplicationComposition,
  ApplicationDefinition,
  ChildBinding,
  ChildBlock,
  ChildComposition,
  ChildDefinition,
  ChildEffectsLayer,
  ChildMessage,
  ChildModel,
  Clock,
  type CompletedChild,
  type CompletedChoice,
  type CompletedPure,
  Direct,
  DirectChildBinding,
  DirectInitBlock,
  DirectInitChildBinding,
  DirectModel,
  Measure,
  ObserveParent,
  Parent,
  ParentComposition,
  ParentDefinition,
  ParentMessage,
  ParentModel,
  ProvisionDependencyLayer,
  ProvisionExtra,
  Pure,
  PureApplicationComposition,
  PureComposition,
  ReadCount,
  ReadDirectValue,
  RecordModel,
  RefinedChoice,
  type RefinedChoiceOutMessage,
  type RefreshContext,
  applicationBuilderViewHelper,
  applicationInputViewHelper,
  applicationModelViewHelper,
  childInit,
  childInspection,
  childLiteralInit,
  childParameterizedInit,
  contextualRefreshChildStep,
  directResultInit,
  makePageProgram,
  makeProgram,
  makeProvisionElement,
  makeProvisionPageAwaitingDependency,
  makeRoutedFlagsPage,
  parentArrayViewHelper,
  parentBuilderViewHelper,
  parentInputViewHelper,
  parentModelViewHelper,
  parentView,
  provisionPorts,
  provisionRoutingInit,
  recordApplicationUpdate,
  recordUpdate,
  refinedChoiceParentUpdate,
  refreshDirectValueStep,
  renderPage,
  wrappedOverloadedChildInit,
} from './accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
type CommandMessageOfReturn<Value> =
  Value extends Update.ResultRecipe<
    infer _Model,
    infer Message,
    infer _OutMessage,
    infer _Requirements,
    infer _Evidence
  >
    ? Message
    : Value extends Readonly<{
          commands?:
            | Update.Commands<infer Message, infer _Requirements>
            | undefined
        }>
      ? Message
      : never

const childModel = ChildModel.make({ value: 1 })
const directModel = DirectModel.make({ value: 1 })
const parentModel = ParentModel.make({ child: childModel })

// @ts-expect-error An emitted Block Definition does not author the primary view.
ChildDefinition.makeView
// @ts-expect-error An emitted graphful Block Definition does not author the primary view.
ParentDefinition.makeView
// @ts-expect-error An emitted Application Definition does not author the primary view.
ApplicationDefinition.makeView
// @ts-expect-error An emitted Block Definition does not author init directly.
ChildDefinition.makeInit
// @ts-expect-error An emitted Application Definition does not author init directly.
ApplicationDefinition.makeInit

const emittedChildInit = ChildComposition.makeInit(() => ({
  model: ChildModel.make({ value: 1 }),
}))
const emittedParameterizedInit = childParameterizedInit(1, 2, 3, 4)
const emittedLiteralInit = childLiteralInit(2, 3, 4)
const emittedWrappedOverloadedInit = wrappedOverloadedChildInit('value')
const emittedDirectResultInit = directResultInit()
const emittedRoutedInit = provisionRoutingInit

const emittedGraphlessBlockView = PureComposition.makeView((model, h) =>
  h.div([], [globalThis.String(model.value)]),
)
const emittedGraphfulBlockView = ParentComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.block(
        ChildBinding.embedView({ slotId: 'emitted', model: model.child }),
      ),
    ],
  ),
)
const emittedGraphlessApplicationView = PureApplicationComposition.makeView(
  (_model, h) => h.main([]),
)
const emittedGraphfulApplicationView = ApplicationComposition.makeView(
  (model, h) =>
    h.main(
      [],
      [
        h.block(
          ChildBinding.embedView({
            slotId: 'emitted-root',
            model: model.child,
          }),
        ),
      ],
    ),
)

PureComposition.makeView((_model, h) =>
  h.div([
    // @ts-expect-error Emitted graphless Composition views reject unregistered Mounts.
    h.OnMount(Measure()),
  ]),
)

ParentComposition.makeView((_model, h) =>
  h.button([
    // @ts-expect-error Emitted Composition views preserve the exact Message.
    h.OnClick(ChildMessage.RequestedRead()),
  ]),
)

// @ts-expect-error Emitted Composition views reject unusable ViewInputs.
ChildComposition.makeView.withInputs<void>((_model, _inputs, h) => h.empty)

void emittedGraphlessBlockView
void emittedGraphfulBlockView
void emittedGraphlessApplicationView
void emittedGraphfulApplicationView

export const childRefresh = ChildBlock.operations.refresh(childModel)
export const directRefresh = Direct.operations.refreshDirectValue(directModel)
const boundRefreshUpdate = ParentComposition.makeUpdate({
  RequestedRefresh: (model, _message) => ChildBinding.refresh()(model),
})
export const boundRefresh = boundRefreshUpdate(
  parentModel,
  ParentMessage.RequestedRefresh(),
)
const directBoundRefreshUpdate = ApplicationComposition.makeUpdate({
  RequestedRefresh: (model, _message) => DirectChildBinding.refresh()(model),
})
export const directBoundRefresh = directBoundRefreshUpdate(
  parentModel,
  ParentMessage.RequestedRefresh(),
)
export const parentRefresh = Parent.operations.refreshChild(parentModel)
export const refinedSelection = RefinedChoice.OutMessage.make({ value: 'Two' })
export const program = makeProgram(document.createElement('div'))
export const pageProgram = makePageProgram(document.createElement('div'))
export const renderedPage = renderPage()
export const routedFlagsPage = makeRoutedFlagsPage(
  document.createElement('div'),
)
void emittedRoutedInit

const provisionPageAwaitingDependency = makeProvisionPageAwaitingDependency(
  document.createElement('div'),
)
const provideDependency = provisionPageAwaitingDependency.provide
export const provisionPage = provideDependency(ProvisionDependencyLayer)
export const provisionElement = makeProvisionElement(
  document.createElement('div'),
)
export const provisionElementHandle = Runtime.embed(provisionElement)

Runtime.run(provisionPage, {
  flags: Effect.map(ProvisionExtra, ({ value }) => ({ initialValue: value })),
})
Runtime.hydrate(provisionPage)
provisionElementHandle.ports.valueChanged.send('updated')
provisionElementHandle.ports.valueRead.subscribe(value => {
  const count: number = value
  void count
})

type EmittedPagePortsAreExact = Expect<
  Equal<typeof provisionPage.ports, typeof provisionPorts>
>
type EmittedElementPortsAreExact = Expect<
  Equal<typeof provisionElement.ports, typeof provisionPorts>
>

type EmittedServicesAreExact = Expect<
  Equal<Layer.Services<typeof ChildEffectsLayer>, Clock>
>
type EmittedErrorIsExact = Expect<
  Equal<Layer.Error<typeof ChildEffectsLayer>, 'HandlerUnavailable'>
>
type EmittedChildInitIsExact = Expect<
  Equal<
    Parameters<typeof childParameterizedInit>,
    [
      value: number,
      offset?: number | undefined,
      ...increments: ReadonlyArray<number>,
    ]
  >
>
type EmittedChildInitModelIsExact = Expect<
  Equal<typeof emittedParameterizedInit.model, ChildModel>
>
type EmittedLiteralInitModelIsExact = Expect<
  Equal<typeof emittedLiteralInit.model, ChildModel>
>
type EmittedWrappedOverloadedInitParametersAreExact = Expect<
  Equal<Parameters<typeof wrappedOverloadedChildInit>, [value: string]>
>
type EmittedWrappedOverloadedInitModelIsExact = Expect<
  Equal<typeof emittedWrappedOverloadedInit.model, ChildModel>
>
type EmittedChildInitRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof childInit>,
    Command.HandlerOf<typeof ReadCount>
  >
>
type EmittedDirectInitEvidenceIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<typeof emittedDirectResultInit>,
    Block.RequirementOfBinding<typeof DirectInitChildBinding>
  >
>
type EmittedDirectInitRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof directResultInit>,
    Block.Scoped<'direct-init-child', Command.HandlerOf<typeof ReadCount>>
  >
>
type EmittedDirectInitBlockModelIsExact = Expect<
  Equal<ReturnType<typeof DirectInitBlock.init>['model'], ChildModel>
>
type EmittedOwnedInitReturnIsExact = Expect<
  Equal<ReturnType<typeof emittedChildInit>['model'], ChildModel>
>
type EmittedBoundRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<ReturnType<typeof ChildBinding.refresh>>,
    Block.Scoped<'child', Command.HandlerOf<typeof ReadCount>>
  >
>
type EmittedBoundEvidenceIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<ReturnType<typeof ChildBinding.refresh>>
    >,
    Block.RequirementOfBinding<typeof ChildBinding>
  >
>
type EmittedAccessorMappedMessageIsExact = Expect<
  Equal<
    CommandMessageOfReturn<ReturnType<typeof ChildBinding.fold>>,
    Readonly<{
      _tag: 'GotChildMessage'
      placement: 'child'
      generation: number
      message: ChildMessage
    }>
  >
>
type EmittedDirectMappedMessageIsExact = Expect<
  Equal<
    CommandMessageOfReturn<ReturnType<typeof DirectChildBinding.fold>>,
    Readonly<{
      _tag: 'GotChildMessage'
      placement: 'child'
      generation: number
      message: ChildMessage
    }>
  >
>
type EmittedBindingStringKeysAreExact = Expect<
  Equal<
    Extract<keyof typeof ChildBinding, string>,
    'placement' | 'init' | 'fold' | 'embedView' | 'refresh'
  >
>
type EmittedInspectionServicesAreExact = Expect<
  Equal<Layer.Services<typeof childInspection.EffectsLayer>, Clock>
>
type EmittedInspectionErrorIsExact = Expect<
  Equal<Layer.Error<typeof childInspection.EffectsLayer>, 'HandlerUnavailable'>
>
type EmittedInspectionMountsAreExact = Expect<
  Equal<(typeof childInspection.mounts)[number], typeof Measure>
>
type EmittedProducerParametersAreExact = Expect<
  Equal<
    Parameters<typeof contextualRefreshChildStep>,
    [
      model: ParentModel &
        Update.GraphCapability<
          ParentModel,
          Block.RequirementOfBinding<typeof ChildBinding>
        >,
      context?: RefreshContext | undefined,
    ]
  >
>
type EmittedProducerRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof contextualRefreshChildStep>,
    Block.Scoped<'child', Command.HandlerOf<typeof ReadCount>>
  >
>
type EmittedDirectRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof refreshDirectValueStep>,
    Command.HandlerOf<typeof ReadDirectValue>
  >
>
type EmittedRefinementIsExact = Expect<
  Equal<RefinedChoiceOutMessage['value'], 'One' | 'Two'>
>
type EmittedCompletedChildIsExact = Expect<
  Equal<CompletedChild, typeof ChildBlock>
>
type EmittedCompletedPureIsExact = Expect<Equal<CompletedPure, typeof Pure>>
type EmittedCompletedChoiceIsExact = Expect<
  Equal<CompletedChoice<readonly ['One', 'Two']>, typeof RefinedChoice>
>
type EmittedCompletedChoiceInputIsExact = Expect<
  Equal<
    Parameters<
      CompletedChoice<readonly ['One', 'Two']>['operations']['finish']
    >,
    [model: typeof RefinedChoice.Model.Type, value: 'One' | 'Two']
  >
>
type EmittedCompletedChildMountsAreExact = Expect<
  Equal<CompletedChild['mounts'][number], typeof Measure>
>
type EmittedParentModelViewHelperParametersAreExact = Expect<
  Equal<
    Parameters<typeof parentModelViewHelper>,
    [model: ParentModel, h: Block.ViewBuilderFor<typeof ParentComposition>]
  >
>
type EmittedParentBuilderViewHelperParametersAreExact = Expect<
  Equal<
    Parameters<typeof parentBuilderViewHelper>,
    [h: Block.ViewBuilderFor<typeof ParentComposition>]
  >
>
type EmittedParentInputViewHelperParametersAreExact = Expect<
  Equal<
    Parameters<typeof parentInputViewHelper>,
    [
      input: typeof ChildModel.Type,
      h: Block.ViewBuilderFor<typeof ParentComposition>,
    ]
  >
>
type EmittedParentViewRequirementsAreExact = Expect<
  Equal<
    Block.ViewMountRequirementsOf<typeof parentView>,
    | Mount.RequirementsOf<typeof ObserveParent>
    | Block.RequirementsOfBindings<readonly [typeof ChildBinding]>
  >
>
type EmittedParentArrayViewHelperOutputIsHtmlArray = Expect<
  ReturnType<typeof parentArrayViewHelper> extends ReadonlyArray<Html>
    ? true
    : false
>
type EmittedApplicationModelViewHelperParametersAreExact = Expect<
  Equal<
    Parameters<typeof applicationModelViewHelper>,
    [model: ParentModel, h: Block.ViewBuilderFor<typeof ApplicationComposition>]
  >
>
type EmittedApplicationBuilderViewHelperParametersAreExact = Expect<
  Equal<
    Parameters<typeof applicationBuilderViewHelper>,
    [h: Block.ViewBuilderFor<typeof ApplicationComposition>]
  >
>
type EmittedApplicationInputViewHelperParametersAreExact = Expect<
  Equal<
    Parameters<typeof applicationInputViewHelper>,
    [
      input: typeof ChildModel.Type,
      h: Block.ViewBuilderFor<typeof ApplicationComposition>,
    ]
  >
>

export type EmittedAssertions = [
  EmittedServicesAreExact,
  EmittedErrorIsExact,
  EmittedChildInitIsExact,
  EmittedChildInitModelIsExact,
  EmittedLiteralInitModelIsExact,
  EmittedWrappedOverloadedInitParametersAreExact,
  EmittedWrappedOverloadedInitModelIsExact,
  EmittedChildInitRequirementsAreExact,
  EmittedDirectInitEvidenceIsExact,
  EmittedDirectInitRequirementsAreExact,
  EmittedDirectInitBlockModelIsExact,
  EmittedOwnedInitReturnIsExact,
  EmittedBoundRequirementsAreExact,
  EmittedBoundEvidenceIsExact,
  EmittedAccessorMappedMessageIsExact,
  EmittedDirectMappedMessageIsExact,
  EmittedBindingStringKeysAreExact,
  EmittedInspectionServicesAreExact,
  EmittedInspectionErrorIsExact,
  EmittedInspectionMountsAreExact,
  EmittedProducerParametersAreExact,
  EmittedProducerRequirementsAreExact,
  EmittedDirectRequirementsAreExact,
  EmittedRefinementIsExact,
  EmittedCompletedChildIsExact,
  EmittedCompletedPureIsExact,
  EmittedCompletedChoiceIsExact,
  EmittedCompletedChoiceInputIsExact,
  EmittedCompletedChildMountsAreExact,
  EmittedParentModelViewHelperParametersAreExact,
  EmittedParentBuilderViewHelperParametersAreExact,
  EmittedParentInputViewHelperParametersAreExact,
  EmittedParentViewRequirementsAreExact,
  EmittedParentArrayViewHelperOutputIsHtmlArray,
  EmittedApplicationModelViewHelperParametersAreExact,
  EmittedApplicationBuilderViewHelperParametersAreExact,
  EmittedApplicationInputViewHelperParametersAreExact,
  EmittedPagePortsAreExact,
  EmittedElementPortsAreExact,
]

export type RelocatedRecordBlockModel = Expect<
  Equal<ReturnType<typeof recordUpdate>['model'], typeof RecordModel.Type>
>
export type RelocatedRecordApplicationModel = Expect<
  Equal<
    ReturnType<typeof recordApplicationUpdate>['model'],
    typeof RecordModel.Type
  >
>

export type EmittedResolvedRefinedOutMessage = Expect<
  Equal<
    NonNullable<ReturnType<typeof refinedChoiceParentUpdate>['outMessage']>,
    RefinedChoiceOutMessage
  >
>
