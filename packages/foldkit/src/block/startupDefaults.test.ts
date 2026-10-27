import { Context, Effect, Layer, Option, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import type { RequirementOfBinding } from './binding.js'
import { makeDefinition, makeNamespace } from './define.js'
import * as Block from './public.js'
import type { Scoped } from './scope.js'

class StartupClient extends Context.Service<
  StartupClient,
  Readonly<{ value: number }>
>()('StartupDefaults/StartupClient') {}

const ChildModel = Schema.Struct({ count: Schema.Number })

const ChildMessage = defineMessageUnion({
  CompletedInitialization: { count: Schema.Number },
})

const Child = makeDefinition('StartupDefaultsChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const FinishChildInitialization = Child.makeCommand('FinishInitialization', {
  args: { count: Schema.Number },
  messages: [ChildMessage.CompletedInitialization],
  handler: function* () {
    yield* StartupClient
    return ({ count }) =>
      Effect.sync(() => {
        effects.commandExecutions += 1
        return ChildMessage.CompletedInitialization({ count })
      })
  },
})
const effects = { constructorBuilds: 0, commandExecutions: 0 }
const FailChildConstruction = Child.makeCommand('FailConstruction', {
  messages: [ChildMessage.CompletedInitialization],
})
const FailChildConstructionLayer = FailChildConstruction.toLayer<
  never,
  'StartupUnavailable',
  never
>(
  Effect.suspend(() => {
    effects.constructorBuilds += 1
    return Effect.fail<'StartupUnavailable'>('StartupUnavailable')
  }),
)
const childInitCalls: globalThis.Array<number> = []
const ChildComposition = Child.makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => {
      childInitCalls.push(0)
      return {
        model: ChildModel.make({ count: 0 }),
        commands: [FinishChildInitialization({ count: 0 })],
      }
    }),
    update: ChildComposition.makeUpdate({
      CompletedInitialization: (model, { count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
    }),
    EffectsLayer: Layer.merge(
      FinishChildInitialization.layer,
      FailChildConstructionLayer,
    ),
  })
const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const DefaultChildComposition = makeDefinition('StartupDefaultsDefaultChild', {
  Model: ChildModel,
  Message: ChildMessage,
}).makeComposition()
const prepareDefaultChildBlock = () =>
  DefaultChildComposition.prepareBlock({
    init: DefaultChildComposition.makeInit((count = 1) => ({
      model: ChildModel.make({ count }),
    })),
    update: DefaultChildComposition.makeUpdate({
      CompletedInitialization: model => ({ model }),
    }),
  })
const DefaultChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareDefaultChildBlock
> = Block.assemble(prepareDefaultChildBlock)

const OptionalArgumentChildComposition = makeDefinition(
  'StartupDefaultsOptionalArgumentChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const prepareOptionalArgumentChildBlock = () =>
  OptionalArgumentChildComposition.prepareBlock({
    init: OptionalArgumentChildComposition.makeInit((count?: number) => ({
      model: ChildModel.make({ count: count ?? 2 }),
    })),
    update: OptionalArgumentChildComposition.makeUpdate({
      CompletedInitialization: model => ({ model }),
    }),
  })
const OptionalArgumentChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareOptionalArgumentChildBlock
> = Block.assemble(prepareOptionalArgumentChildBlock)

const RequiredRestChildComposition = makeDefinition(
  'StartupDefaultsRequiredRestChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const prepareRequiredRestChildBlock = () =>
  RequiredRestChildComposition.prepareBlock({
    init: RequiredRestChildComposition.makeInit(
      (...counts: [first: number, ...rest: Array<number>]) => ({
        model: ChildModel.make({
          count: counts.reduce((total, count) => total + count, 0),
        }),
      }),
    ),
    update: RequiredRestChildComposition.makeUpdate({
      CompletedInitialization: model => ({ model }),
    }),
  })
const RequiredRestChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareRequiredRestChildBlock
> = Block.assemble(prepareRequiredRestChildBlock)

const RequiredChildComposition = makeDefinition(
  'StartupDefaultsRequiredChild',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
).makeComposition()
const prepareRequiredChildBlock = () =>
  RequiredChildComposition.prepareBlock({
    init: RequiredChildComposition.makeInit((count: number) => ({
      model: ChildModel.make({ count }),
    })),
    update: RequiredChildComposition.makeUpdate({
      CompletedInitialization: model => ({ model }),
    }),
  })
const RequiredChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareRequiredChildBlock
> = Block.assemble(prepareRequiredChildBlock)

const Entry = Schema.Struct({ id: Schema.String, child: ChildModel })
const ChildInitContext = Schema.Struct({
  count: Schema.Number,
  includeOptional: Schema.Boolean,
  entryIds: Schema.Array(Schema.String),
})
type ChildInitContext = typeof ChildInitContext.Type
const ParentModel = Schema.Struct({
  automatic: ChildModel,
  defaultArgument: ChildModel,
  optionalArgument: ChildModel,
  requiredRest: ChildModel,
  optedOut: ChildModel,
  maybePassive: Schema.Option(ChildModel),
  maybeAutomatic: Schema.Option(ChildModel),
  passiveEntries: Schema.Array(Entry),
  automaticEntries: Schema.Array(Entry),
  status: Schema.Literals(['Ready', 'Stepped']),
})
type ParentModel = typeof ParentModel.Type
const ParentMessage = defineMessageUnion({
  CompletedParentInitialization: {},
  CompletedParentStep: {},
})
const Parent = makeDefinition('StartupDefaultsParent', {
  Model: ParentModel,
  Message: ParentMessage,
  ChildInitContext,
})
const FinishParentInitialization = Parent.makeCommand('FinishInitialization', {
  messages: [ParentMessage.CompletedParentInitialization],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.CompletedParentInitialization())
  },
})
const FinishParentStep = Parent.makeCommand('FinishStep', {
  messages: [ParentMessage.CompletedParentStep],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.CompletedParentStep())
  },
})

