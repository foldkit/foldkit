import { Context, Effect, Layer, Option, Record, Schema } from 'effect'
import { Program } from 'foldkit'
import * as Block from 'foldkit/block'
import * as Command from 'foldkit/command'
import { Server } from 'foldkit/experimental'
import { defineMessageUnion } from 'foldkit/message'
import type * as Mount from 'foldkit/mount'
import type * as ProgramTypes from 'foldkit/program'
import * as Runtime from 'foldkit/runtime'
import { Lazy } from 'foldkit/test'
import * as Update from 'foldkit/update'
import type { Url } from 'foldkit/url'

import {
  ChildBinding,
  ChildBlock,
  ChildMessage,
  type ChildModel,
  type CompletedChild,
  type CompletedChoice,
  DisclosuresComposition,
  Measure,
  ParentMessage,
  ParentModel,
  RecordApplicationComposition,
  RefinedChoice,
  makeProvisionElement,
  makeProvisionPageAwaitingDependency,
  parentView,
} from './accepted.js'

// @ts-expect-error Update.combine was renamed to Update.combineSteps.
Update.combine

export type RemovedLegacyRuntimeContracts = [
  // @ts-expect-error Program.make receives a completed root Block instead of loose application configuration.
  Runtime.ApplicationConfig<never, never>,
  // @ts-expect-error Flags are configured on Program.make rather than a loose application config type.
  Runtime.ApplicationConfigWithFlags<never, never, never>,
  // @ts-expect-error Routing belongs to Program.make host configuration.
  Runtime.RoutingApplicationConfig<never, never>,
  // @ts-expect-error Routing and Flags belong to Program.make host configuration.
  Runtime.RoutingApplicationConfigWithFlags<never, never, never>,
  // @ts-expect-error Program.makeElement receives a completed root Block.
  Runtime.ElementConfig<never, never>,
  // @ts-expect-error Element Flags belong to Program.makeElement host configuration.
  Runtime.ElementConfigWithFlags<never, never, never>,
  // @ts-expect-error Init is authored through the root Block Composition.
  Runtime.ApplicationInit<never, never>,
  // @ts-expect-error Routing init is authored through the root Block Composition.
  Runtime.RoutingApplicationInit<never, never>,
  // @ts-expect-error Element init is authored through the root Block Composition.
  Runtime.ElementInit<never, never>,
  // @ts-expect-error Public Program types replace the native runtime implementation result.
  Runtime.MakeRuntimeReturn,
]

const LocalMessage = defineMessageUnion({ RequestedRefresh: {} })

const InvalidApplication = (() => {
  const ApplicationDefinition = Block.makeDefinition('Application', {
    Model: ParentModel,
    Message: LocalMessage,
  })

  return ApplicationDefinition
})()
const InvalidApplicationComposition = InvalidApplication.makeComposition()
// @ts-expect-error The previous public builder helper is no longer exported.
export type RemovedBlockBuilder = Block.HtmlBuilderOf<
  typeof InvalidApplicationComposition
>
// @ts-expect-error The Program subpath also omits the previous helper name.
export type RemovedProgramBuilder = ProgramTypes.HtmlBuilderOf<
  typeof InvalidApplicationComposition
>
type InvalidApplicationViewBuilder = Block.ViewBuilderFor<
  typeof InvalidApplicationComposition
>
const invalidApplicationImplementation = {
  init: InvalidApplicationComposition.makeInit(() => ({
    model: ParentModel.make({ child: ChildBlock.Model.make({ value: 0 }) }),
  })),
  update: InvalidApplicationComposition.makeUpdate({
    RequestedRefresh: model => ({ model }),
  }),
  EffectsLayer: Layer.empty,
}
const invalidElementView = InvalidApplicationComposition.makeView((model, h) =>
  h.main([], [globalThis.String(model.child.value)]),
)
const invalidDocumentView = InvalidApplicationComposition.makeView(
  (model, h) => ({
    title: 'Invalid application fixture',
    body: h.main([], [globalThis.String(model.child.value)]),
  }),
)

// @ts-expect-error An Application Definition does not author the primary view.
InvalidApplication.makeView
// @ts-expect-error An Application Definition does not author init directly.
InvalidApplication.makeInit

