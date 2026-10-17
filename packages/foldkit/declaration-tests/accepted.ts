import { Context, Effect, Layer, Option, Record, Schema } from 'effect'
import { defineApplication } from 'foldkit'
import {
  type Application as ApplicationProgram,
  type Element as ElementProgram,
} from 'foldkit/application'
import * as Block from 'foldkit/block'
import * as Command from 'foldkit/command'
import { Server } from 'foldkit/experimental'
import { defineMessageUnion } from 'foldkit/message'
import * as Port from 'foldkit/port'
import * as Update from 'foldkit/update'
import type { Url } from 'foldkit/url'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export class Clock extends Context.Service<
  Clock,
  Readonly<{ now: Effect.Effect<number> }>
>()('DeclarationTestsClock') {}

const DeclarationTestsChild = Block.define('DeclarationTestsChild')

// eslint-disable-next-line foldkit/block-name-matches-variable
const SingleColonOwner = Block.define('DeclarationTests:SingleColon')
// eslint-disable-next-line foldkit/block-name-matches-variable
export const SingleColonBlock = SingleColonOwner.define({
  Model: Schema.Struct({ value: Schema.Number }),
  Message: defineMessageUnion({ RequestedWork: {} }),
})

export const ChildModel = Schema.Struct({ value: Schema.Number })
export type ChildModel = typeof ChildModel.Type

export const ChildMessage = defineMessageUnion({
  RequestedRead: {},
  CompletedRead: { value: Schema.Number },
  CompletedMeasure: { height: Schema.Number },
})
export type ChildMessage = typeof ChildMessage.Type

const handlerConstruction: Effect.Effect<void, 'HandlerUnavailable'> =
  Effect.void

export const ReadCount = DeclarationTestsChild.command('ReadCount', {
  messages: [ChildMessage.CompletedRead],
  handler: function* () {
    const clock = yield* Clock
    yield* handlerConstruction

    return () =>
      clock.now.pipe(Effect.map(value => ChildMessage.CompletedRead({ value })))
  },
})

export const Measure = DeclarationTestsChild.mount('Measure', {
  messages: [ChildMessage.CompletedMeasure],
  handler: function* () {
    return ({ element }) =>
      Effect.succeed(
        ChildMessage.CompletedMeasure({
          height: element.getBoundingClientRect().height,
        }),
      )
  },
})

// eslint-disable-next-line foldkit/block-name-matches-variable
const Child = DeclarationTestsChild.define({
  Model: ChildModel,
  Message: ChildMessage,
})
export const ChildDefinition = Child
const DeclarationTestsChildComposition = Child.makeComposition({
  mounts: [Measure],
})
export const ChildComposition = DeclarationTestsChildComposition

const childView = ChildComposition.makeView((model, h) =>
  h.div([h.OnMount(Measure())], [globalThis.String(model.value)]),
)

const childUpdate = ChildComposition.makeUpdate((model, message) =>
  ChildMessage.match(message, {
    RequestedRead: () => ({ model, commands: [ReadCount()] }),
    CompletedRead: ({ value }) => ({
      model: ChildModel.make({ value }),
    }),
    CompletedMeasure: () => ({ model }),
  }),
)

const refresh = Child.step(model => ({
  model,
  commands: [ReadCount()],
}))

export const ChildEffectsLayer = Layer.merge(ReadCount.layer, Measure.layer)

type ChildServicesAreExact = Expect<
  Equal<Layer.Services<typeof ChildEffectsLayer>, Clock>
>
type ChildErrorIsExact = Expect<
  Equal<Layer.Error<typeof ChildEffectsLayer>, 'HandlerUnavailable'>
>

export type ChildLayerAssertions = [
  ChildServicesAreExact,
  ChildErrorIsExact,
  CompletedChildIsExact,
]

const childParameterizedInitSource = (
  value: number,
  offset = 0,
  ...increments: ReadonlyArray<number>
) => ({
  model: ChildModel.make({
    value: value + offset + increments.length,
  }),
  value,
})

const makeChildInitSource =
  <Value extends number>(value: Value) =>
  (offset = 0, ...increments: ReadonlyArray<number>) => ({
    model: ChildModel.make({
      value: value + offset + increments.length,
    }),
    value,
  })

const childLiteralInitSource = makeChildInitSource(1)

