import {
  Context,
  Effect,
  Layer,
  Option,
  Predicate,
  Schema,
  Tuple,
} from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import { makeDefinition } from './define.js'
import type { InitializationPlan } from './initialization.js'
import { assertRegisteredBinding } from './operationGraph.js'
import * as Block from './public.js'

class ChildClient extends Context.Service<
  ChildClient,
  Readonly<{ readonly label: string }>
>()('InitializationChildClient') {}

class ParentClient extends Context.Service<
  ParentClient,
  Readonly<{ readonly label: string }>
>()('InitializationParentClient') {}

const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type

const ChildMessage = defineMessageUnion({
  RequestedIncrement: {},
  CompletedInitialization: { count: Schema.Number },
  CompletedIncrement: {},
})

const Child = makeDefinition('InitializationChild', {
  Model: ChildModel,
  Message: ChildMessage,
})

const commandEffects = { child: 0, parent: 0 }
const FinishChildInitialization = Child.makeCommand('FinishInitialization', {
  args: { count: Schema.Number },
  messages: [ChildMessage.CompletedInitialization],
  handler: function* () {
    yield* ChildClient
    return ({ count }) =>
      Effect.sync(() => {
        commandEffects.child += 1
        return ChildMessage.CompletedInitialization({ count })
      })
  },
})
const FinishIncrement = Child.makeCommand('FinishIncrement', {
  messages: [ChildMessage.CompletedIncrement],
  handler: function* () {
    return () => Effect.succeed(ChildMessage.CompletedIncrement())
  },
})

const calls: globalThis.Array<string> = []
const single = (value: number): [number] => [value]
const incrementStep = Child.makeStep(model => {
  calls.push('child-step')
  return {
    model: modifyFields(model, { count: count => count + 100 }),
    commands: [FinishIncrement()],
  }
})
const ChildComposition = Child.makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit((count: number) => {
      calls.push(`child-init-${count}`)
      return {
        model: ChildModel.make({ count }),
        commands: [FinishChildInitialization({ count })],
      }
    }),
    update: ChildComposition.makeUpdate({
      RequestedIncrement: model => incrementStep(model),
      CompletedInitialization: (model, { count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
      CompletedIncrement: model => ({ model }),
    }),
    operations: {
      increment: () => Tuple.make(ChildMessage.RequestedIncrement()),
    },
    EffectsLayer: Layer.merge(
      FinishChildInitialization.layer,
      FinishIncrement.layer,
    ),
  })
const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const ParentModel = Schema.Struct({
  first: ChildModel,
  maybeSecond: Schema.Option(ChildModel),
  status: Schema.Literals(['Ready', 'Stepped']),
})
type ParentModel = typeof ParentModel.Type

const ParentMessage = defineMessageUnion({
  CompletedParentInitialization: {},
  CompletedParentStep: {},
})
type ParentMessage = typeof ParentMessage.Type

const Parent = makeDefinition('InitializationParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const FinishParentInitialization = Parent.makeCommand('FinishInitialization', {
  messages: [ParentMessage.CompletedParentInitialization],
  handler: function* () {
    yield* ParentClient
    return () =>
      Effect.sync(() => {
        commandEffects.parent += 1
        return ParentMessage.CompletedParentInitialization()
      })
  },
})
const FinishParentStep = Parent.makeCommand('FinishStep', {
  messages: [ParentMessage.CompletedParentStep],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.CompletedParentStep())
  },
})

type ChildInitContext = Readonly<{
  firstCount: number
  maybeSecondCount: Option.Option<number>
}>

const FirstBinding = Parent.makeBinding(ChildBlock, {
  field: 'first',
  init: {
    contextToArgs: (childInitContext: ChildInitContext) => {
      calls.push('first-selector')
      return single(childInitContext.firstCount)
    },
  },
})
const SecondBinding = Parent.makeBinding(ChildBlock, {
  field: 'maybeSecond',
  init: {
    contextToArgs: (childInitContext: ChildInitContext) => {
      calls.push('second-selector')
      return Option.map(childInitContext.maybeSecondCount, single)
    },
  },
})
const ParentComposition = Parent.makeComposition({
  bindings: [FirstBinding, SecondBinding],
})
const finishParentStep = Parent.makeStep(model => {
  calls.push('parent-step')
  return {
    model: modifyFields(model, { status: () => 'Stepped' }),
    commands: [FinishParentStep()],
  }
})