const InvalidInitMessage = defineMessageUnion({ CompletedForeignInit: {} })
const DeclarationTestsValidInit = Command.define('DeclarationTestsValidInit', {
  messages: [ParentMessage.RequestedRefresh],
})
const DeclarationTestsForeignInit = Command.define(
  'DeclarationTestsForeignInit',
  {
    messages: [InvalidInitMessage.CompletedForeignInit],
  },
)
const invalidModelInit = () => ({
  model: ChildBlock.Model.make({ value: 0 }),
})
const invalidCommandInit = () => ({
  model: ParentModel.make({ child: ChildBlock.Model.make({ value: 0 }) }),
  commands: [DeclarationTestsValidInit(), DeclarationTestsForeignInit()],
})
const invalidOutMessageInit = () => ({
  model: ParentModel.make({ child: ChildBlock.Model.make({ value: 0 }) }),
  outMessage: ParentMessage.RequestedRefresh(),
})
const invalidUnionInit = (isValid: boolean) =>
  isValid
    ? {
        model: ParentModel.make({
          child: ChildBlock.Model.make({ value: 0 }),
        }),
      }
    : { commands: [DeclarationTestsValidInit()] }

type ValidInitReturn = Readonly<{ model: ParentModel }>
type InvalidInitReturn = Readonly<{ model: ChildModel }>

function validOverloadedInit(value: number): ValidInitReturn
function validOverloadedInit(value: string): ValidInitReturn
function validOverloadedInit(_value: number | string): ValidInitReturn {
  return {
    model: ParentModel.make({ child: ChildBlock.Model.make({ value: 0 }) }),
  }
}

interface EarlyInvalidDuplicateTrailingInit {
  (value: boolean): InvalidInitReturn
  (value: number): ValidInitReturn
  (value: string): ValidInitReturn
  (value: string): ValidInitReturn
}

interface MiddleForeignCommandInit {
  (value: boolean): ValidInitReturn
  (value: number): ReturnType<typeof invalidCommandInit>
  (value: string): ValidInitReturn
}

interface SafelyNormalizedEarlierInit {
  (value: number): ValidInitReturn | InvalidInitReturn
  (value: string | number): ValidInitReturn
}

type GenericLastInit = ((value: string) => InvalidInitReturn) &
  (<Value extends number>(value: Value) => ValidInitReturn & { value: Value })

declare const earlyInvalidDuplicateTrailingInit: EarlyInvalidDuplicateTrailingInit
declare const middleForeignCommandInit: MiddleForeignCommandInit
declare const safelyNormalizedEarlierInit: SafelyNormalizedEarlierInit
declare const genericLastInit: GenericLastInit

const genericInit = <Value extends number>(value: Value) => ({
  model: ParentModel.make({ child: ChildBlock.Model.make({ value: 0 }) }),
  value,
})

const callableMetadataInit = Object.assign(
  () => ({
    model: ParentModel.make({ child: ChildBlock.Model.make({ value: 0 }) }),
  }),
  { description: 'Initial parent Model' },
)

InvalidApplicationComposition.makeInit(() => callableMetadataInit())
// @ts-expect-error Initializers accept plain functions; adapt callable metadata through a concrete callback.
InvalidApplicationComposition.makeInit(callableMetadataInit)

// @ts-expect-error Application init must return the Application Model.
InvalidApplicationComposition.makeInit(invalidModelInit)
// @ts-expect-error Every Application init Command must return the Application Message.
InvalidApplicationComposition.makeInit(invalidCommandInit)
// @ts-expect-error Application init cannot emit an OutMessage.
InvalidApplicationComposition.makeInit(invalidOutMessageInit)
// @ts-expect-error Every Application init result branch must contain the Application Model.
InvalidApplicationComposition.makeInit(invalidUnionInit)
// @ts-expect-error Initializers require one concrete call signature.
InvalidApplicationComposition.makeInit(validOverloadedInit)
// @ts-expect-error Initializers require one concrete call signature.
InvalidApplicationComposition.makeInit(earlyInvalidDuplicateTrailingInit)
// @ts-expect-error Initializers require one concrete call signature.
InvalidApplicationComposition.makeInit(middleForeignCommandInit)
InvalidApplicationComposition.makeInit(safelyNormalizedEarlierInit)
// @ts-expect-error Initializers require one concrete call signature.
InvalidApplicationComposition.makeInit(genericLastInit)
// @ts-expect-error Initializers require one concrete call signature.
InvalidApplicationComposition.makeInit(genericInit)