function overloadedChildInitSource(value: number): { model: ChildModel }
function overloadedChildInitSource(value: string): { model: ChildModel }
function overloadedChildInitSource(_value: number | string) {
  return { model: ChildModel.make({ value: 0 }) }
}

export const childParameterizedInit = ChildComposition.makeInit(
  childParameterizedInitSource,
)
export const childLiteralInit = ChildComposition.makeInit(
  childLiteralInitSource,
)
export const wrappedOverloadedChildInit = ChildComposition.makeInit(
  (value: string) => overloadedChildInitSource(value),
)
export const childInit = ChildComposition.makeInit(() => ({
  model: ChildModel.make({ value: 0 }),
  commands: [ReadCount()],
}))

type ChildInitParametersAreExact = Expect<
  Equal<
    Parameters<typeof childParameterizedInit>,
    Parameters<typeof childParameterizedInitSource>
  >
>
type ChildLiteralInitParametersAreExact = Expect<
  Equal<
    Parameters<typeof childLiteralInit>,
    Parameters<typeof childLiteralInitSource>
  >
>
type ChildLiteralInitModelIsExact = Expect<
  Equal<ReturnType<typeof childLiteralInit>['model'], ChildModel>
>
type WrappedOverloadedChildInitParametersAreExact = Expect<
  Equal<Parameters<typeof wrappedOverloadedChildInit>, [value: string]>
>
type ChildInitRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof childInit>,
    Command.HandlerOf<typeof ReadCount>
  >
>

const childImplementation = {
  init: childInit,
  update: childUpdate,
  view: childView,
  expose: { refresh },
  EffectsLayer: ChildEffectsLayer,
}

export type CompletedChild = Block.Completed<
  typeof ChildComposition,
  typeof childImplementation
>

export const ChildBlock = ChildComposition.makeBlock(childImplementation)

type CompletedChildIsExact = Expect<Equal<CompletedChild, typeof ChildBlock>>

export type ChildInitAssertions = [
  ChildInitParametersAreExact,
  ChildLiteralInitParametersAreExact,
  ChildLiteralInitModelIsExact,
  WrappedOverloadedChildInitParametersAreExact,
  ChildInitRequirementsAreExact,
]

export const DirectModel = Schema.Struct({ value: Schema.Number })
export type DirectModel = typeof DirectModel.Type

export const DirectMessage = defineMessageUnion({
  RequestedReadDirectValue: {},
  CompletedReadDirectValue: { value: Schema.Number },
})
export type DirectMessage = typeof DirectMessage.Type

const DeclarationTestsDirect = Block.define('DeclarationTestsDirect', {
  Model: DirectModel,
  Message: DirectMessage,
})
const DeclarationTestsDirectComposition =
  DeclarationTestsDirect.makeComposition({})

export const ReadDirectValue = DeclarationTestsDirect.command(
  'ReadDirectValue',
  {
    messages: [DirectMessage.CompletedReadDirectValue],
    handler: function* () {
      const clock = yield* Clock

      return () =>
        clock.now.pipe(
          Effect.map(value =>
            DirectMessage.CompletedReadDirectValue({ value }),
          ),
        )
    },
  },
)

export const ObserveDirectValue = DeclarationTestsDirect.mount(
  'ObserveDirectValue',
  {
    messages: [DirectMessage.CompletedReadDirectValue],
  },
)

export const StreamDirectValue = DeclarationTestsDirect.mountStream(
  'StreamDirectValue',
  {
    messages: [DirectMessage.CompletedReadDirectValue],
  },
)

export const directUpdate = DeclarationTestsDirectComposition.makeUpdate(
  (model, message) =>
    DirectMessage.match(message, {
      RequestedReadDirectValue: () => ({
        model,
        commands: [ReadDirectValue()],
      }),
      CompletedReadDirectValue: ({ value }) => ({
        model: DirectModel.make({ value }),
      }),
    }),
)

export const refreshDirectValue = DeclarationTestsDirect.step(model => ({
  model,
  commands: [ReadDirectValue()],
}))

export const Direct = DeclarationTestsDirectComposition.makeBlock({
  init: DeclarationTestsDirectComposition.makeInit(() => ({
    model: DirectModel.make({ value: 0 }),
  })),
  update: directUpdate,
  expose: { refreshDirectValue },
  EffectsLayer: ReadDirectValue.layer,
})