const AutomaticBinding = Parent.makeBinding(ChildBlock, {
  field: 'automatic',
})
const DefaultArgumentBinding = Parent.makeBinding(DefaultChildBlock, {
  field: 'defaultArgument',
})
const OptionalArgumentBinding = Parent.makeBinding(OptionalArgumentChildBlock, {
  field: 'optionalArgument',
})
const RequiredRestBinding = Parent.makeBinding(RequiredRestChildBlock, {
  field: 'requiredRest',
  init: { contextToArgs: childInitContext => [childInitContext.count] },
})
const OptedOutBinding = Parent.makeBinding(ChildBlock, {
  field: 'optedOut',
  init: false,
})
const PassiveOptionalBinding = Parent.makeBinding(ChildBlock, {
  field: 'maybePassive',
})
const AutomaticOptionalBinding = Parent.makeBinding(ChildBlock, {
  field: 'maybeAutomatic',
  init: {
    contextToArgs: childInitContext =>
      childInitContext.includeOptional ? Option.some([]) : Option.none(),
  },
})
const PassiveEntriesBinding = Parent.makeBinding(ChildBlock, {
  placement: 'passiveEntries',
  field: 'passiveEntries',
  key: 'id',
  childField: 'child',
})
const AutomaticEntriesBinding = Parent.makeBinding(ChildBlock, {
  placement: 'automaticEntries',
  field: 'automaticEntries',
  key: 'id',
  childField: 'child',
  init: {
    instances: childInitContext =>
      childInitContext.entryIds.map(id => ({ key: id, args: [] })),
    toItem: ({ key }, child) => ({ id: key, child }),
  },
})

expectTypeOf(Parent.ChildInitContext).toEqualTypeOf(ChildInitContext)
expectTypeOf(RequiredRestBinding.placement).toEqualTypeOf<'requiredRest'>()
expectTypeOf<Parameters<typeof DefaultChildBlock.init>>().toEqualTypeOf<
  [count?: number | undefined]
>()
expectTypeOf<
  Parameters<typeof OptionalArgumentChildBlock.init>
>().toEqualTypeOf<[count?: number | undefined]>()
expectTypeOf<Parameters<typeof RequiredRestChildBlock.init>>().toEqualTypeOf<
  [first: number, ...rest: Array<number>]
>()

const ParentComposition = Parent.makeComposition({
  bindings: [
    AutomaticBinding,
    DefaultArgumentBinding,
    OptionalArgumentBinding,
    RequiredRestBinding,
    OptedOutBinding,
    PassiveOptionalBinding,
    AutomaticOptionalBinding,
    PassiveEntriesBinding,
    AutomaticEntriesBinding,
  ],
})
const applyParentStep = Parent.makeStep(model => ({
  model: modifyFields(model, { status: () => 'Stepped' }),
  commands: [FinishParentStep()],
}))
const init = ParentComposition.makeInit(
  (childInitContext: ChildInitContext) => ({
    childInitContext,
    model: {
      optedOut: ChildModel.make({ count: 9 }),
      maybePassive: Option.none(),
      passiveEntries: [],
      status: 'Ready',
    },
    commands: [FinishParentInitialization()],
    steps: [applyParentStep],
  }),
)
const prepareParentBlock = () =>
  ParentComposition.prepareBlock({
    init,
    update: ParentComposition.makeUpdate({
      CompletedParentInitialization: model => ({ model }),
      CompletedParentStep: model => ({ model }),
    }),
    EffectsLayer: Layer.merge(
      FinishParentInitialization.layer,
      FinishParentStep.layer,
    ),
  })