const DeclarationTestsInvalidBlockInitDefinition = Block.makeDefinition(
  'DeclarationTestsInvalidBlockInit',
  {
    Model: ParentModel,
    Message: LocalMessage,
  },
)
const InvalidBlockInit = DeclarationTestsInvalidBlockInitDefinition
const InvalidBlockInitComposition = InvalidBlockInit.makeComposition()
// @ts-expect-error Block init must return the Block Model.
InvalidBlockInitComposition.makeInit(invalidModelInit)
// @ts-expect-error Every Block init Command must return the Block Message.
InvalidBlockInitComposition.makeInit(invalidCommandInit)
// @ts-expect-error Block init cannot emit an OutMessage.
InvalidBlockInitComposition.makeInit(invalidOutMessageInit)
// @ts-expect-error A Block Definition does not author init directly.
InvalidBlockInit.makeInit

const InitFlags = Schema.Struct({ value: Schema.Number })
const flagsRoutingInit = InvalidApplicationComposition.makeInit(
  (_flags: typeof InitFlags.Type, _url: Url) => ({
    model: ParentModel.make({ child: ChildBlock.Model.make({ value: 0 }) }),
  }),
)
const prepare = () =>
  InvalidApplicationComposition.prepareBlock({
    init: flagsRoutingInit,
    update: invalidApplicationImplementation.update,
    view: invalidDocumentView,
  })
const completedBlock: Block.FromAssemblyWithView<
  typeof ParentModel,
  typeof prepare
> = Block.assemble(prepare)

// @ts-expect-error Completion requires the Flags and routing inputs declared by init.
Program.make({
  block: completedBlock,
  container: null,
})

const DeclarationTestsViewHelperDefinition = Block.makeDefinition(
  'DeclarationTestsViewHelper',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)
const ObserveViewHelper = DeclarationTestsViewHelperDefinition.makeMount(
  'ObserveViewHelper',
  {
    messages: [ParentMessage.RequestedRefresh],
  },
)
declare const broadMountRegistry: ReadonlyArray<Mount.LayeredMountDefinition>
DeclarationTestsViewHelperDefinition.makeComposition({
  // @ts-expect-error A Composition Mount registry must preserve each definition name.
  mounts: broadMountRegistry,
})
// @ts-expect-error A no-args Mount rejects invented args.
ObserveViewHelper({ unexpected: true })
const AlternativeViewChildBinding =
  DeclarationTestsViewHelperDefinition.makeBinding(ChildBlock, {
    field: 'child',
    placement: 'alternativeViewChild',
    init: false,
  })
const DeclarationTestsViewHelperComposition =
  DeclarationTestsViewHelperDefinition.makeComposition({
    bindings: [AlternativeViewChildBinding],
  })
const ViewHelperComposition = DeclarationTestsViewHelperComposition
type ViewHelperViewBuilder = Block.ViewBuilderFor<typeof ViewHelperComposition>
const viewHelper = (model: ParentModel, h: ViewHelperViewBuilder) =>
  h.main([], [globalThis.String(model.child.value)])

const viewHelperWithOmittedChild = (
  model: ParentModel,
  h: ViewHelperViewBuilder,
) =>
  h.block(
    // @ts-expect-error An extracted view helper cannot use a child absent from its Composition.
    ChildBinding.embedView({ slotId: 'omitted-child', model: model.child }),
  )

const viewHelperWithOmittedMount = (h: ViewHelperViewBuilder) =>
  h.main([
    // @ts-expect-error An extracted view helper cannot use a Mount absent from its Composition.
    h.OnMount(ObserveViewHelper()),
  ])

const ForeignViewHelperMessage = defineMessageUnion({
  ClickedForeignViewHelper: {},
})

// @ts-expect-error A Block Definition does not author the primary view.
DeclarationTestsViewHelperDefinition.makeView

ViewHelperComposition.makeView((_model, h) =>
  h.main([
    // @ts-expect-error A Composition view cannot use an unregistered Mount.
    h.OnMount(ObserveViewHelper()),
  ]),
)