const DeclarationTestsPure = Block.define('DeclarationTestsPure', {
  Model: DirectModel,
  Message: DirectMessage,
})
export const PureDefinition = DeclarationTestsPure
const DeclarationTestsPureComposition = DeclarationTestsPure.makeComposition()
export const PureComposition = DeclarationTestsPureComposition
const pureImplementation = {
  init: DeclarationTestsPureComposition.makeInit(() => ({
    model: DirectModel.make({ value: 0 }),
  })),
  update: DeclarationTestsPureComposition.makeUpdate((model, _message) => ({
    model,
  })),
}

export type CompletedPure = Block.Completed<
  typeof PureComposition,
  typeof pureImplementation
>

export const Pure = PureComposition.makeBlock(pureImplementation)

type CompletedPureIsExact = Expect<Equal<CompletedPure, typeof Pure>>

export type PureCompletionAssertion = CompletedPureIsExact

export const ParentModel = Schema.Struct({ child: ChildModel })
export type ParentModel = typeof ParentModel.Type

export const ParentMessage = defineMessageUnion({
  // eslint-disable-next-line foldkit/got-prefix-requires-block-payload
  GotChildMessage: { message: ChildMessage },
  RequestedRefresh: {},
})
export type ParentMessage = typeof ParentMessage.Type

const DeclarationTestsDirectInit = Block.define('DeclarationTestsDirectInit', {
  Model: ChildModel,
  Message: ParentMessage,
})
export const DirectInitChildBinding = DeclarationTestsDirectInit.bindChild(
  ChildBlock,
  {
    placement: 'direct-init-child',
    read: model => Option.some(model),
    write: (_model, nextChild) => nextChild,
    parentMessage: ParentMessage.GotChildMessage,
  },
)
const DeclarationTestsDirectInitComposition =
  DeclarationTestsDirectInit.makeComposition({
    childBindings: [DirectInitChildBinding],
  })
export const directResultInit = DeclarationTestsDirectInitComposition.makeInit(
  () =>
    DirectInitChildBinding.init({
      args: [],
      toParentModel: child => child,
    }),
)
const directInitUpdate = DeclarationTestsDirectInitComposition.makeUpdate(
  model => ({ model }),
)
export const DirectInitBlock = DeclarationTestsDirectInitComposition.makeBlock({
  init: directResultInit,
  update: directInitUpdate,
})

type DirectResultInitEvidenceIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof directResultInit>>,
    Block.BindingRequirement<'direct-init-child', typeof ChildBlock>
  >
>
type DirectResultInitRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof directResultInit>,
    Block.Scoped<'direct-init-child', Command.HandlerOf<typeof ReadCount>>
  >
>

export type DirectResultInitAssertions = [
  DirectResultInitEvidenceIsExact,
  DirectResultInitRequirementsAreExact,
]

const DeclarationTestsParent = Block.define('DeclarationTestsParent').define({
  Model: ParentModel,
  Message: ParentMessage,
})

export const ChildBinding = DeclarationTestsParent.bindChild(ChildBlock, {
  placement: 'child',
  read: model => Option.some(model.child),
  write: (_model, nextChild) => ParentModel.make({ child: nextChild }),
  parentMessage: ParentMessage.GotChildMessage,
  fromParentMessage: false,
})

export const DirectChildBinding = DeclarationTestsParent.bindChild(ChildBlock, {
  field: 'child',
  parentMessage: ParentMessage.GotChildMessage,
  fromParentMessage: false,
  init: false,
})

export const childInspection = Block.inspectBinding(ChildBinding)

type DirectPlacementIsExact = Expect<
  Equal<typeof DirectChildBinding.placement, 'child'>
>

type BoundRefreshRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<ReturnType<typeof ChildBinding.refresh>>,
    Block.Scoped<'child', Command.HandlerOf<typeof ReadCount>>
  >
>
type BoundRefreshEvidenceIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<ReturnType<typeof ChildBinding.refresh>>
    >,
    Block.BindingRequirement<'child', typeof ChildBlock>
  >
>
type ChildBindingStringKeysAreExact = Expect<
  Equal<
    Extract<keyof typeof ChildBinding, string>,
    'placement' | 'init' | 'fold' | 'embedView' | 'refresh'
  >
>
type ChildInspectionServicesAreExact = Expect<
  Equal<Layer.Services<typeof childInspection.EffectsLayer>, Clock>