const init = ParentComposition.makeInit(
  (firstCount: number, maybeSecondCount: Option.Option<number>) => {
    calls.push('plan')
    return {
      childInitContext: { firstCount, maybeSecondCount },
      model: { status: 'Ready' },
      commands: [FinishParentInitialization()],
      steps: [FirstBinding.increment(), finishParentStep],
    }
  },
)

it('preserves exact arguments, complete Model, requirements, and registration evidence', () => {
  const initializeFirst = () =>
    FirstBinding.init({
      args: [1],
      toParentModel: first =>
        ParentModel.make({
          first,
          maybeSecond: Option.none(),
          status: 'Ready',
        }),
    })
  const initializeSecond = () =>
    SecondBinding.init({
      args: [2],
      toParentModel: second =>
        ParentModel.make({
          first: ChildModel.make({ count: 1 }),
          maybeSecond: Option.some(second),
          status: 'Ready',
        }),
    })
  type ExpectedRequirements =
    | Update.RequirementsOf<typeof initializeFirst>
    | Update.RequirementsOf<typeof initializeSecond>
    | Command.HandlerOf<typeof FinishParentInitialization>
    | Update.RequirementsOf<ReturnType<typeof FirstBinding.increment>>
    | Command.HandlerOf<typeof FinishParentStep>
  type ExpectedRegistration =
    | Update.RegistrationEvidenceOf<ReturnType<typeof initializeFirst>>
    | Update.RegistrationEvidenceOf<ReturnType<typeof initializeSecond>>
    | Update.RegistrationEvidenceOf<
        ReturnType<ReturnType<typeof FirstBinding.increment>>
      >

  expectTypeOf<Parameters<typeof init>>().toEqualTypeOf<
    [firstCount: number, maybeSecondCount: Option.Option<number>]
  >()
  expectTypeOf<ReturnType<typeof init>['model']>().toEqualTypeOf<ParentModel>()
  expectTypeOf<
    Update.RequirementsOf<typeof init>
  >().toEqualTypeOf<ExpectedRequirements>()
  expectTypeOf<
    Update.RegistrationEvidenceOf<ReturnType<typeof init>>
  >().toEqualTypeOf<ExpectedRegistration>()
})

it('stays passive, initializes in Binding order, applies Steps sequentially, and does not execute effects', () => {
  calls.splice(0)
  commandEffects.child = 0
  commandEffects.parent = 0

  expect(calls).toEqual([])

  const initialized = init(1, Option.some(2))

  expect(calls).toEqual([
    'plan',
    'first-selector',
    'second-selector',
    'child-init-1',
    'child-init-2',
    'child-step',
    'parent-step',
  ])
  expect(initialized.model).toEqual({
    first: { count: 101 },
    maybeSecond: Option.some({ count: 2 }),
    status: 'Stepped',
  })
  expect(initialized.commands?.map(command => command.name)).toEqual([
    'InitializationParent/FinishInitialization',
    'first/FinishInitialization',
    'maybeSecond/FinishInitialization',
    'first/FinishIncrement',
    'InitializationParent/FinishStep',
  ])
  expect(commandEffects).toEqual({ child: 0, parent: 0 })
})

it('preserves a combined Binding operation and Command-producing Definition Step in init', () => {
  const finishCombinedStep = Parent.makeStep(() =>
    Update.combineSteps([FirstBinding.increment(), finishParentStep]),
  )
  const initializeCombined = ParentComposition.makeInit((count: number) => ({
    childInitContext: {
      firstCount: count,
      maybeSecondCount: Option.none<number>(),
    },
    model: { status: 'Ready' },
    steps: [finishCombinedStep],
  }))

  expectTypeOf<Parameters<typeof initializeCombined>>().toEqualTypeOf<
    [count: number]
  >()
  expectTypeOf<
    ReturnType<typeof initializeCombined>['model']
  >().toEqualTypeOf<ParentModel>()
  expectTypeOf<
    Update.RequirementsOf<typeof initializeCombined>
  >().toEqualTypeOf<
    Exclude<
      Update.RequirementsOf<typeof init>,
      Command.HandlerOf<typeof FinishParentInitialization>
    >
  >()
  expectTypeOf<
    Update.RegistrationEvidenceOf<ReturnType<typeof initializeCombined>>
  >().toEqualTypeOf<Update.RegistrationEvidenceOf<ReturnType<typeof init>>>()

  const initialized = initializeCombined(4)

  expect(initialized.model).toEqual({
    first: { count: 104 },
    maybeSecond: Option.none(),
    status: 'Stepped',
  })
  expect(initialized.commands?.map(command => command.name)).toEqual([
    'first/FinishInitialization',
    'first/FinishIncrement',
    'InitializationParent/FinishStep',
  ])
})