ViewHelperComposition.makeView((_model, h) =>
  h.button([
    // @ts-expect-error A Composition view preserves its exact Message.
    h.OnClick(ForeignViewHelperMessage.ClickedForeignViewHelper()),
  ]),
)

// @ts-expect-error void cannot describe usable per-render ViewInputs.
ViewHelperComposition.makeView.withInputs<void>((_model, _inputs, h) => h.empty)

// @ts-expect-error any cannot erase a Composition's ViewInputs contract.
ViewHelperComposition.makeView.withInputs<any>((_model, _inputs, h) => h.empty) // eslint-disable-line @typescript-eslint/no-explicit-any

const viewHelperWithForeignMessage = (h: ViewHelperViewBuilder) =>
  h.button([
    // @ts-expect-error An extracted view helper accepts only its Composition's Message.
    h.OnClick(ForeignViewHelperMessage.ClickedForeignViewHelper()),
  ])

// @ts-expect-error Composition no longer carries a render helper.
ViewHelperComposition.render

// @ts-expect-error A plain view helper cannot complete a Block as its branded view.
ViewHelperComposition.prepareBlock({
  init: ViewHelperComposition.makeInit(() => ({
    model: ParentModel.make({ child: ChildBlock.Model.make({ value: 0 }) }),
  })),
  update: ViewHelperComposition.makeUpdate({
    RequestedRefresh: model => ({ model }),
  }),
  view: viewHelper,
  EffectsLayer: Layer.empty,
})

const applicationViewHelper = (
  model: ParentModel,
  h: InvalidApplicationViewBuilder,
) => h.main([], [globalThis.String(model.child.value)])

const applicationInputView = InvalidApplicationComposition.makeView.withInputs<
  Readonly<{ label: string }>
>((_model, { label }, h) => h.main([], [label]))

const prepareApplicationInputBlock = () =>
  InvalidApplicationComposition.prepareBlock({
    ...invalidApplicationImplementation,
    view: applicationInputView,
  })
const applicationInputBlock: Block.FromAssemblyWithView<
  typeof ParentModel,
  typeof prepareApplicationInputBlock
> = Block.assemble(prepareApplicationInputBlock)
// @ts-expect-error A Program root view cannot require parent-supplied inputs.
Program.makeElement({
  block: applicationInputBlock,
  container: null,
})

// @ts-expect-error Application Composition no longer carries a render helper.
InvalidApplicationComposition.render

// @ts-expect-error A plain view helper cannot complete a Block as its branded view.
InvalidApplicationComposition.prepareBlock({
  ...invalidApplicationImplementation,
  view: applicationViewHelper,
})

void viewHelperWithOmittedChild
void viewHelperWithOmittedMount
void viewHelperWithForeignMessage

const provisionPageAwaitingDependency = makeProvisionPageAwaitingDependency(
  document.createElement('div'),
)

// @ts-expect-error The first provider carries its still-missing dependency forward.
Runtime.hydrate(provisionPageAwaitingDependency)

const provisionElement = makeProvisionElement(document.createElement('div'))

// @ts-expect-error Provision preserves Element kind, which cannot be hydrated as a page.
Runtime.hydrate(provisionElement)

const DeclarationProvisionContract = Command.define(
  'DeclarationProvisionContract',
  {
    args: { value: Schema.String },
    messages: [ParentMessage.RequestedRefresh],
    handler: function* () {
      return () => Effect.succeed(ParentMessage.RequestedRefresh())
    },
  },
)

// eslint-disable-next-line foldkit/command-binding-matches-name
const ConflictingProvisionContract = Command.define(
  'DeclarationProvisionContract',
  {
    args: { value: Schema.optional(Schema.String) },
    messages: [ParentMessage.RequestedRefresh],
    handler: function* () {
      return () => Effect.succeed(ParentMessage.RequestedRefresh())
    },
  },
)

class ProvisionContractConsumer extends Context.Service<
  ProvisionContractConsumer,
  Readonly<{ value: string }>
>()('DeclarationTestsProvisionContractConsumer') {}

const RequiresConflictingProvisionContract = Layer.effect(
  ProvisionContractConsumer,
  Effect.as(ConflictingProvisionContract({ value: 'input' }).effect, {
    value: 'ready',
  }),
)