const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)

// @ts-expect-error An opted-out required child remains a mandatory parent-owned field.
ParentComposition.makeInit((childInitContext: ChildInitContext) => ({
  childInitContext,
  model: {
    maybePassive: Option.none(),
    passiveEntries: [],
    status: 'Ready',
  },
}))

type InitialRegistration =
  | RequirementOfBinding<typeof AutomaticBinding>
  | RequirementOfBinding<typeof DefaultArgumentBinding>
  | RequirementOfBinding<typeof OptionalArgumentBinding>
  | RequirementOfBinding<typeof RequiredRestBinding>
  | RequirementOfBinding<typeof AutomaticOptionalBinding>
  | RequirementOfBinding<typeof AutomaticEntriesBinding>
type InitialRequirements =
  | Command.HandlerOf<typeof FinishParentInitialization>
  | Command.HandlerOf<typeof FinishParentStep>
  | Scoped<'automatic', Command.HandlerOf<typeof FinishChildInitialization>>
  | Scoped<
      'maybeAutomatic',
      Command.HandlerOf<typeof FinishChildInitialization>
    >
  | Scoped<
      'automaticEntries',
      Command.HandlerOf<typeof FinishChildInitialization>
    >

expectTypeOf<Parameters<typeof init>>().toEqualTypeOf<
  [childInitContext: ChildInitContext]
>()
expectTypeOf<ReturnType<typeof init>['model']>().toEqualTypeOf<ParentModel>()
expectTypeOf<
  Update.RegistrationEvidenceOf<ReturnType<typeof init>>
>().toEqualTypeOf<InitialRegistration>()
expectTypeOf<
  Update.RequirementsOf<typeof init>
>().toEqualTypeOf<InitialRequirements>()
expectTypeOf<
  Layer.Services<typeof ParentBlock.EffectsLayer>
>().toEqualTypeOf<StartupClient>()
expectTypeOf<
  Layer.Error<typeof ParentBlock.EffectsLayer>
>().toEqualTypeOf<'StartupUnavailable'>()

if (false) {
  // @ts-expect-error The startup selector is named contextToArgs.
  // oxfmt-ignore
  Parent.makeBinding(ChildBlock, { field: 'automatic', init: { args: () => [] } })
  // @ts-expect-error The removed args key cannot accompany contextToArgs.
  // oxfmt-ignore
  Parent.makeBinding(ChildBlock, { field: 'automatic', init: { contextToArgs: () => [], args: () => [] } })
  // @ts-expect-error A required-argument child needs init.contextToArgs or init: false.
  // oxfmt-ignore
  Parent.makeBinding(RequiredChildBlock, { field: 'automatic' })
  // @ts-expect-error Child init arguments retain their exact tuple.
  // oxfmt-ignore
  Parent.makeBinding(RequiredChildBlock, { field: 'automatic', init: { contextToArgs: () => ['wrong'] } })
  // @ts-expect-error A selector must accept every value allowed by ChildInitContext.
  // oxfmt-ignore
  Parent.makeBinding(ChildBlock, { field: 'automatic', placement: 'narrowStartup', init: { contextToArgs: (_childInitContext: Readonly<{ count: 1 }>) => [] } })
  Parent.makeBinding(ChildBlock, {
    field: 'automatic',
    placement: 'readonlyStartup',
    init: {
      contextToArgs: childInitContext => {
        // @ts-expect-error ChildInitContext Schema fields remain readonly.
        childInitContext.count = 2
        return []
      },
    },
  })
  // @ts-expect-error Optional child initialization requires an explicit presence selector.
  // oxfmt-ignore
  Parent.makeBinding(ChildBlock, { field: 'maybePassive', init: true })
  // @ts-expect-error Keyed init false cannot replace an occurrence policy.
  // oxfmt-ignore
  Parent.makeBinding(ChildBlock, { field: 'passiveEntries', key: 'id', childField: 'child', init: false })

  const optionalInitConfig: Readonly<{
    field: 'automatic'
    init?: false
  }> = {
    field: 'automatic',
  }
  // @ts-expect-error An optional init policy cannot ambiguously change default startup.
  Parent.makeBinding(ChildBlock, optionalInitConfig)

  const unionInitConfig: Readonly<{
    field: 'automatic'
    init: true | false
  }> = {
    field: 'automatic',
    init: true,
  }
  // @ts-expect-error A union init policy does not establish one concrete startup policy.
  Parent.makeBinding(ChildBlock, unionInitConfig)
}