it('skips an optional child and drops its init Commands after a Step removes it', () => {
  const initializeAbsent = ParentComposition.makeInit(() => ({
    childInitContext: {
      firstCount: 3,
      maybeSecondCount: Option.none<number>(),
    },
    model: { status: 'Ready' },
  }))
  const initializeThenRemove = ParentComposition.makeInit(() => ({
    childInitContext: {
      firstCount: 3,
      maybeSecondCount: Option.some(4),
    },
    model: { status: 'Ready' },
    steps: [
      (model: ParentModel) => ({
        model: modifyFields(model, {
          maybeSecond: () => Option.none(),
        }),
      }),
    ],
  }))

  expect(initializeAbsent().model.maybeSecond).toEqual(Option.none())
  expect(initializeAbsent().commands?.map(command => command.name)).toEqual([
    'first/FinishInitialization',
  ])
  expect(initializeThenRemove().commands?.map(command => command.name)).toEqual(
    ['first/FinishInitialization'],
  )
})

it('preserves default and rest parameters for a graphless Composition', () => {
  const PlainModel = Schema.Struct({ count: Schema.Number })

  const PlainComposition = makeDefinition('InitializationPlain', {
    Model: PlainModel,
    Message: Schema.Never,
  }).makeComposition()
  const plainInit = PlainComposition.makeInit(
    (count = 0, ...increments: ReadonlyArray<number>) => ({
      model: {
        count: increments.reduce(
          (total, increment) => total + increment,
          count,
        ),
      },
    }),
  )
  const restInit = PlainComposition.makeInit(
    (...increments: ReadonlyArray<number>) => ({
      model: {
        count: increments.reduce((total, increment) => total + increment, 0),
      },
    }),
  )

  expectTypeOf<Parameters<typeof plainInit>>().toEqualTypeOf<
    [count?: number | undefined, ...increments: Array<number>]
  >()
  expectTypeOf<Parameters<typeof restInit>>().toEqualTypeOf<Array<number>>()
  expect(plainInit(1, 2, 3).model).toEqual({ count: 6 })
  expect(restInit(1, 2, 3).model).toEqual({ count: 6 })
})

it('preserves primitive and tagged union Models for graphless Compositions', () => {
  const TextComposition = makeDefinition('InitializationText', {
    Model: Schema.String,
    Message: Schema.Never,
  }).makeComposition()
  const initializeText = TextComposition.makeInit(() => ({ model: 'ready' }))
  const SessionModel = Schema.Union([
    Schema.TaggedStruct('SignedOut', {}),
    Schema.TaggedStruct('SignedIn', { username: Schema.String }),
  ])

  const SessionComposition = makeDefinition('InitializationSession', {
    Model: SessionModel,
    Message: Schema.Never,
  }).makeComposition()
  const initializeSession = SessionComposition.makeInit((username: string) => ({
    model: { _tag: 'SignedIn', username },
  }))

  expectTypeOf<
    ReturnType<typeof initializeText>['model']
  >().toEqualTypeOf<string>()
  expectTypeOf<ReturnType<typeof initializeSession>['model']>().toEqualTypeOf<{
    _tag: 'SignedIn'
    username: string
  }>()
  expect(initializeText().model).toBe('ready')
  expect(initializeSession('Ada').model).toEqual({
    _tag: 'SignedIn',
    username: 'Ada',
  })
})