const prepare2 = () =>
  InvalidApplicationComposition.prepareBlock({
    ...invalidApplicationImplementation,
    view: invalidElementView,
  })
const completedBlock2: Block.FromAssemblyWithView<
  typeof ParentModel,
  typeof prepare2
> = Block.assemble(prepare2)
const provisionContractProgram = Program.makeElement({
  block: completedBlock2,
  container: null,
})
const programWithProvisionContract = provisionContractProgram.provide(
  DeclarationProvisionContract.layer,
)

// @ts-expect-error A later provider cannot output a conflicting handler contract.
programWithProvisionContract.provide(ConflictingProvisionContract.layer)

// @ts-expect-error A later provider cannot require a conflicting handler contract.
programWithProvisionContract.provide(RequiresConflictingProvisionContract)

const prepareInvalidElementBlock = () =>
  InvalidApplicationComposition.prepareBlock({
    ...invalidApplicationImplementation,
    view: invalidElementView,
  })
const invalidElementBlock: Block.FromAssemblyWithView<
  typeof ParentModel,
  typeof prepareInvalidElementBlock
> = Block.assemble(prepareInvalidElementBlock)
// @ts-expect-error Program.make requires a Document view.
Program.make({
  block: invalidElementBlock,
  container: null,
})

const prepareInvalidDocumentBlock = () =>
  InvalidApplicationComposition.prepareBlock({
    ...invalidApplicationImplementation,
    view: invalidDocumentView,
  })
const invalidDocumentBlock: Block.FromAssemblyWithView<
  typeof ParentModel,
  typeof prepareInvalidDocumentBlock
> = Block.assemble(prepareInvalidDocumentBlock)
// @ts-expect-error Program.makeElement requires an Html view.
Program.makeElement({
  block: invalidDocumentBlock,
  container: null,
})

const requiredContextUpdate =
  InvalidApplicationComposition.makeUpdate.withContext(
    (requiredContext: string) => ({
      RequestedRefresh: (model, _message) => {
        void requiredContext
        return { model }
      },
    }),
  )

const prepareRequiredContextBlock = () =>
  InvalidApplicationComposition.prepareBlock({
    ...invalidApplicationImplementation,
    update: requiredContextUpdate,
    view: invalidElementView,
  })
const requiredContextBlock: Block.FromAssemblyWithView<
  typeof ParentModel,
  typeof prepareRequiredContextBlock
> = Block.assemble(prepareRequiredContextBlock)
// @ts-expect-error A Program root update cannot require dispatch context.
Program.makeElement({
  block: requiredContextBlock,
  container: null,
})

const WiderMessage = defineMessageUnion({
  RequestedRefresh: {},
  RequestedExtraWork: {},
})
const WiderMessageApplication = (() => {
  const ApplicationDefinition = Block.makeDefinition('Application', {
    Model: ParentModel,
    Message: WiderMessage,
  })

  return ApplicationDefinition
})()
const WiderMessageComposition = WiderMessageApplication.makeComposition()
const widerMessageUpdate = WiderMessageComposition.makeUpdate({
  RequestedRefresh: (
    model,
    _message,
  ): Update.Return<ParentModel, typeof WiderMessage.Type> => ({
    model,
  }),
  RequestedExtraWork: (
    model,
    _message,
  ): Update.Return<ParentModel, typeof WiderMessage.Type> => ({
    model,
  }),
})

InvalidApplicationComposition.prepareBlock({
  ...invalidApplicationImplementation,
  // @ts-expect-error A completed Block accepts only an update owned by its Composition.
  update: widerMessageUpdate,
  view: invalidElementView,
})

const WiderInputModel = Schema.Struct({})
const WiderInputModelApplication = (() => {
  const ApplicationDefinition = Block.makeDefinition('Application', {
    Model: WiderInputModel,
    Message: LocalMessage,
  })

  return ApplicationDefinition
})()
const WiderInputModelComposition = WiderInputModelApplication.makeComposition()
const widerModelUpdate = WiderInputModelComposition.makeUpdate({
  RequestedRefresh: (
    _model,
    _message,
  ): Update.Return<ParentModel, typeof LocalMessage.Type> => ({
    model: ParentModel.make({ child: ChildBlock.Model.make({ value: 0 }) }),
  }),
})

