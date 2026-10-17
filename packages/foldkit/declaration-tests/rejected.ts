import { Context, Effect, Layer, Option, Record, Schema } from 'effect'
import { defineApplication } from 'foldkit'
import type * as ApplicationTypes from 'foldkit/application'
import * as Block from 'foldkit/block'
import * as Command from 'foldkit/command'
import { Server } from 'foldkit/experimental'
import { defineMessageUnion } from 'foldkit/message'
import * as Runtime from 'foldkit/runtime'
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
} from './accepted.js'

const InvalidApplication = (() => {
  const Application = defineApplication({
    Model: ParentModel,
    Message: ParentMessage,
  })

  return Application
})()
const InvalidApplicationComposition = InvalidApplication.makeComposition()
// @ts-expect-error The previous public builder helper is no longer exported.
export type RemovedBlockBuilder = Block.HtmlBuilderOf<
  typeof InvalidApplicationComposition
>
// @ts-expect-error The application subpath also removes the previous helper name.
export type RemovedApplicationBuilder = ApplicationTypes.HtmlBuilderOf<
  typeof InvalidApplicationComposition
>
type InvalidApplicationViewBuilder = Block.ViewBuilderFor<
  typeof InvalidApplicationComposition
>
const invalidApplicationImplementation = {
  init: InvalidApplicationComposition.makeInit(() => ({
    model: ParentModel.make({ child: ChildBlock.Model.make({ value: 0 }) }),
  })),
  update: InvalidApplicationComposition.makeUpdate(model => ({ model })),
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

const DeclarationTestsInvalidBlockInit = Block.define(
  'DeclarationTestsInvalidBlockInit',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)
const InvalidBlockInit = DeclarationTestsInvalidBlockInit
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

// @ts-expect-error Completion requires the Flags and routing inputs declared by init.
InvalidApplicationComposition.makeApplication({
  container: null,
  init: flagsRoutingInit,
  update: invalidApplicationImplementation.update,
  view: invalidDocumentView,
})

const DeclarationTestsViewHelper = Block.define('DeclarationTestsViewHelper', {
  Model: ParentModel,
  Message: ParentMessage,
})
const ObserveViewHelper = DeclarationTestsViewHelper.mount(
  'ObserveViewHelper',
  {
    messages: [ParentMessage.RequestedRefresh],
  },
)
const DeclarationTestsViewHelperComposition =
  DeclarationTestsViewHelper.makeComposition()
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
DeclarationTestsViewHelper.makeView

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

ViewHelperComposition.makeBlock({
  init: ViewHelperComposition.makeInit(() => ({
    model: ParentModel.make({ child: ChildBlock.Model.make({ value: 0 }) }),
  })),
  update: ViewHelperComposition.makeUpdate(model => ({ model })),
  // @ts-expect-error A plain view helper cannot complete a Block as its branded view.
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

// @ts-expect-error An Application's primary view cannot require parent-supplied inputs.
InvalidApplicationComposition.makeElement({
  ...invalidApplicationImplementation,
  container: null,
  view: applicationInputView,
})

// @ts-expect-error Application Composition no longer carries a render helper.
InvalidApplicationComposition.render

// @ts-expect-error A plain view helper cannot complete an Application as its branded view.
InvalidApplicationComposition.makeElement({
  ...invalidApplicationImplementation,
  container: null,
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

const provisionContractProgram = InvalidApplicationComposition.makeElement({
  ...invalidApplicationImplementation,
  container: null,
  view: invalidElementView,
})
const programWithProvisionContract = provisionContractProgram.provide(
  DeclarationProvisionContract.layer,
)

// @ts-expect-error A later provider cannot output a conflicting handler contract.
programWithProvisionContract.provide(ConflictingProvisionContract.layer)

// @ts-expect-error A later provider cannot require a conflicting handler contract.
programWithProvisionContract.provide(RequiresConflictingProvisionContract)

// @ts-expect-error Page Applications require a Document view.
InvalidApplicationComposition.makeApplication({
  ...invalidApplicationImplementation,
  container: null,
  view: invalidElementView,
})

// @ts-expect-error Element Applications require an HTML view.
InvalidApplicationComposition.makeElement({
  ...invalidApplicationImplementation,
  container: null,
  view: invalidDocumentView,
})

const requiredContextUpdate = InvalidApplicationComposition.makeUpdate(
  (model, _message, requiredContext: string) => {
    void requiredContext
    return { model }
  },
)

// @ts-expect-error Application update cannot require root dispatch context.
InvalidApplicationComposition.makeElement({
  ...invalidApplicationImplementation,
  update: requiredContextUpdate,
  container: null,
  view: invalidElementView,
})

const WiderMessage = defineMessageUnion({
  // eslint-disable-next-line foldkit/got-prefix-requires-block-payload
  GotChildMessage: { message: ChildMessage },
  RequestedRefresh: {},
  RequestedExtraWork: {},
})
const WiderMessageApplication = (() => {
  const Application = defineApplication({
    Model: ParentModel,
    Message: WiderMessage,
  })

  return Application
})()
const WiderMessageComposition = WiderMessageApplication.makeComposition()
const widerMessageUpdate = WiderMessageComposition.makeUpdate(
  (model, _message): Update.Return<ParentModel, ParentMessage> => ({ model }),
)

// @ts-expect-error Application update must accept exactly the root Message.
InvalidApplicationComposition.makeElement({
  ...invalidApplicationImplementation,
  update: widerMessageUpdate,
  container: null,
  view: invalidElementView,
})

const WiderInputModel = Schema.Struct({})
const WiderInputModelApplication = (() => {
  const Application = defineApplication({
    Model: WiderInputModel,
    Message: ParentMessage,
  })

  return Application
})()
const WiderInputModelComposition = WiderInputModelApplication.makeComposition()
const widerModelUpdate = WiderInputModelComposition.makeUpdate(
  (_model, _message): Update.Return<ParentModel, ParentMessage> => ({
    model: ParentModel.make({ child: ChildBlock.Model.make({ value: 0 }) }),
  }),
)

// @ts-expect-error Application update must accept exactly the root Model.
InvalidApplicationComposition.makeElement({
  ...invalidApplicationImplementation,
  update: widerModelUpdate,
  container: null,
  view: invalidElementView,
})

// oxlint-disable-next-line effecttsgo/floating-effect
Server.renderToString(
  InvalidApplicationComposition,
  // @ts-expect-error Server rendering requires a page-owning Document view.
  { ...invalidApplicationImplementation, view: invalidElementView },
  { isHydratable: false },
)

// @ts-expect-error Early Block IDs cannot contain a scoped identity separator.
Block.define('Invalid::EarlyBlock').define
// @ts-expect-error Typed Block IDs cannot contain a scoped identity separator.
Block.define('Invalid::TypedBlock', {
  Model: ParentModel,
  Message: ParentMessage,
})

const DeclarationTestsConstructor = Block.define('DeclarationTestsConstructor')
const ConstructorMessage = defineMessageUnion({ CompletedWork: {} })
const ForeignPrimitiveMessage = defineMessageUnion({ ForeignCompleted: {} })

const DeclarationTestsTypedPrimitiveOwner = Block.define(
  'DeclarationTestsTypedPrimitiveOwner',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)

DeclarationTestsTypedPrimitiveOwner.command('ForeignCommand', {
  // @ts-expect-error A typed Block Command must produce its owner's Message.
  messages: [ForeignPrimitiveMessage.ForeignCompleted],
})
DeclarationTestsTypedPrimitiveOwner.mount('ForeignMount', {
  // @ts-expect-error A typed Block Mount must produce its owner's Message.
  messages: [ForeignPrimitiveMessage.ForeignCompleted],
})
DeclarationTestsTypedPrimitiveOwner.mountStream('ForeignMountStream', {
  // @ts-expect-error A typed Block stream Mount must produce its owner's Message.
  messages: [ForeignPrimitiveMessage.ForeignCompleted],
})

const TypedPrimitiveApplication = (() => {
  const Application = defineApplication({
    Model: ParentModel,
    Message: ParentMessage,
  })

  return Application
})()

TypedPrimitiveApplication.command('ForeignApplicationCommand', {
  // @ts-expect-error A root Command must produce the Application Message.
  messages: [ForeignPrimitiveMessage.ForeignCompleted],
})
TypedPrimitiveApplication.mount('ForeignApplicationMount', {
  // @ts-expect-error A root Mount must produce the Application Message.
  messages: [ForeignPrimitiveMessage.ForeignCompleted],
})
TypedPrimitiveApplication.mountStream('ForeignApplicationMountStream', {
  // @ts-expect-error A root stream Mount must produce the Application Message.
  messages: [ForeignPrimitiveMessage.ForeignCompleted],
})

// @ts-expect-error Owned primitive names cannot contain a scoped identity separator.
DeclarationTestsConstructor.command('Invalid::Work', {
  messages: [ConstructorMessage.CompletedWork],
})

const HostWork = DeclarationTestsConstructor.command('HostWork', {
  messages: [ConstructorMessage.CompletedWork],
})

DeclarationTestsConstructor.command('InvalidConstructedWork', {
  messages: [ConstructorMessage.CompletedWork],
  // @ts-expect-error Foldkit handlers are unavailable while another handler is constructed.
  handler: function* () {
    yield* HostWork().effect

    return () => Effect.succeed(ConstructorMessage.CompletedWork())
  },
})

// @ts-expect-error A replacement Layer must preserve the Block's exact handler outputs.
ChildBlock.replaceEffectsLayer(Layer.empty)

const ForeignParentMessage = defineMessageUnion({ ReceivedChildMessage: {} })
const ExtraParentMessage = defineMessageUnion({
  // eslint-disable-next-line foldkit/got-prefix-requires-block-payload
  GotChildMessage: { message: ChildMessage, requestId: Schema.String },
})
const WrongChildParentMessage = defineMessageUnion({
  // eslint-disable-next-line foldkit/got-prefix-requires-block-payload
  GotChildMessage: { message: Schema.String },
})

const DeclarationTestsForeignParent = Block.define(
  'DeclarationTestsForeignParent',
  {
    Model: ParentModel,
    Message: ForeignParentMessage,
  },
)
const ForeignParent = DeclarationTestsForeignParent
const ForeignChildBinding = ForeignParent.bindChild(ChildBlock, {
  placement: 'foreign-child',
  read: model => Option.some(model.child),
  write: (_model, nextChild) => ParentModel.make({ child: nextChild }),
  toParentMessage: () => ForeignParentMessage.ReceivedChildMessage(),
  fromParentMessage: false,
})

const DeclarationTestsBindingParent = Block.define(
  'DeclarationTestsBindingParent',
  {
    Model: ParentModel,
    Message: ParentMessage,
  },
)
const BindingParent = DeclarationTestsBindingParent

BindingParent.bindChild(ChildBlock, {
  // @ts-expect-error Invalid Message mapping prevents the direct overload.
  field: 'child',
  // @ts-expect-error A parent Message constructor is exclusive with a custom mapper.
  parentMessage: ParentMessage.GotChildMessage,
  // @ts-expect-error A parent Message constructor is exclusive with a custom mapper.
  toParentMessage: (message: ChildMessage) =>
    ParentMessage.GotChildMessage({ message }),
})

const DeclarationTestsWrongChildParent = Block.define(
  'DeclarationTestsWrongChildParent',
  {
    Model: ParentModel,
    Message: WrongChildParentMessage,
  },
)
const WrongChildParent = DeclarationTestsWrongChildParent
WrongChildParent.bindChild(ChildBlock, {
  // @ts-expect-error Invalid Message mapping prevents the direct overload.
  field: 'child',
  // @ts-expect-error A parent Message constructor must accept this Block's Message.
  parentMessage: WrongChildParentMessage.GotChildMessage,
})

const DeclarationTestsExtraParent = Block.define(
  'DeclarationTestsExtraParent',
  {
    Model: ParentModel,
    Message: ExtraParentMessage,
  },
)
const ExtraParent = DeclarationTestsExtraParent
ExtraParent.bindChild(ChildBlock, {
  // @ts-expect-error Invalid Message mapping prevents the direct overload.
  field: 'child',
  // @ts-expect-error A parent Message constructor cannot require fields beyond the child Message.
  parentMessage: ExtraParentMessage.GotChildMessage,
})

BindingParent.bindChild(ChildBlock, {
  // @ts-expect-error A keyed Binding cannot also declare a canonical static Message mapper.
  placement: 'children',
  // @ts-expect-error A keyed Binding cannot also declare a canonical static Message mapper.
  readAll: (model: ParentModel) => [model.child],
  // @ts-expect-error A keyed Binding cannot also declare a canonical static Message mapper.
  key: (): 'only' => 'only',
  // @ts-expect-error A keyed Binding cannot also declare a canonical static Message mapper.
  read: (childModel: ChildModel) => childModel,
  // @ts-expect-error A keyed Binding cannot also declare a canonical static Message mapper.
  writeAt: (_model: ParentModel, _key: 'only', nextChild: ChildModel) =>
    ParentModel.make({ child: nextChild }),
  // @ts-expect-error A keyed Binding cannot also declare a canonical static Message mapper.
  toParentMessage: (_key: 'only', message: ChildMessage) =>
    ParentMessage.GotChildMessage({ message }),
  // @ts-expect-error Keyed Bindings do not accept the static parentMessage shorthand.
  parentMessage: ParentMessage.GotChildMessage,
})

const DeclarationTestsInvalidParent = Block.define(
  'DeclarationTestsInvalidParent',
).define({
  Model: ParentModel,
  Message: ParentMessage,
})
// @ts-expect-error Registered child bindings must use the definition's parent Message.
DeclarationTestsInvalidParent.makeComposition({
  childBindings: [ForeignChildBinding],
})

const DeclarationTestsOmittedChild = Block.define(
  'DeclarationTestsOmittedChild',
).define({
  Model: ParentModel,
  Message: ParentMessage,
})

Block.define('DeclarationTestsInvalidDirectContracts', {
  Model: ParentModel,
  Message: ParentMessage,
  // @ts-expect-error Graph registrations belong to the Composition stage.
  childBindings: [ChildBinding],
})

const DeclarationTestsOmittedChildComposition =
  DeclarationTestsOmittedChild.makeComposition()
const omittedChildUpdate = DeclarationTestsOmittedChildComposition.makeUpdate(
  (model, message) =>
    ParentMessage.match(message, {
      // @ts-expect-error A Composition callback cannot invoke an unregistered child operation.
      GotChildMessage: ({ message }) => ChildBinding.fold(model, message),
      RequestedRefresh: () => ({ model }),
    }),
)

DeclarationTestsOmittedChildComposition.makeBlock({
  init: DeclarationTestsOmittedChildComposition.makeInit(() => ({
    model: ParentModel.make({ child: ChildBlock.Model.make({ value: 0 }) }),
  })),
  update: omittedChildUpdate,
  // @ts-expect-error Completion retains evidence from the rejected child operation.
  EffectsLayer: Layer.empty,
})

const DeclarationTestsOmittedInitChild = Block.define(
  'DeclarationTestsOmittedInitChild',
  {
    Model: ChildBlock.Model,
    Message: ParentMessage,
  },
)
const OmittedInitChildBinding = DeclarationTestsOmittedInitChild.bindChild(
  ChildBlock,
  {
    placement: 'omitted-init-child',
    read: model => Option.some(model),
    write: (_model, nextChild) => nextChild,
    parentMessage: ParentMessage.GotChildMessage,
  },
)
const DeclarationTestsOmittedInitChildComposition =
  DeclarationTestsOmittedInitChild.makeComposition()
const omittedChildInit = DeclarationTestsOmittedInitChildComposition.makeInit(
  () =>
    OmittedInitChildBinding.init({
      args: [],
      toParentModel: child => child,
    }),
)

DeclarationTestsOmittedInitChildComposition.makeBlock({
  init: omittedChildInit,
  update: DeclarationTestsOmittedInitChildComposition.makeUpdate(model => ({
    model,
  })),
  // @ts-expect-error A Block initializer cannot use an unregistered child Binding.
  EffectsLayer: Layer.empty,
})

ParentMessage.match<Update.Return<ParentModel, ParentMessage>>(
  ParentMessage.GotChildMessage({
    message: ChildMessage.RequestedRead(),
  }),
  {
    GotChildMessage: () =>
      // @ts-expect-error An explicit plain Return cannot erase child registration evidence.
      ChildBinding.init({
        args: [],
        toParentModel: child => ParentModel.make({ child }),
      }),
    RequestedRefresh: () => ({
      model: ParentModel.make({ child: ChildBlock.Model.make({ value: 0 }) }),
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
completedRefinedChoice.expose.finish(refinedModel, 'Three')

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

const DeclarationTestsInvalidView = Block.define(
  'DeclarationTestsInvalidView',
).define({
  Model: ParentModel,
  Message: ParentMessage,
})
const DeclarationTestsInvalidViewComposition =
  DeclarationTestsInvalidView.makeComposition({ childBindings: [ChildBinding] })

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

DisclosuresComposition.makeUpdate(
  // @ts-expect-error A graphless Block still rejects incompatible Record values.
  (model, { id }) => ({ model: Record.set(model, id, 'invalid') }),
)
RecordApplicationComposition.makeUpdate(
  // @ts-expect-error A graphless Application still rejects incompatible Record values.
  (model, { id }) => ({ model: Record.set(model, id, 'invalid') }),
)