it('preserves literals without Steps and widens initializers that can apply Steps', () => {
  const ChoiceModel = Schema.Struct({
    choice: Schema.Literals(['One', 'Two']),
  })
  type ChoiceModel = typeof ChoiceModel.Type

  const ChoiceComposition = makeDefinition('InitializationChoice', {
    Model: ChoiceModel,
    Message: Schema.Never,
  }).makeComposition()
  const withoutSteps = ChoiceComposition.makeInit(() => ({
    model: { choice: 'One' },
  }))
  const withOptionalSteps = ChoiceComposition.makeInit(
    (step?: Update.Step<ChoiceModel, never>) => ({
      model: { choice: 'One' },
      steps: step === undefined ? undefined : [step],
    }),
  )
  const optionalStepsArguments = (step?: Update.Step<ChoiceModel, never>) =>
    step

  expectTypeOf<
    ReturnType<typeof withoutSteps>['model']['choice']
  >().toEqualTypeOf<'One'>()
  expectTypeOf<
    ReturnType<typeof withOptionalSteps>['model']
  >().toEqualTypeOf<ChoiceModel>()
  expectTypeOf<Parameters<typeof withOptionalSteps>>().toEqualTypeOf<
    Parameters<typeof optionalStepsArguments>
  >()
})

it('rejects parent-owned values for child-initialized fields before child init', () => {
  const unsafeInit = Reflect.apply(ParentComposition.makeInit, undefined, [
    () => ({
      childInitContext: {
        firstCount: 1,
        maybeSecondCount: Option.none<number>(),
      },
      model: {
        first: ChildModel.make({ count: 99 }),
        status: 'Ready',
      },
    }),
  ])
  if (!Predicate.isFunction(unsafeInit)) {
    throw new Error('Expected Composition.makeInit to return an initializer.')
  }

  calls.splice(0)
  expect(() => Reflect.apply(unsafeInit, undefined, [])).toThrow(
    'parent-owned model cannot supply child-initialized field "first"',
  )
  expect(calls).not.toContain('child-init-1')
})

it('rejects OutMessages from unsafe initialization plans and Steps', () => {
  const unsafePlanInit = Reflect.apply(ParentComposition.makeInit, undefined, [
    () => ({
      childInitContext: {
        firstCount: 1,
        maybeSecondCount: Option.none<number>(),
      },
      model: { status: 'Ready' },
      outMessage: { _tag: 'IgnoredPlanOutMessage' },
    }),
  ])
  const unsafeStepInit = Reflect.apply(ParentComposition.makeInit, undefined, [
    () => ({
      childInitContext: {
        firstCount: 1,
        maybeSecondCount: Option.none<number>(),
      },
      model: { status: 'Ready' },
      steps: [
        (model: ParentModel) => ({
          model,
          outMessage: { _tag: 'IgnoredStepOutMessage' },
        }),
      ],
    }),
  ])
  if (
    !Predicate.isFunction(unsafePlanInit) ||
    !Predicate.isFunction(unsafeStepInit)
  ) {
    throw new Error('Expected Composition.makeInit to return initializers.')
  }

  expect(() => Reflect.apply(unsafePlanInit, undefined, [])).toThrow(
    'Composition.makeInit callback cannot return an OutMessage',
  )
  expect(() => Reflect.apply(unsafeStepInit, undefined, [])).toThrow(
    'Composition.makeInit Step cannot return an OutMessage',
  )
})

it('checks initialization plan fields before invoking child policies', () => {
  const unsafeInit = Reflect.apply(ParentComposition.makeInit, undefined, [
    () => ({
      model: { status: 'Ready' },
      childInitContex: {
        firstCount: 1,
        maybeSecondCount: Option.none<number>(),
      },
    }),
  ])
  if (!Predicate.isFunction(unsafeInit)) {
    throw new Error('Expected Composition.makeInit to return an initializer.')
  }

  calls.splice(0)

  expect(() => Reflect.apply(unsafeInit, undefined, [])).toThrow(
    'Composition.makeInit callback returned unknown field "childInitContex"',
  )
  expect(calls).toEqual([])
})

