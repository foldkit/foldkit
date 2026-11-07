import { Effect, Schema } from 'effect'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import * as Block from '../../block/public.js'
import {
  defineInMessageUnion,
  defineMessageUnion,
} from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'
import { withBlock } from '../layered/testing/withBlock.js'

const Model = Schema.Struct({ value: Schema.Number })
type Model = typeof Model.Type
const defaults = { runs: 0 }
const InMessage = defineInMessageUnion({
  RequestedSet: {
    value: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)).pipe(
      Schema.withConstructorDefault(
        Effect.sync(() => {
          defaults.runs += 1
          return 2
        }),
      ),
    ),
  },
  InformedOfClear: {},
})
const InputOnlyKey = Symbol('InputOnlyRuntime')
const Definition = Block.makeDefinition('InputOnlyRuntime', {
  key: InputOnlyKey,
  Model,
  Message: Schema.Never,
  InMessage,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const Composition = Definition.makeComposition()
const init = Composition.makeInit(() => ({ model: Model.make({ value: 0 }) }))
const update = Composition.makeUpdate({})
const inMessageUpdate = Composition.makeInMessageUpdate({
  RequestedSet: Definition.makeFieldsStep.fromMessage(({ value }) => ({
    value: () => value,
  })),
  InformedOfClear: Definition.makeFieldsStep(() => ({ value: () => 0 })),
})
const InputBlock = Definition.makeBlock(
  Effect.succeed({ children: [], init, update, inMessageUpdate }),
)

const acquireErased = (block: object) =>
  Reflect.apply(Effect.runPromise, undefined, [
    Reflect.apply(withBlock, undefined, [block, () => undefined]),
  ])
const declareErased = (config: object) =>
  Reflect.apply(Block.makeDefinition, undefined, [
    'InvalidInputRuntime',
    {
      key: Symbol('InvalidInputRuntime'),
      Model,
      Message: Schema.Never,
      InitArgs: Schema.Tuple([]),
      ...config,
    },
  ])

describe('separate InMessage execution', () => {
  it.effect(
    'keeps input-only Blocks message-free and defers default producers until a request',
    () =>
      Effect.gen(function* () {
        expect(defaults.runs).toBe(0)

        yield* withBlock(InputBlock, block => {
          const initialModel = block.init().model
          expect(defaults.runs).toBe(0)
          expect(block.InMessage).toBe(InMessage)
          expect(Schema.is(block.Message)(InMessage.InformedOfClear())).toBe(
            false,
          )

          const applied = block.operations.requestSet(initialModel, {})
          expect(defaults.runs).toBe(1)
          expect(applied.model.value).toBe(2)
          expect(applied.commands).toBeUndefined()

          const requested = InMessage.RequestedSet({ value: 5 })
          expect(
            block.inMessageUpdate(initialModel, requested).model.value,
          ).toBe(5)
          expect(
            block.inMessageUpdate(requested)(initialModel).model.value,
          ).toBe(5)
          expect(
            block.operations.informOfClear(applied.model).model.value,
          ).toBe(0)
          expect(block.operations).not.toHaveProperty('informClear')
        })
      }),
  )

  it.effect(
    'validates the decoded payload before applying a inMessageUpdate handler',
    () =>
      withBlock(InputBlock, block => {
        const initialModel = block.init().model

        for (const input of [
          { _tag: 'RequestedSet', value: -1 },
          { _tag: 'RequestedSet', value: '1' },
          { _tag: 'InformedOfClearOther' },
        ]) {
          expect(() =>
            Reflect.apply(block.inMessageUpdate, undefined, [
              initialModel,
              input,
            ]),
          ).toThrow('decoded value')
          expect(initialModel.value).toBe(0)
        }
      }),
  )

  it('rejects erased missing, extra, and callback inMessageUpdate cases', async () => {
    const invalidCases = [
      {
        cases: { InformedOfClear: (model: Model) => ({ model }) },
        expected: 'InMessage update has no handler',
      },
      {
        cases: {
          RequestedSet: (model: Model) => ({ model }),
          InformedOfClear: (model: Model) => ({ model }),
          RequestedOther: (model: Model) => ({ model }),
        },
        expected: 'invalid tag "RequestedOther"',
      },
      {
        cases: (model: Model) => ({ model }),
        expected: 'requires an exhaustive handler record',
      },
    ]

    for (const { cases, expected } of invalidCases) {
      const invalidInMessageUpdate = Reflect.apply(
        Composition.makeInMessageUpdate,
        undefined,
        [cases],
      )
      const invalid = Reflect.apply(Definition.makeBlock, undefined, [
        Effect.succeed({
          children: [],
          init,
          update,
          inMessageUpdate: invalidInMessageUpdate,
        }),
      ])

      await expect(acquireErased(invalid)).rejects.toThrow(expected)
    }
  })

  it('requires an inMessageUpdate plan from the selected Composition', async () => {
    const incomplete = Reflect.apply(Definition.makeBlock, undefined, [
      Effect.succeed({ children: [], init, update }),
    ])
    await expect(acquireErased(incomplete)).rejects.toThrow(
      'makeInMessageUpdate plan',
    )

    const otherComposition = Definition.makeComposition()
    const foreignInMessageUpdate = otherComposition.makeInMessageUpdate({
      RequestedSet: model => ({ model }),
      InformedOfClear: model => ({ model }),
    })
    const foreign = Reflect.apply(Definition.makeBlock, undefined, [
      Effect.succeed({
        children: [],
        init,
        update,
        inMessageUpdate: foreignInMessageUpdate,
      }),
    ])
    await expect(acquireErased(foreign)).rejects.toThrow(/Composition/)
  })

  it.effect(
    'resolves a received transition against the preceding Step Model',
    () =>
      Effect.gen(function* () {
        const ParentKey = Symbol('InputSequenceRuntime')
        const ParentMessage = defineMessageUnion({ ClickedSet: {} })
        const ParentDefinition = Block.makeDefinition('InputSequenceRuntime', {
          key: ParentKey,
          Model: Schema.Struct({ child: Model }),
          Message: ParentMessage,
          InitArgs: Schema.Tuple([]),
        })
        const ChildBinding = ParentDefinition.makeRequiredFieldBinding(
          Definition.contract,
          {
            field: 'child',
          },
        )
        const ParentComposition = ParentDefinition.makeComposition({
          bindings: [ChildBinding],
        })
        const ParentBlock = ParentDefinition.makeBlock(
          Effect.gen(function* () {
            const child = yield* ChildBinding

            return {
              children: [child],
              init: ParentComposition.makeInit(() => ({ model: {} })),
              update: ParentComposition.makeUpdate({
                ClickedSet: ParentDefinition.makeStep(() =>
                  Update.combineSteps([
                    ParentDefinition.makeFieldsStep(() => ({
                      child: child => modifyFields(child, { value: () => 10 }),
                    })),
                    ParentDefinition.makeStep(model =>
                      ChildBinding.requestSet({ value: model.child.value + 1 }),
                    ),
                  ]),
                ),
              }),
            }
          }),
        ).provide(InputBlock.layer)

        yield* withBlock(ParentBlock, block => {
          const parentInit = block.init()
          const applied = block.update(
            parentInit.model,
            ParentMessage.ClickedSet(),
          )
          expect(applied.model.child.value).toBe(11)
        })
      }),
  )

  it.effect(
    'executes nested inMessageUpdate under the normalized child graph and its selected OutMessage policy',
    () =>
      Effect.gen(function* () {
        const Reported = defineMessageUnion({
          Reported: { value: Schema.Number },
        })
        const ReportInput = defineInMessageUnion({
          RequestedReport: { value: Schema.Number },
        })
        const ReporterKey = Symbol('InputReporterRuntime')
        const ReporterDefinition = Block.makeDefinition(
          'InputReporterRuntime',
          {
            key: ReporterKey,
            Model,
            Message: Schema.Never,
            InMessage: ReportInput,
            OutMessage: Reported,
            isMessageFree: true,
            InitArgs: Schema.Tuple([]),
            inMessageOutputs: {
              RequestedReport: { outMessage: Reported.Reported },
            },
          },
        )
        const ReporterComposition = ReporterDefinition.makeComposition()
        const ReporterBlock = ReporterDefinition.makeBlock(
          Effect.succeed({
            children: [],
            init: ReporterComposition.makeInit(() => ({ model: { value: 0 } })),
            update: ReporterComposition.makeUpdate({}),
            inMessageUpdate: ReporterComposition.makeInMessageUpdate({
              RequestedReport:
                ReporterDefinition.makeOutMessageStep.fromMessage(({ value }) =>
                  Reported.Reported({ value }),
                ),
            }),
          }),
        )
        const ParentKey = Symbol('InputPolicyRuntime')
        const ParentDefinition = Block.makeDefinition('InputPolicyRuntime', {
          key: ParentKey,
          Model: Schema.Struct({
            reporter: Model,
            lastReported: Schema.Number,
          }),
          Message: Schema.Never,
          InMessage: ReportInput,
          isMessageFree: true,
          InitArgs: Schema.Tuple([]),
        })
        const ReporterBinding = ParentDefinition.makeRequiredFieldBinding(
          ReporterDefinition.contract,
          {
            field: 'reporter',
          },
        ).withOutMessagePolicy({
          fold: ParentDefinition.makeOutMessageFold(
            ReporterDefinition.contract,
            {
              Reported: ({ value }) =>
                ParentDefinition.makeFieldsStep(() => ({
                  lastReported: () => value,
                })),
            },
          ),
        })
        const ParentComposition = ParentDefinition.makeComposition({
          bindings: [ReporterBinding],
        })
        const ParentBlock = ParentDefinition.makeBlock(
          Effect.gen(function* () {
            const reporter = yield* ReporterBinding

            return {
              children: [reporter],
              init: ParentComposition.makeInit(() => ({
                model: { lastReported: 0 },
              })),
              update: ParentComposition.makeUpdate({}),
              inMessageUpdate: ParentComposition.makeInMessageUpdate({
                RequestedReport: ParentDefinition.makeStep.fromMessage(
                  ({ value }) => ReporterBinding.requestReport({ value }),
                ),
              }),
            }
          }),
        ).provide(ReporterBlock.layer)

        yield* withBlock(ParentBlock, block => {
          const parentInit = block.init()
          const reported = block.inMessageUpdate(
            parentInit.model,
            ReportInput.RequestedReport({ value: 42 }),
          )
          expect(reported.model.lastReported).toBe(42)
          expect(reported.outMessage).toBeUndefined()
          expect(
            block.operations.requestReport(parentInit.model, { value: 7 }).model
              .lastReported,
          ).toBe(7)
        })
      }),
  )
})

describe('erased InMessage declarations', () => {
  it('rejects tag overlap, invalid input names, generated method collisions, and output typos', () => {
    const overlap = defineMessageUnion({ InformedOfClear: {} })

    expect(() =>
      declareErased({ Message: overlap, InMessage: overlap }),
    ).toThrow('distinct')
    expect(() =>
      declareErased({ InMessage: defineMessageUnion({ ClickedClear: {} }) }),
    ).toThrow('Requested')
    expect(() =>
      declareErased({
        InMessage,
        operations: { informOfClear: overlap.InformedOfClear },
      }),
    ).toThrow('conflicts')
    expect(() =>
      declareErased({ InMessage, inMessageOutputs: { RequestedOther: {} } }),
    ).toThrow('undeclared input')
    expect(() => declareErased({ inMessageOutputs: {} })).toThrow(
      'require an InMessage',
    )
    expect(() =>
      declareErased({
        InMessage,
        inMessageOutputs: {
          RequestedSet: { message: overlap.InformedOfClear },
        },
      }),
    ).toThrow('support only')
  })

  it('rejects borrowed constructors even when their decoded payload has the same shape', () => {
    const foreign = defineMessageUnion({ InformedOfClear: {} })

    const borrowed = Object.create(InMessage, {
      InformedOfClear: { value: foreign.InformedOfClear },
    })

    expect(() => declareErased({ InMessage: borrowed })).toThrow(
      'same-shaped constructor',
    )
  })
})