>
type ChildInspectionErrorIsExact = Expect<
  Equal<Layer.Error<typeof childInspection.EffectsLayer>, 'HandlerUnavailable'>
>
type ChildInspectionMountsAreExact = Expect<
  Equal<(typeof childInspection.mounts)[number], typeof Measure>
>

export const ObserveParent = DeclarationTestsParent.mount('ObserveParent', {
  messages: [ParentMessage.RequestedRefresh],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.RequestedRefresh())
  },
})
const DeclarationTestsParentComposition =
  DeclarationTestsParent.makeComposition({
    childBindings: [ChildBinding],
    mounts: [ObserveParent],
  })
export const ParentComposition = DeclarationTestsParentComposition
export type ParentViewBuilder = Block.ViewBuilderFor<typeof ParentComposition>

export const ParentDefinition = DeclarationTestsParent
export const parentView = ParentComposition.makeView((model, h) =>
  h.div(
    [h.OnMount(ObserveParent())],
    [h.block(ChildBinding.embedView({ slotId: 'child', model: model.child }))],
  ),
)

export const parentModelViewHelper = (
  model: ParentModel,
  h: ParentViewBuilder,
) =>
  h.div(
    [h.OnClick(ParentMessage.RequestedRefresh()), h.OnMount(ObserveParent())],
    [h.block(ChildBinding.embedView({ slotId: 'child', model: model.child }))],
  )

export const parentBuilderViewHelper = (h: ParentViewBuilder) =>
  h.div([h.OnMount(ObserveParent())])

export const parentInputViewHelper = (
  childModel: ChildModel,
  h: ParentViewBuilder,
) =>
  h.block(ChildBinding.embedView({ slotId: 'child-input', model: childModel }))

export const parentArrayViewHelper = (
  labels: ReadonlyArray<string>,
  h: ParentViewBuilder,
) => labels.map(label => h.span([], [label]))

export const parentUpdate = ParentComposition.makeUpdate((model, message) =>
  ParentMessage.match(message, {
    GotChildMessage: ({ message }) => ChildBinding.fold(model, message),
    RequestedRefresh: () => ChildBinding.refresh()(model),
  }),
)

const refreshChild = DeclarationTestsParent.step(() => ChildBinding.refresh())

export const RefreshContext = Schema.Struct({
  source: Schema.Literals(['Manual']),
})
export type RefreshContext = typeof RefreshContext.Type

export const contextualRefreshChild = DeclarationTestsParent.step(
  (_model, _context?: RefreshContext) => ChildBinding.refresh(),
)

export const Parent = ParentComposition.makeBlock({
  init: ParentComposition.makeInit(() =>
    ChildBinding.init({
      args: [],
      toParentModel: child => ParentModel.make({ child }),
    }),
  ),
  update: parentUpdate,
  view: parentView,
  expose: { refreshChild },
  EffectsLayer: ObserveParent.layer,
})

type ParentServicesAreExact = Expect<
  Equal<Layer.Services<typeof Parent.EffectsLayer>, Clock>
>
type ParentErrorIsExact = Expect<
  Equal<Layer.Error<typeof Parent.EffectsLayer>, 'HandlerUnavailable'>
>

export type ParentAssertions = [
  BoundRefreshRequirementsAreExact,
  BoundRefreshEvidenceIsExact,
  ChildBindingStringKeysAreExact,
  ChildInspectionServicesAreExact,
  ChildInspectionErrorIsExact,
  ChildInspectionMountsAreExact,
  DirectPlacementIsExact,
  ParentServicesAreExact,
  ParentErrorIsExact,
]

const DeclarationTestsChoice = Block.define('DeclarationTestsChoice')

const makeChoiceParts = <const Values extends ReadonlyArray<string>>(
  Value: Schema.Literals<Values>,
) => {
  type Value = Values[number]
  const Model = Schema.Struct({ value: Value })
  const Message = Schema.TaggedStruct('SelectedValue', { value: Value })
  const OutMessage = Schema.TaggedStruct('SelectedValue', { value: Value })
  // eslint-disable-next-line foldkit/block-name-matches-variable
  const definition = DeclarationTestsChoice.define({
    Model,
    Message,
    OutMessage,
  })
  const finish = definition.step((_model, value: Value) => ({
    model: Model.make({ value }),
    outMessage: OutMessage.make({ value }),
  }))
  const DeclarationTestsChoiceComposition = definition.makeComposition()

  const implementation = {
    init: DeclarationTestsChoiceComposition.makeInit(
      (value: Values[number]) => ({
        model: Model.make({ value }),
      }),
    ),
    update: DeclarationTestsChoiceComposition.makeUpdate((_model, message) => ({
      model: Model.make({ value: message.value }),
      outMessage: OutMessage.make({ value: message.value }),
    })),
    expose: { finish },
    EffectsLayer: Layer.empty,
  }

  return {
    composition: DeclarationTestsChoiceComposition,
    implementation,
  }
}