it('accepts documented plan fields and symbol metadata', () => {
  const Metadata = Symbol('InitializationMetadata')
  const PlainComposition = makeDefinition('InitializationPlanFields', {
    Model: Schema.String,
    Message: Schema.Never,
  }).makeComposition()
  const init = PlainComposition.makeInit(() => ({
    model: 'ready',
    childInitContext: { source: 'test' },
    [Metadata]: true,
  }))

  expect(init().model).toBe('ready')

  if (false) {
    // @ts-expect-error Initializers reject unknown plan fields instead of dropping them.
    PlainComposition.makeInit(() => ({ model: 'ready', unexpected: true }))

    const unexpectedPlan = { model: 'ready', unexpected: true }
    // @ts-expect-error Predeclared results also retain their unknown field check.
    PlainComposition.makeInit(() => unexpectedPlan)

    // @ts-expect-error Every variant of a plan must use documented fields.
    PlainComposition.makeInit((isUnexpected: boolean) =>
      isUnexpected ? { model: 'ready', unexpected: true } : { model: 'ready' },
    )
  }
})

it('initializes a projected accessor child and verifies Schema reconstruction', () => {
  const AccessorParentModel = Schema.Struct({
    first: ChildModel,
    second: ChildModel,
    selected: Schema.Literal('Second'),
  })
  const AccessorParent = makeDefinition('InitializationAccessorParent', {
    Model: AccessorParentModel,
    Message: Schema.Never,
  })
  const AccessorBinding = AccessorParent.makeBinding(ChildBlock, {
    placement: 'selectedChild',
    read: (model: typeof AccessorParentModel.Type) => Option.some(model.second),
    write: (model, nextSecond) =>
      modifyFields(model, { second: () => nextSecond }),
    init: {
      contextToArgs: () => single(7),
      toParentFields: second => ({ second }),
    },
  })
  const AccessorComposition = AccessorParent.makeComposition({
    bindings: [AccessorBinding],
  })
  const initializeAccessor = AccessorComposition.makeInit(() => ({
    model: {
      first: ChildModel.make({ count: 1 }),
      selected: 'Second',
    },
  }))

  expect(initializeAccessor().model).toEqual({
    first: { count: 1 },
    second: { count: 7 },
    selected: 'Second',
  })
})

it('rejects a projected field that the accessor does not select', () => {
  const AccessorParentModel = Schema.Struct({
    first: ChildModel,
    second: ChildModel,
  })
  const AccessorParent = makeDefinition('InitializationInvalidAccessorParent', {
    Model: AccessorParentModel,
    Message: Schema.Never,
  })
  const InvalidAccessorBinding = AccessorParent.makeBinding(ChildBlock, {
    placement: 'invalidSelectedChild',
    read: (model: typeof AccessorParentModel.Type) => Option.some(model.first),
    write: (model, nextFirst) =>
      modifyFields(model, { first: () => nextFirst }),
    init: {
      contextToArgs: () => single(7),
      toParentFields: second => ({ second }),
    },
  })
  const InvalidAccessorComposition = AccessorParent.makeComposition({
    bindings: [InvalidAccessorBinding],
  })
  const initializeInvalidAccessor = InvalidAccessorComposition.makeInit(() => ({
    model: { first: ChildModel.make({ count: 7 }) },
  }))

  expect(() => initializeInvalidAccessor()).toThrow(
    'must select the exact initialized child before constructing the parent Model',
  )
})

