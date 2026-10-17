import { Context, Effect, Layer, Option, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { define as defineApplication } from '../runtime/applicationPublic.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import type { RequirementOfBinding } from './binding.js'
import { define } from './define.js'
import type { Scoped } from './scope.js'

class StartupClient extends Context.Service<
  StartupClient,
  Readonly<{ value: number }>
>()('StartupDefaults/StartupClient') {}

const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type

const ChildMessage = defineMessageUnion({
  CompletedInitialization: { count: Schema.Number },
})

const Child = define('StartupDefaultsChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const FinishChildInitialization = Child.command('FinishInitialization', {
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
const FailChildConstruction = Child.command('FailConstruction', {
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
const ChildBlock = ChildComposition.makeBlock({
  init: ChildComposition.makeInit(() => {
    childInitCalls.push(0)
    return {
      model: ChildModel.make({ count: 0 }),
      commands: [FinishChildInitialization({ count: 0 })],
    }
  }),
  update: ChildComposition.makeUpdate((model, { count }) => ({
    model: modifyFields(model, { count: () => count }),
  })),
  EffectsLayer: Layer.merge(
    FinishChildInitialization.layer,
    FailChildConstructionLayer,
  ),
})

const DefaultChild = define('StartupDefaultsDefaultChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const DefaultChildComposition = DefaultChild.makeComposition()
const DefaultChildBlock = DefaultChildComposition.makeBlock({
  init: DefaultChildComposition.makeInit((count = 1) => ({
    model: ChildModel.make({ count }),
  })),
  update: DefaultChildComposition.makeUpdate(model => ({ model })),
})

const OptionalArgumentChild = define('StartupDefaultsOptionalArgumentChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const OptionalArgumentChildComposition = OptionalArgumentChild.makeComposition()
const OptionalArgumentChildBlock = OptionalArgumentChildComposition.makeBlock({
  init: OptionalArgumentChildComposition.makeInit((count?: number) => ({
    model: ChildModel.make({ count: count ?? 2 }),
  })),
  update: OptionalArgumentChildComposition.makeUpdate(model => ({ model })),
})

const RequiredRestChild = define('StartupDefaultsRequiredRestChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const RequiredRestChildComposition = RequiredRestChild.makeComposition()
const RequiredRestChildBlock = RequiredRestChildComposition.makeBlock({
  init: RequiredRestChildComposition.makeInit(
    (...counts: [first: number, ...rest: Array<number>]) => ({
      model: ChildModel.make({
        count: counts.reduce((total, count) => total + count, 0),
      }),
    }),
  ),
  update: RequiredRestChildComposition.makeUpdate(model => ({ model })),
})

const RequiredChild = define('StartupDefaultsRequiredChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const RequiredChildComposition = RequiredChild.makeComposition()
const RequiredChildBlock = RequiredChildComposition.makeBlock({
  init: RequiredChildComposition.makeInit((count: number) => ({
    model: ChildModel.make({ count }),
  })),
  update: RequiredChildComposition.makeUpdate(model => ({ model })),
})

const Entry = Schema.Struct({ id: Schema.String, child: ChildModel })
const Startup = Schema.Struct({
  count: Schema.Number,
  includeOptional: Schema.Boolean,
  entryIds: Schema.Array(Schema.String),
})
type Startup = typeof Startup.Type
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
  GotChildMessage: { message: ChildMessage },
  CompletedParentInitialization: {},
  CompletedParentStep: {},
})
const Parent = define('StartupDefaultsParent', {
  Model: ParentModel,
  Message: ParentMessage,
  Startup,
})
const FinishParentInitialization = Parent.command('FinishInitialization', {
  messages: [ParentMessage.CompletedParentInitialization],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.CompletedParentInitialization())
  },
})
const FinishParentStep = Parent.command('FinishStep', {
  messages: [ParentMessage.CompletedParentStep],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.CompletedParentStep())
  },
})

const AutomaticBinding = Parent.bindChild(ChildBlock, {
  field: 'automatic',
  parentMessage: ParentMessage.GotChildMessage,
  fromParentMessage: false,
})
const DefaultArgumentBinding = Parent.bindChild(DefaultChildBlock, {
  field: 'defaultArgument',
  parentMessage: ParentMessage.GotChildMessage,
  fromParentMessage: false,
})
const OptionalArgumentBinding = Parent.bindChild(OptionalArgumentChildBlock, {
  field: 'optionalArgument',
  parentMessage: ParentMessage.GotChildMessage,
  fromParentMessage: false,
})
const RequiredRestBinding = Parent.bindChild(RequiredRestChildBlock, {
  field: 'requiredRest',
  parentMessage: ParentMessage.GotChildMessage,
  fromParentMessage: false,
  init: { args: startup => [startup.count] },
})
const OptedOutBinding = Parent.bindChild(ChildBlock, {
  field: 'optedOut',
  parentMessage: ParentMessage.GotChildMessage,
  fromParentMessage: false,
  init: false,
})
const PassiveOptionalBinding = Parent.bindChild(ChildBlock, {
  field: 'maybePassive',
  parentMessage: ParentMessage.GotChildMessage,
  fromParentMessage: false,
})
const AutomaticOptionalBinding = Parent.bindChild(ChildBlock, {
  field: 'maybeAutomatic',
  parentMessage: ParentMessage.GotChildMessage,
  fromParentMessage: false,
  init: {
    args: startup =>
      startup.includeOptional ? Option.some([]) : Option.none(),
  },
})
const PassiveEntriesBinding = Parent.bindChild(ChildBlock, {
  field: 'passiveEntries',
  key: 'id',
  childField: 'child',
  toParentMessage: (_id, message) => ParentMessage.GotChildMessage({ message }),
  fromParentMessage: false,
})
const AutomaticEntriesBinding = Parent.bindChild(ChildBlock, {
  field: 'automaticEntries',
  key: 'id',
  childField: 'child',
  toParentMessage: (_id, message) => ParentMessage.GotChildMessage({ message }),
  fromParentMessage: false,
  init: {
    occurrences: startup => startup.entryIds.map(id => ({ key: id, args: [] })),
    toItem: ({ key }, child) => ({ id: key, child }),
  },
})

expectTypeOf(Parent.Startup).toEqualTypeOf(Startup)
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
  childBindings: [
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
const applyParentStep = Parent.step(model => ({
  model: modifyFields(model, { status: () => 'Stepped' }),
  commands: [FinishParentStep()],
}))
const initialize = ParentComposition.makeInit((startup: Startup) => ({
  startup,
  model: {
    optedOut: ChildModel.make({ count: 9 }),
    maybePassive: Option.none(),
    passiveEntries: [],
    status: 'Ready',
  },
  commands: [FinishParentInitialization()],
  steps: [applyParentStep],
}))
const ParentBlock = ParentComposition.makeBlock({
  init: initialize,
  update: ParentComposition.makeUpdate(model => ({ model })),
  EffectsLayer: Layer.merge(
    FinishParentInitialization.layer,
    FinishParentStep.layer,
  ),
})

// @ts-expect-error An opted-out required child remains a mandatory parent-owned field.
ParentComposition.makeInit((startup: Startup) => ({
  startup,
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

expectTypeOf<Parameters<typeof initialize>>().toEqualTypeOf<
  [startup: Startup]
>()
expectTypeOf<
  ReturnType<typeof initialize>['model']
>().toEqualTypeOf<ParentModel>()
expectTypeOf<
  Update.RegistrationEvidenceOf<ReturnType<typeof initialize>>
>().toEqualTypeOf<InitialRegistration>()
expectTypeOf<
  Update.RequirementsOf<typeof initialize>
>().toEqualTypeOf<InitialRequirements>()
expectTypeOf<
  Layer.Services<typeof ParentBlock.EffectsLayer>
>().toEqualTypeOf<StartupClient>()
expectTypeOf<
  Layer.Error<typeof ParentBlock.EffectsLayer>
>().toEqualTypeOf<'StartupUnavailable'>()

if (false) {
  // @ts-expect-error A required-argument child needs init.args or init: false.
  // oxfmt-ignore
  Parent.bindChild(RequiredChildBlock, { field: 'automatic', parentMessage: ParentMessage.GotChildMessage, fromParentMessage: false })
  // @ts-expect-error Child init arguments retain their exact tuple.
  // oxfmt-ignore
  Parent.bindChild(RequiredChildBlock, { field: 'automatic', parentMessage: ParentMessage.GotChildMessage, fromParentMessage: false, init: { args: () => ['wrong'] } })
  // @ts-expect-error A selector must accept every value allowed by Startup.
  // oxfmt-ignore
  Parent.bindChild(ChildBlock, { field: 'automatic', placement: 'narrowStartup', parentMessage: ParentMessage.GotChildMessage, fromParentMessage: false, init: { args: (_startup: Readonly<{ count: 1 }>) => [] } })
  Parent.bindChild(ChildBlock, {
    field: 'automatic',
    placement: 'readonlyStartup',
    parentMessage: ParentMessage.GotChildMessage,
    fromParentMessage: false,
    init: {
      args: startup => {
        // @ts-expect-error Startup Schema fields remain readonly.
        startup.count = 2
        return []
      },
    },
  })
  // @ts-expect-error Optional child initialization requires an explicit presence selector.
  // oxfmt-ignore
  Parent.bindChild(ChildBlock, { field: 'maybePassive', parentMessage: ParentMessage.GotChildMessage, fromParentMessage: false, init: true })
  // @ts-expect-error Keyed init false cannot replace an occurrence policy.
  // oxfmt-ignore
  Parent.bindChild(ChildBlock, { field: 'passiveEntries', key: 'id', childField: 'child', toParentMessage: (_id, message) => ParentMessage.GotChildMessage({ message }), fromParentMessage: false, init: false })

  const optionalInitConfig: Readonly<{
    field: 'automatic'
    parentMessage: typeof ParentMessage.GotChildMessage
    fromParentMessage: false
    init?: false
  }> = {
    field: 'automatic',
    parentMessage: ParentMessage.GotChildMessage,
    fromParentMessage: false,
  }
  // @ts-expect-error An optional init policy cannot ambiguously change default startup.
  Parent.bindChild(ChildBlock, optionalInitConfig)

  const unionInitConfig: Readonly<{
    field: 'automatic'
    parentMessage: typeof ParentMessage.GotChildMessage
    fromParentMessage: false
    init: true | false
  }> = {
    field: 'automatic',
    parentMessage: ParentMessage.GotChildMessage,
    fromParentMessage: false,
    init: true,
  }
  // @ts-expect-error A union init policy does not establish one concrete startup policy.
  Parent.bindChild(ChildBlock, unionInitConfig)
}

const ExactStartupModel = Schema.Struct({ child: ChildModel })
const ExactStartupMessage = defineMessageUnion({
  GotChildMessage: { message: ChildMessage },
})
const ExactStartupOwner = define('StartupDefaultsExact')
const ExactStartup = ExactStartupOwner.define({
  Model: ExactStartupModel,
  Message: ExactStartupMessage,
  Startup,
})
const WiderStartupBinding = ExactStartup.bindChild(ChildBlock, {
  field: 'child',
  parentMessage: ExactStartupMessage.GotChildMessage,
  init: { args: (_startup: object) => [] },
})
const ExactStartupComposition = ExactStartup.makeComposition({
  childBindings: [WiderStartupBinding],
})
ExactStartupComposition.makeInit(() => ({
  // @ts-expect-error A wider selector annotation cannot widen declared Startup evidence.
  startup: {},
  model: {},
}))

const ZeroParameterStartupBinding = ExactStartup.bindChild(ChildBlock, {
  field: 'child',
  parentMessage: ExactStartupMessage.GotChildMessage,
  init: { args: () => [] },
})
const ZeroParameterStartupComposition = ExactStartup.makeComposition({
  childBindings: [ZeroParameterStartupBinding],
})
ZeroParameterStartupComposition.makeInit(() => ({ model: {} }))

const ForeignStartup = Schema.Struct({ token: Schema.String })
const ForeignStartupDefinition = ExactStartupOwner.define({
  Model: ExactStartupModel,
  Message: ExactStartupMessage,
  Startup: ForeignStartup,
})
const ForeignStartupBinding = ForeignStartupDefinition.bindChild(ChildBlock, {
  field: 'child',
  parentMessage: ExactStartupMessage.GotChildMessage,
  init: { args: _startup => [] },
})
if (false) {
  // @ts-expect-error A Binding cannot change another Definition's Startup contract.
  ExactStartup.makeComposition({ childBindings: [ForeignStartupBinding] })
}

const Application = defineApplication({
  Model: ExactStartupModel,
  Message: ExactStartupMessage,
  Startup,
})
Application.bindChild(ChildBlock, {
  field: 'child',
  parentMessage: ExactStartupMessage.GotChildMessage,
  init: {
    args: startup => {
      expectTypeOf(startup).toEqualTypeOf<Startup>()
      return []
    },
  },
})

const Ordinary = define('StartupDefaultsOrdinary', {
  Model: ExactStartupModel,
  Message: ExactStartupMessage,
})
Ordinary.bindChild(ChildBlock, {
  field: 'child',
  parentMessage: ExactStartupMessage.GotChildMessage,
})

it('initializes required direct fields by default and leaves opt-out storage parent-owned', () => {
  childInitCalls.splice(0)
  effects.constructorBuilds = 0
  effects.commandExecutions = 0

  const initialized = initialize({
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

it('rejects an erased Binding from an incompatible Startup contract', () => {
  expect(() =>
    Reflect.apply(ExactStartup.makeComposition, undefined, [
      { childBindings: [ForeignStartupBinding] },
    ]),
  ).toThrow('belongs to a different parent Definition contract')
})

void OptedOutBinding
void PassiveOptionalBinding
void PassiveEntriesBinding
void RequiredChildBlock