type ChoiceParts<Values extends ReadonlyArray<string>> = ReturnType<
  typeof makeChoiceParts<Values>
>

export type CompletedChoice<Values extends ReadonlyArray<string>> =
  Block.Completed<
    ChoiceParts<Values>['composition'],
    ChoiceParts<Values>['implementation']
  >

const makeChoice = <const Values extends ReadonlyArray<string>>(
  Value: Schema.Literals<Values>,
): CompletedChoice<Values> => {
  const { composition, implementation } = makeChoiceParts(Value)

  return composition.makeBlock(implementation)
}

export const RefinedChoice = makeChoice(Schema.Literals(['One', 'Two']))
export type RefinedChoiceModel = typeof RefinedChoice.Model.Type
export type RefinedChoiceMessage = typeof RefinedChoice.Message.Type
export type RefinedChoiceOutMessage = typeof RefinedChoice.OutMessage.Type

type RefinedValueIsExact = Expect<
  Equal<RefinedChoiceOutMessage['value'], 'One' | 'Two'>
>
type CompletedChoiceIsExact = Expect<
  Equal<CompletedChoice<readonly ['One', 'Two']>, typeof RefinedChoice>
>

const ChoiceParentModel = Schema.Struct({ choice: RefinedChoice.Model })
type ChoiceParentModel = typeof ChoiceParentModel.Type
const DeclarationTestsChoiceParent = Block.define(
  'DeclarationTestsChoiceParent',
  {
    Model: ChoiceParentModel,
    Message: RefinedChoice.Message,
    OutMessage: RefinedChoice.OutMessage,
  },
)
const ChoiceParent = DeclarationTestsChoiceParent

export const RefinedChoiceBinding = ChoiceParent.bindChild(RefinedChoice, {
  placement: 'refined-choice',
  read: model => Option.some(model.choice),
  write: (_model, nextChoice) => ChoiceParentModel.make({ choice: nextChoice }),
  toParentMessage: message => message,
  fromParentMessage: false,
  outMessage: {
    fold: outMessage => ChoiceParent.step(model => ({ model, outMessage })),
  },
})

type RefinedFoldIsExact = Expect<
  Equal<
    ReturnType<typeof RefinedChoiceBinding.fold>,
    Update.ResultRecipe<
      ChoiceParentModel,
      RefinedChoiceMessage,
      RefinedChoiceOutMessage,
      never,
      Block.RequirementOfBinding<typeof RefinedChoiceBinding>
    >
  >
>

export type RefinedAssertions = [
  RefinedValueIsExact,
  RefinedFoldIsExact,
  CompletedChoiceIsExact,
]

const ClockLayer = Layer.succeed(Clock, { now: Effect.succeed(1) })

export class ProvisionDependency extends Context.Service<
  ProvisionDependency,
  Readonly<{ value: number }>
>()('DeclarationTestsProvisionDependency') {}

export class ProvisionExtra extends Context.Service<
  ProvisionExtra,
  Readonly<{ value: number }>
>()('DeclarationTestsProvisionExtra') {}

export const ProvisionDependencyLayer = Layer.succeed(ProvisionDependency, {
  value: 2,
})

const ClockAndExtraLayer = Layer.merge(
  Layer.effect(
    Clock,
    Effect.map(ProvisionDependency, ({ value }) => ({
      now: Effect.succeed(value),
    })),
  ),
  Layer.effect(
    ProvisionExtra,
    Effect.map(ProvisionDependency, ({ value }) => ({ value: value + 1 })),
  ),
)

const ProvisionFlags = Schema.Struct({ initialValue: Schema.Number })
export type ProvisionFlags = typeof ProvisionFlags.Type

export const provisionPorts = {
  inbound: { valueChanged: Port.inbound(Schema.String) },
  outbound: { valueRead: Port.outbound(Schema.Number) },
}