it('runs initialization callbacks and Steps under the exact registered operation graph', () => {
  const toForeignParentModel = (first: ChildModel): ParentModel =>
    ParentModel.make({
      first,
      maybeSecond: Option.none(),
      status: 'Ready',
    })
  const ForeignBinding = Parent.makeBinding(ChildBlock, {
    field: 'first',
    placement: 'foreignFirst',
    init: false,
  })
  const SelectorBinding = Parent.makeBinding(ChildBlock, {
    field: 'first',
    placement: 'selectorFirst',
    init: {
      contextToArgs: () => {
        assertRegisteredBinding(SelectorBinding, 'selectorFirst')
        assertRegisteredBinding(ForeignBinding, 'foreignFirst')
        return single(1)
      },
    },
  })
  const SelectorSecondBinding = Parent.makeBinding(ChildBlock, {
    field: 'maybeSecond',
    init: false,
  })
  const SelectorComposition = Parent.makeComposition({
    bindings: [SelectorBinding, SelectorSecondBinding],
  })
  const ProjectedParentModel = Schema.Struct({
    first: ChildModel,
    second: ChildModel,
  })
  const ProjectedParent = makeDefinition('InitializationProjectedGraphParent', {
    Model: ProjectedParentModel,
    Message: Schema.Never,
  })
  const ForeignProjectedBinding = ProjectedParent.makeBinding(ChildBlock, {
    field: 'first',
    placement: 'foreignProjectedFirst',
    init: false,
  })
  const ProjectedBinding = ProjectedParent.makeBinding(ChildBlock, {
    placement: 'projectedSecond',
    read: (model: typeof ProjectedParentModel.Type) =>
      Option.some(model.second),
    write: (model, nextSecond) =>
      modifyFields(model, { second: () => nextSecond }),
    init: {
      contextToArgs: () => single(1),
      toParentFields: second => {
        assertRegisteredBinding(ProjectedBinding, 'projectedSecond')
        assertRegisteredBinding(
          ForeignProjectedBinding,
          'foreignProjectedFirst',
        )
        return { second }
      },
    },
  })
  const ProjectedComposition = ProjectedParent.makeComposition({
    bindings: [ProjectedBinding],
  })
  const initializeWithForeignStep = ParentComposition.makeInit(() => ({
    childInitContext: {
      firstCount: 1,
      maybeSecondCount: Option.none<number>(),
    },
    model: { status: 'Ready' },
    // @ts-expect-error A startup Step requires its exact registered Binding.
    steps: [ForeignBinding.increment()],
  }))
  const initializeWithForeignInit = Reflect.apply(
    ParentComposition.makeInit,
    undefined,
    [
      () =>
        ForeignBinding.init({
          args: [1],
          toParentModel: toForeignParentModel,
        }),
    ],
  )
  const initializeWithForeignSelector = SelectorComposition.makeInit(() => ({
    model: {
      maybeSecond: Option.none(),
      status: 'Ready',
    },
  }))
  const initializeWithForeignProjection = ProjectedComposition.makeInit(() => ({
    model: { first: ChildModel.make({ count: 0 }) },
  }))

  expect(() => initializeWithForeignStep()).toThrow(
    'is not registered in the current Block graph',
  )
  expect(() => initializeWithForeignInit()).toThrow(
    'is not registered in the current Block graph',
  )
  expect(() => initializeWithForeignSelector()).toThrow(
    'is not registered in the current Block graph',
  )
  expect(() => initializeWithForeignProjection()).toThrow(
    'is not registered in the current Block graph',
  )
})