InvalidApplicationComposition.prepareBlock({
  ...invalidApplicationImplementation,
  // @ts-expect-error A completed Block accepts only an update owned by its Composition.
  update: widerModelUpdate,
  view: invalidElementView,
})

const prepareInvalidServerBlock = () =>
  InvalidApplicationComposition.prepareBlock({
    ...invalidApplicationImplementation,
    view: invalidElementView,
  })
const invalidServerBlock: Block.FromAssemblyWithView<
  typeof ParentModel,
  typeof prepareInvalidServerBlock
> = Block.assemble(prepareInvalidServerBlock)
// oxlint-disable-next-line effecttsgo/floating-effect
Server.renderToString(
  // @ts-expect-error Server rendering requires a page-owning Document view.
  invalidServerBlock,
  {},
  { isHydratable: false },
)

// @ts-expect-error Early Block IDs cannot contain a scoped identity separator.
Block.makeNamespace('Invalid::EarlyBlock').makeDefinition
// @ts-expect-error Typed Block IDs cannot contain a scoped identity separator.
Block.makeDefinition('Invalid::TypedBlock', {
  Model: ParentModel,
  Message: ParentMessage,
})

const DeclarationTestsConstructorNamespace = Block.makeNamespace(
  'DeclarationTestsConstructor',
)
const ConstructorMessage = defineMessageUnion({ CompletedWork: {} })
const ForeignPrimitiveMessage = defineMessageUnion({ ForeignCompleted: {} })

const DeclarationTestsTypedPrimitiveOwnerDefinition = Block.makeDefinition(
  'DeclarationTestsTypedPrimitiveOwner',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)

DeclarationTestsTypedPrimitiveOwnerDefinition.makeCommand('ForeignCommand', {
  // @ts-expect-error A typed Block Command must produce its owner's Message.
  messages: [ForeignPrimitiveMessage.ForeignCompleted],
})
DeclarationTestsTypedPrimitiveOwnerDefinition.makeMount('ForeignMount', {
  // @ts-expect-error A typed Block Mount must produce its owner's Message.
  messages: [ForeignPrimitiveMessage.ForeignCompleted],
})
DeclarationTestsTypedPrimitiveOwnerDefinition.makeMountStream(
  'ForeignMountStream',
  {
    // @ts-expect-error A typed Block stream Mount must produce its owner's Message.
    messages: [ForeignPrimitiveMessage.ForeignCompleted],
  },
)

const TypedPrimitiveApplication = (() => {
  const ApplicationDefinition = Block.makeDefinition('Application', {
    Model: ParentModel,
    Message: ParentMessage,
  })

  return ApplicationDefinition
})()

TypedPrimitiveApplication.makeCommand('ForeignApplicationCommand', {
  // @ts-expect-error A root Command must produce the Application Message.
  messages: [ForeignPrimitiveMessage.ForeignCompleted],
})
TypedPrimitiveApplication.makeMount('ForeignApplicationMount', {
  // @ts-expect-error A root Mount must produce the Application Message.
  messages: [ForeignPrimitiveMessage.ForeignCompleted],
})
TypedPrimitiveApplication.makeMountStream('ForeignApplicationMountStream', {
  // @ts-expect-error A root stream Mount must produce the Application Message.
  messages: [ForeignPrimitiveMessage.ForeignCompleted],
})

// @ts-expect-error Owned primitive names cannot contain a scoped identity separator.
DeclarationTestsConstructorNamespace.makeCommand('Invalid::Work', {
  messages: [ConstructorMessage.CompletedWork],
})

const HostWork = DeclarationTestsConstructorNamespace.makeCommand('HostWork', {
  messages: [ConstructorMessage.CompletedWork],
})

DeclarationTestsConstructorNamespace.makeCommand('InvalidConstructedWork', {
  messages: [ConstructorMessage.CompletedWork],
  // @ts-expect-error Foldkit handlers are unavailable while another handler is constructed.
  handler: function* () {
    yield* HostWork().effect

    return () => Effect.succeed(ConstructorMessage.CompletedWork())
  },
})

// @ts-expect-error A replacement Layer must preserve the Block's exact handler outputs.
ChildBlock.replaceEffectsLayer(Layer.empty)