const Application = defineApplication({
  Model: ParentModel,
  Message: ParentMessage,
})
const PureApplication = Application
export const ApplicationDefinition = Application
export const PureApplicationComposition = PureApplication.makeComposition()
const preserveFunction = <Args extends ReadonlyArray<unknown>, ReturnValue>(
  fn: (...args: Args) => ReturnValue,
) => ({ fn })
const wrappedPureUpdate = preserveFunction(
  (
    model: ParentModel,
    message: ParentMessage,
  ): Update.Return<ParentModel, ParentMessage> => {
    void message
    return { model }
  },
)
export const pureInit = PureApplicationComposition.makeInit(() => ({
  model: ParentModel.make({ child: ChildBlock.Model.make({ value: 0 }) }),
}))
const pureElementView = PureApplicationComposition.makeView((_model, h) =>
  h.main([]),
)
const pureDocumentView = PureApplicationComposition.makeView((_model, h) => ({
  title: 'Pure application',
  body: h.main([]),
}))
const pureElementProgram: ElementProgram<undefined, never, never, never> =
  PureApplicationComposition.makeElement({
    container: null,
    init: pureInit,
    update: PureApplicationComposition.makeUpdate(wrappedPureUpdate.fn),
    view: pureElementView,
  })
const purePageProgram: ApplicationProgram<
  undefined,
  void,
  never,
  never,
  never