const ExactStartupModel = Schema.Struct({ child: ChildModel })
const ExactStartupNamespace = makeNamespace('StartupDefaultsExact')
const ExactStartupDefinition = ExactStartupNamespace.makeDefinition({
  Model: ExactStartupModel,
  Message: Schema.Never,
  ChildInitContext,
})
const WiderStartupBinding = ExactStartupDefinition.makeBinding(ChildBlock, {
  field: 'child',
  init: { contextToArgs: (_childInitContext: object) => [] },
})
const ExactStartupComposition = ExactStartupDefinition.makeComposition({
  bindings: [WiderStartupBinding],
})
ExactStartupComposition.makeInit(() => ({
  // @ts-expect-error A wider selector annotation cannot widen declared ChildInitContext evidence.
  childInitContext: {},
  model: {},
}))

const ZeroParameterStartupBinding = ExactStartupDefinition.makeBinding(
  ChildBlock,
  {
    field: 'child',
    init: { contextToArgs: () => [] },
  },
)
const ZeroParameterStartupComposition = ExactStartupDefinition.makeComposition({
  bindings: [ZeroParameterStartupBinding],
})
ZeroParameterStartupComposition.makeInit(() => ({ model: {} }))

const ForeignChildInitContext = Schema.Struct({ token: Schema.String })
const ForeignStartupDefinition = ExactStartupNamespace.makeDefinition({
  Model: ExactStartupModel,
  Message: Schema.Never,
  ChildInitContext: ForeignChildInitContext,
})
const ForeignStartupBinding = ForeignStartupDefinition.makeBinding(ChildBlock, {
  field: 'child',
  init: { contextToArgs: _childInitContext => [] },
})
if (false) {
  // @ts-expect-error A Binding cannot change another Definition's ChildInitContext contract.
  ExactStartupDefinition.makeComposition({
    bindings: [ForeignStartupBinding],
  })
}

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model: ExactStartupModel,
  Message: Schema.Never,
  ChildInitContext,
})
ApplicationDefinition.makeBinding(ChildBlock, {
  field: 'child',
  init: {
    contextToArgs: childInitContext => {
      expectTypeOf(childInitContext).toEqualTypeOf<ChildInitContext>()
      return []
    },
  },
})

const Ordinary = makeDefinition('StartupDefaultsOrdinary', {
  Model: ExactStartupModel,
  Message: Schema.Never,
})
Ordinary.makeBinding(ChildBlock, {
  field: 'child',
})

it('initializes required direct fields by default and leaves opt-out storage parent-owned', () => {
  childInitCalls.splice(0)
  effects.constructorBuilds = 0
  effects.commandExecutions = 0

  const initialized = init({
    count: 3,
    includeOptional: true,
    entryIds: ['first', 'second'],
  })

  expect(initialized.model).toEqual({
    automatic: { count: 0 },
    defaultArgument: { count: 1 },
    optionalArgument: { count: 2 },
    requiredRest: { count: 3 },
    optedOut: { count: 9 },
    maybePassive: Option.none(),
    maybeAutomatic: Option.some({ count: 0 }),
    passiveEntries: [],
    automaticEntries: [
      { id: 'first', child: { count: 0 } },
      { id: 'second', child: { count: 0 } },
    ],
    status: 'Stepped',
  })
  expect(childInitCalls).toEqual([0, 0, 0, 0])
  expect(initialized.commands?.map(command => command.name)).toEqual([
    'StartupDefaultsParent/FinishInitialization',
    'automatic/FinishInitialization',
    'maybeAutomatic/FinishInitialization',
    'automaticEntries["first"]/FinishInitialization',
    'automaticEntries["second"]/FinishInitialization',
    'StartupDefaultsParent/FinishStep',
  ])
  expect(effects).toEqual({ constructorBuilds: 0, commandExecutions: 0 })
})

it('rejects an erased Binding from an incompatible ChildInitContext contract', () => {
  expect(() =>
    Reflect.apply(ExactStartupDefinition.makeComposition, undefined, [
      { bindings: [ForeignStartupBinding] },
    ]),
  ).toThrow('belongs to a different parent Definition contract')
})

it('rejects the removed init.args startup selector at runtime', () => {
  const bindWithInit = (init: object) =>
    Reflect.apply(Parent.makeBinding, undefined, [
      ChildBlock,
      {
        field: 'automatic',
        placement: 'erasedStartupPolicy',
        init,
      },
    ])

  expect(() => bindWithInit({ args: () => [] })).toThrow(
    'object with a contextToArgs function',
  )
  expect(() =>
    bindWithInit({ contextToArgs: () => [], args: () => [] }),
  ).toThrow('does not support the policy field "args"')
})

void OptedOutBinding
void PassiveOptionalBinding
void PassiveEntriesBinding
void RequiredChildBlock