const ForeignParentMessage = defineMessageUnion({
  ReceivedChildMessage: { message: ChildMessage },
})
const DeclarationTestsForeignParentDefinition = Block.makeDefinition(
  'DeclarationTestsForeignParent',
  {
    Model: ParentModel,
    Message: ForeignParentMessage,
  },
)
const ForeignParent = DeclarationTestsForeignParentDefinition
const ForeignChildBinding = ForeignParent.makeBinding(ChildBlock, {
  placement: 'foreign-child',
  read: model => Option.some(model.child),
  write: (_model, nextChild) => ParentModel.make({ child: nextChild }),
})

const DeclarationTestsBindingParentDefinition = Block.makeDefinition(
  'DeclarationTestsBindingParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)
const BindingParent = DeclarationTestsBindingParentDefinition

// @ts-expect-error Authored parent Message constructors are no longer accepted by makeBinding.
BindingParent.makeBinding(ChildBlock, {
  field: 'child',
  parentMessage: ParentMessage.RequestedRefresh,
})

// @ts-expect-error Authored outgoing Message mappers are no longer accepted by makeBinding.
BindingParent.makeBinding(ChildBlock, {
  field: 'child',
  toParentMessage: (message: ChildMessage) => message,
})

// @ts-expect-error Authored incoming Message routes are no longer accepted by makeBinding.
BindingParent.makeBinding(ChildBlock, {
  field: 'child',
  fromParentMessage: false,
})

// @ts-expect-error Generated keyed delivery rejects authored outgoing Message mappers.
BindingParent.makeBinding(ChildBlock, {
  placement: 'children',
  readAll: (model: ParentModel) => [model.child],
  key: (): 'only' => 'only',
  keySchema: Schema.Literal('only'),
  read: (childModel: ChildModel) => childModel,
  writeAt: (_model: ParentModel, _key: 'only', nextChild: ChildModel) =>
    ParentModel.make({ child: nextChild }),
  toParentMessage: (_key: 'only', message: ChildMessage) =>
    ForeignParentMessage.ReceivedChildMessage({ message }),
})

Block.makeNamespace('DeclarationTestsInvalidParent')
  .makeDefinition({
    Model: ParentModel,
    Message: ParentMessage,
  })
  .makeComposition(
    // @ts-expect-error Registered child bindings must use the definition's parent Message.
    {
      bindings: [ChildBinding, ForeignChildBinding],
    },
  )

const DeclarationTestsOmittedChildDefinition = Block.makeNamespace(
  'DeclarationTestsOmittedChild',
).makeDefinition({
  Model: ParentModel,
  Message: ParentMessage,
})

Block.makeDefinition('DeclarationTestsInvalidDirectContracts', {
  Model: ParentModel,
  Message: ParentMessage,
  // @ts-expect-error Graph registrations belong to the Composition stage.
  bindings: [ChildBinding],
})

const AlternativeChildBinding =
  DeclarationTestsOmittedChildDefinition.makeBinding(ChildBlock, {
    field: 'child',
    placement: 'alternativeChild',
    init: false,
  })
const DeclarationTestsOmittedChildComposition =
  DeclarationTestsOmittedChildDefinition.makeComposition({
    bindings: [AlternativeChildBinding],
  })
const omittedChildUpdate = DeclarationTestsOmittedChildComposition.makeUpdate({
  // @ts-expect-error A Composition callback cannot invoke an unregistered child operation.
  RequestedRefresh: model => ChildBinding.refresh()(model),
})

// @ts-expect-error Completion retains evidence from the rejected child operation.
DeclarationTestsOmittedChildComposition.prepareBlock({
  init: DeclarationTestsOmittedChildComposition.makeInit(() => ({
    model: ParentModel.make({ child: ChildBlock.Model.make({ value: 0 }) }),
  })),
  update: omittedChildUpdate,
  EffectsLayer: Layer.empty,
})

const DeclarationTestsOmittedInitChildDefinition = Block.makeDefinition(
  'DeclarationTestsOmittedInitChild',
  {
    Model: ChildBlock.Model,
    Message: ParentMessage,
  },
)
const OmittedInitChildBinding =
  DeclarationTestsOmittedInitChildDefinition.makeBinding(ChildBlock, {
    placement: 'omitted-init-child',
    read: model => Option.some(model),
    write: (_model, nextChild) => nextChild,
  })
const AlternativeInitChildBinding =
  DeclarationTestsOmittedInitChildDefinition.makeBinding(ChildBlock, {
    placement: 'alternativeInitChild',
    read: model => Option.some(model),
    write: (_model, nextChild) => nextChild,
  })
const DeclarationTestsOmittedInitChildComposition =
  DeclarationTestsOmittedInitChildDefinition.makeComposition({
    bindings: [AlternativeInitChildBinding],
  })
const omittedChildInit = DeclarationTestsOmittedInitChildComposition.makeInit(
  () =>
    OmittedInitChildBinding.init({
      args: [],
      toParentModel: child => child,
    }),
)

// @ts-expect-error A Block initializer cannot use an unregistered child Binding.
DeclarationTestsOmittedInitChildComposition.prepareBlock({
  init: omittedChildInit,
  update: DeclarationTestsOmittedInitChildComposition.makeUpdate({
    RequestedRefresh: model => ({
      model,
    }),
  }),
  EffectsLayer: Layer.empty,
})

ParentMessage.match<Update.Return<ParentModel, ParentMessage>>(
  ParentMessage.RequestedRefresh(),
  {
    RequestedRefresh: () =>
      // @ts-expect-error An explicit plain Return cannot erase child registration evidence.
      ChildBinding.init({
        args: [],
        toParentModel: child => ParentModel.make({ child }),
      }),
  },
)

// @ts-expect-error A connected Binding initializer requires the complete parent configuration.
ChildBinding.init()

RefinedChoice.OutMessage.make({
  // @ts-expect-error The completed generic Block retains its refined constructor input.
  value: 'Three',
})

const refinedModel = RefinedChoice.Model.make({ value: 'One' })
const completedRefinedChoice: CompletedChoice<readonly ['One', 'Two']> =
  RefinedChoice

// @ts-expect-error Direct exposed operations retain their refined input after completion.
completedRefinedChoice.operations.finish(refinedModel, 'Three')

// @ts-expect-error A named completion preserves the exact Block contract.
const invalidCompletedChild: CompletedChild = Direct
void invalidCompletedChild

// @ts-expect-error Binding lifecycle metadata is available through Block.inspectBinding.
ChildBinding.subscriptions
// @ts-expect-error Binding resource metadata is available through Block.inspectBinding.
ChildBinding.managedResources
// @ts-expect-error Binding Mount metadata is available through Block.inspectBinding.
ChildBinding.mounts
// @ts-expect-error Binding Layer metadata is available through Block.inspectBinding.
ChildBinding.EffectsLayer
// @ts-expect-error Internal Binding evidence is not a string member.
ChildBinding.__blockBindingBlock
// @ts-expect-error Internal handler evidence is not a string member.
ChildBinding.__blockHandlerRequirements

const DeclarationTestsInvalidViewComposition = Block.makeNamespace(
  'DeclarationTestsInvalidView',
)
  .makeDefinition({
    Model: ParentModel,
    Message: ParentMessage,
  })
  .makeComposition({
    bindings: [ChildBinding],
  })

DeclarationTestsInvalidViewComposition.makeView((model, h) => {
  const config = ChildBinding.embedView({ slotId: 'child', model: model.child })

  h.block(config)
  h.block({
    // @ts-expect-error A public lookalike cannot forge private binding scope evidence.
    __blockConfigEvidence: {
      config,
      parentMessage: ParentMessage.RequestedRefresh(),
      mountRequirements: Measure,
    },
  })

  return h.empty
})

DisclosuresComposition.makeUpdate({
  // @ts-expect-error A graphless Block still rejects incompatible Record values.
  ToggledDisclosure: (model, { id }) => ({
    model: Record.set(model, id, 'invalid'),
  }),
})
RecordApplicationComposition.makeUpdate({
  // @ts-expect-error A graphless Application still rejects incompatible Record values.
  ToggledDisclosure: (model, { id }) => ({
    model: Record.set(model, id, 'invalid'),
  }),
})

Lazy.expectAllReused({
  view: parentView,
  // @ts-expect-error A registered view retains its exact parent Model at the public helper boundary.
  model: { child: { value: 'invalid' } },
})