> = PureApplicationComposition.makeApplication({
  container: null,
  init: pureInit,
  update: PureApplicationComposition.makeUpdate(wrappedPureUpdate.fn),
  view: pureDocumentView,
})
void pureElementProgram
void purePageProgram
export const ReadApplicationValue = Application.command(
  'ReadApplicationValue',
  {
    messages: [ParentMessage.RequestedRefresh],
  },
)
export const ObserveApplicationValue = Application.mount(
  'ObserveApplicationValue',
  {
    messages: [ParentMessage.RequestedRefresh],
  },
)
export const StreamApplicationValue = Application.mountStream(
  'StreamApplicationValue',
  {
    messages: [ParentMessage.RequestedRefresh],
  },
)
export const ApplicationComposition = Application.makeComposition({
  childBindings: [DirectChildBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
const applicationElementView = ApplicationComposition.makeView((model, h) =>
  h.block(
    DirectChildBinding.embedView({ slotId: 'child', model: model.child }),
  ),
)
const applicationDocumentView = ApplicationComposition.makeView((model, h) => ({
  title: 'Declaration test',
  body: h.block(
    DirectChildBinding.embedView({ slotId: 'child', model: model.child }),
  ),
}))
export const applicationModelViewHelper = (
  model: ParentModel,
  h: ApplicationViewBuilder,
) =>
  h.block(
    DirectChildBinding.embedView({
      slotId: 'application-child',
      model: model.child,
    }),
  )
export const applicationBuilderViewHelper = (h: ApplicationViewBuilder) =>
  h.main([])
export const applicationInputViewHelper = (
  childModel: ChildModel,
  h: ApplicationViewBuilder,
) =>
  h.block(
    DirectChildBinding.embedView({
      slotId: 'application-input-child',
      model: childModel,
    }),
  )
const applicationUpdate = ApplicationComposition.makeUpdate((model, message) =>
  ParentMessage.match(message, {
    GotChildMessage: ({ message }) => DirectChildBinding.fold(model, message),
    RequestedRefresh: () => DirectChildBinding.refresh()(model),
  }),
)

const applicationInit = ApplicationComposition.makeInit(() =>
  DirectChildBinding.init({
    args: [],
    toParentModel: child => ParentModel.make({ child }),
  }),
)

type ApplicationInitEvidenceIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof applicationInit>>,
    Block.BindingRequirement<'child', typeof ChildBlock>
  >
>

const applicationImplementation = {
  init: applicationInit,
  update: applicationUpdate,
  EffectsLayer: Layer.empty,
}

export const provisionRoutingInit = PureApplicationComposition.makeInit(
  (flags: ProvisionFlags, _url: Url) => ({
    model: ParentModel.make({
      child: ChildBlock.Model.make({ value: flags.initialValue }),
    }),
  }),
)

const makeInferredProvisionPageAwaitingDependency = (
  container: HTMLElement | null,
) =>
  PureApplicationComposition.makeApplication({
    Flags: ProvisionFlags,
    container,
    init: PureApplicationComposition.makeInit(
      ({ initialValue }: ProvisionFlags) => ({
        model: ParentModel.make({
          child: ChildBlock.Model.make({ value: initialValue }),
        }),
      }),
    ),
    ports: provisionPorts,
    update: PureApplicationComposition.makeUpdate(wrappedPureUpdate.fn),
    view: pureDocumentView,
  }).provide(ClockAndExtraLayer)

type ProvisionPage = ApplicationProgram<
  typeof provisionPorts,
  ProvisionFlags,
  ProvisionDependency,
  never,
  Clock | ProvisionExtra
>

type ProvisionPageIsExact = Expect<
  Equal<
    ReturnType<typeof makeInferredProvisionPageAwaitingDependency>,
    ProvisionPage
  >
>

export const makeProvisionPageAwaitingDependency: (
  container: HTMLElement | null,
) => ProvisionPage = makeInferredProvisionPageAwaitingDependency

const makeInferredProvisionElement = (container: HTMLElement | null) =>
  PureApplicationComposition.makeElement({
    container,
    init: pureInit,
    ports: provisionPorts,
    update: PureApplicationComposition.makeUpdate(wrappedPureUpdate.fn),
    view: pureElementView,
  })
    .provide(ClockAndExtraLayer)
    .provide(ProvisionDependencyLayer)

type ProvisionElement = ElementProgram<
  typeof provisionPorts,
  never,
  never,
  Clock | ProvisionExtra | ProvisionDependency
>

type ProvisionElementIsExact = Expect<
  Equal<ReturnType<typeof makeInferredProvisionElement>, ProvisionElement>
>

export const makeProvisionElement: (
  container: HTMLElement | null,
) => ProvisionElement = makeInferredProvisionElement

type ProvisionAssertions = [ProvisionPageIsExact, ProvisionElementIsExact]
const provisionAssertions: ProvisionAssertions = [true, true]
void provisionAssertions

export const makeProgram = (container: HTMLElement) =>
  ApplicationComposition.makeElement({
    ...applicationImplementation,
    container,
    view: applicationElementView,
  }).provide(ClockLayer)

export const makePageProgram = (container: HTMLElement | null) =>
  ApplicationComposition.makeApplication({
    ...applicationImplementation,
    container,
    view: applicationDocumentView,
  }).provide(ClockLayer)

export const makeRoutedFlagsPage = (container: HTMLElement | null) =>
  PureApplicationComposition.makeApplication({
    Flags: ProvisionFlags,
    container,
    init: provisionRoutingInit,
    routing: {
      onUrlRequest: () => ParentMessage.RequestedRefresh(),
      onUrlChange: () => ParentMessage.RequestedRefresh(),
    },
    update: PureApplicationComposition.makeUpdate(wrappedPureUpdate.fn),
    view: pureDocumentView,
  })

export const renderPage = () =>
  Server.renderToString(
    ApplicationComposition,
    { ...applicationImplementation, view: applicationDocumentView },
    { isHydratable: false },
  )

export type ApplicationInitAssertions = [ApplicationInitEvidenceIsExact]

export const RecordModel = Schema.Record(Schema.String, Schema.Boolean)
export const RecordMessage = defineMessageUnion({
  ToggledDisclosure: { id: Schema.String, isOpen: Schema.Boolean },
})
const Disclosures = Block.define('Disclosures', {
  Model: RecordModel,
  Message: RecordMessage,
})
export const DisclosuresComposition = Disclosures.makeComposition()
export const recordUpdate = DisclosuresComposition.makeUpdate(
  (model, { id, isOpen }) => ({ model: Record.set(model, id, isOpen) }),
)
export const RecordApplicationComposition = (() => {
  const Application = defineApplication({
    Model: RecordModel,
    Message: RecordMessage,
  })
  const ApplicationComposition = Application.makeComposition()

  return ApplicationComposition
})()
export const recordApplicationUpdate = RecordApplicationComposition.makeUpdate(
  (model, { id, isOpen }) => ({ model: Record.set(model, id, isOpen) }),
)
export type ExactRecordBlockModel = Expect<
  Equal<ReturnType<typeof recordUpdate>['model'], typeof RecordModel.Type>
>
export type ExactRecordApplicationModel = Expect<
  Equal<
    ReturnType<typeof recordApplicationUpdate>['model'],
    typeof RecordModel.Type
  >
>