if (false) {
  // @ts-expect-error Child-dependent startup selectors require shared startup.
  ParentComposition.makeInit(() => ({ model: { status: 'Ready' } }))

  ParentComposition.makeInit(() => ({
    childInitContext: {
      firstCount: 1,
      maybeSecondCount: Option.none<number>(),
    },
    // @ts-expect-error Initialized child fields are owned by the Composition.
    model: { first: ChildModel.make({ count: 1 }), status: 'Ready' },
  }))

  ParentComposition.makeInit(() => ({
    childInitContext: {
      firstCount: 1,
      maybeSecondCount: Option.none<number>(),
    },
    model: { status: 'Ready' },
    // @ts-expect-error Startup Steps cannot emit an OutMessage.
    steps: [(model: ParentModel) => ({ model, outMessage: 'ignored' })],
  }))

  function overloadedInit(value: string): Readonly<{ model: ParentModel }>
  function overloadedInit(value: number): Readonly<{ model: ParentModel }>
  function overloadedInit(
    _value: string | number,
  ): Readonly<{ model: ParentModel }> {
    return {
      model: ParentModel.make({
        first: ChildModel.make({ count: 0 }),
        maybeSecond: Option.none(),
        status: 'Ready',
      }),
    }
  }

  // @ts-expect-error Composition initializers require a plain function with one concrete call signature.
  Parent.makeComposition().makeInit(overloadedInit)

  const genericInit = <Value extends number>(value: Value) => ({
    model: ParentModel.make({
      first: ChildModel.make({ count: 0 }),
      maybeSecond: Option.none(),
      status: 'Ready',
    }),
    value,
  })
  const callableMetadataInit = Object.assign(
    () => ({
      model: ParentModel.make({
        first: ChildModel.make({ count: 0 }),
        maybeSecond: Option.none(),
        status: 'Ready',
      }),
    }),
    { description: 'Initial parent Model' },
  )
  const optionalMetadataInit: (() => Readonly<{ model: ParentModel }>) &
    Readonly<{ description?: string }> = () => ({
    model: ParentModel.make({
      first: ChildModel.make({ count: 0 }),
      maybeSecond: Option.none(),
      status: 'Ready',
    }),
  })

  // @ts-expect-error Composition initializers require a plain function with one concrete call signature.
  Parent.makeComposition().makeInit(genericInit)
  // @ts-expect-error Composition initializers require a plain function with one concrete call signature.
  Parent.makeComposition().makeInit(callableMetadataInit)
  // @ts-expect-error Optional callable metadata still requires a plain adapter callback.
  Parent.makeComposition().makeInit(optionalMetadataInit)

  type NeverRestPlan = InitializationPlan<
    ParentModel,
    ParentMessage,
    readonly []
  >
  const neverRestMetadataInit = Object.assign(
    (..._args: never): NeverRestPlan => ({
      model: ParentModel.make({
        first: ChildModel.make({ count: 0 }),
        maybeSecond: Option.none(),
        status: 'Ready',
      }),
    }),
    { description: 'Initial parent Model' },
  )
  const neverRestInit = (..._args: never): NeverRestPlan => ({
    model: ParentModel.make({
      first: ChildModel.make({ count: 0 }),
      maybeSecond: Option.none(),
      status: 'Ready',
    }),
  })
  function neverRestOverloadedInit(
    value: boolean,
  ): Readonly<{ model: ChildModel }>
  function neverRestOverloadedInit(...args: never): NeverRestPlan
  function neverRestOverloadedInit(
    value?: boolean,
  ): NeverRestPlan | Readonly<{ model: ChildModel }> {
    if (value === true) {
      return { model: ChildModel.make({ count: 0 }) }
    }

    return {
      model: ParentModel.make({
        first: ChildModel.make({ count: 0 }),
        maybeSecond: Option.none(),
        status: 'Ready',
      }),
    }
  }
  const neverRestGenericInit = <Value>(
    ..._args: never & ReadonlyArray<Value>
  ): NeverRestPlan => ({
    model: ParentModel.make({
      first: ChildModel.make({ count: 0 }),
      maybeSecond: Option.none(),
      status: 'Ready',
    }),
  })

  // @ts-expect-error Callable metadata cannot use the uninferred signature sentinel.
  Parent.makeComposition().makeInit(neverRestMetadataInit)
  // @ts-expect-error A never-rest function is not callable by consumers.
  Parent.makeComposition().makeInit(neverRestInit)
  // @ts-expect-error Earlier overloads cannot use the uninferred signature sentinel.
  Parent.makeComposition().makeInit(neverRestOverloadedInit)
  // @ts-expect-error A never-rest generic is not callable by consumers.
  Parent.makeComposition().makeInit(neverRestGenericInit)
}

it('omits startup when every child selector has no input', () => {
  const ConstantStartupParent = makeDefinition('ConstantStartupParent', {
    Model: ParentModel,
    Message: ParentMessage,
  })
  const FirstBinding = ConstantStartupParent.makeBinding(ChildBlock, {
    field: 'first',
    init: { contextToArgs: () => [3] },
  })
  const SecondBinding = ConstantStartupParent.makeBinding(ChildBlock, {
    field: 'maybeSecond',
    init: { contextToArgs: () => Option.some([4]) },
  })
  const ConstantStartupParentComposition =
    ConstantStartupParent.makeComposition({
      bindings: [FirstBinding, SecondBinding],
    })
  const init = ConstantStartupParentComposition.makeInit(() => ({
    model: { status: 'Ready' },
  }))
  const parentInit = init()

  expectTypeOf(init).parameters.toEqualTypeOf<[]>()
  expect(parentInit.model.first.count).toBe(3)
  expect(Option.getOrThrow(parentInit.model.maybeSecond).count).toBe(4)
  expect(parentInit.commands).toHaveLength(2)
})
