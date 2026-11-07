import { Array, Effect, Schema } from 'effect'

import { Block, Update } from '../../../index.js'
import { ApplicationBlock } from './block.js'
import { ApplicationComposition, CountersBinding } from './composition.js'
import { CounterBlock } from './counter.js'
import {
  ApplicationDefinition,
  Message,
  Model,
  makeFieldsStep,
} from './definition.js'
import {
  FamilyDefinition,
  NumberFamily,
  NumbersBinding,
  StringsBinding,
  ValueFamily,
} from './familyFields.js'
import {
  PairedComposition,
  PairedDefinition,
  PrimaryCountersBinding,
} from './pairedFields.js'
import { addCounter } from './transitions.js'

const rejectInvalid = (model: Model) => {
  const creation = CountersBinding.create({ key: 'new', args: [4] })

  // @ts-expect-error The exact initializer tuple cannot accept a string.
  CountersBinding.create({ key: 'new', args: ['four'] })
  // @ts-expect-error Standard Instance keys are strings.
  CountersBinding.create({ key: 4, args: [4] })
  // @ts-expect-error A creation request is not a ready Model value.
  Model.make({ ...model, counters: [creation] })
  // @ts-expect-error Pending requests have no child Model to read.
  creation.model.count
  // @ts-expect-error The unexecuted connected Step has no readable result Model.
  addCounter('new', 4)(model).model

  const OtherKey = Symbol('OtherOccurrenceParent')
  const OtherDefinition = Block.makeDefinition('OtherOccurrenceParent', {
    key: OtherKey,
    Model,
    Message,
    InitArgs: Schema.Tuple([]),
  })
  const OtherCountersBinding = OtherDefinition.makeKeyedArrayBinding(
    CounterBlock,
    {
      field: 'counters',
      key: 'key',
      childField: 'model',
    },
  ).withOutMessagePolicy({ fold: () => OtherDefinition.makeNoopStep() })

  makeFieldsStep(() => ({
    // @ts-expect-error Structural Model compatibility cannot transfer parent ownership.
    counters: Array.append(
      OtherCountersBinding.create({ key: 'new', args: [4] }),
    ),
  }))

  const UnregisteredComposition = ApplicationDefinition.makeComposition()
  const invalidUpdate = UnregisteredComposition.makeUpdate({
    ClickedAddCounter: addCounter('new', 4),
    ClickedAddAndIncrement: model => ({ model }),
    ClickedRemoveCounter: model => ({ model }),
  })
  // @ts-expect-error Completion retains the missing Binding registration obligation.
  ApplicationDefinition.makeBlock(
    Effect.succeed({
      children: [],
      init: UnregisteredComposition.makeInit(_counts => ({
        model: { counters: [], summary: 0, lastChangedCount: 0 },
      })),
      update: invalidUpdate,
      view: UnregisteredComposition.makeView((_model, h) => h.div([])),
    }),
  )
}
void rejectInvalid

const rejectMismatchedFields = () => {
  PairedDefinition.makeFieldsStep(() => ({
    // @ts-expect-error Exact child and parent ownership does not authorize another Instance field.
    secondaryCounters: Array.append(
      PrimaryCountersBinding.create({ key: 'wrong-field', args: [3] }),
    ),
  }))
  NumbersBinding.create({ key: 'number', args: [{ value: 4 }] })
  StringsBinding.create({ key: 'string', args: [{ value: 'Four' }] })
  // @ts-expect-error Family specialization retains the exact initializer Schema.
  NumbersBinding.create({ key: 'number', args: [{ value: 'Four' }] })
  // @ts-expect-error Family specialization retains the exact initializer Schema.
  StringsBinding.create({ key: 'string', args: [{ value: 4 }] })
  FamilyDefinition.makeFieldsStep(() => ({
    // @ts-expect-error Generic family creation requests retain the specialized child contract.
    strings: Array.append(
      NumbersBinding.create({ key: 'wrong-family', args: [{ value: 4 }] }),
    ),
  }))
  const stringField = Object.freeze({
    field: 'strings',
    placement: 'crossFamily',
    key: 'key',
    childField: 'model',
  })
  // @ts-expect-error A numeric child cannot occupy the string-specialized Instance field.
  FamilyDefinition.makeKeyedArrayBinding(NumberFamily.block, stringField)

  const { definition, recipe } = NumberFamily
  const options = { members: { Instance: Schema.String } }
  // @ts-expect-error Instance metadata belongs to the declared family contract.
  Block.makeFamilyContract(definition, ValueFamily, () => recipe, options)

  PairedComposition.makeUpdate.withContext((offset: number) => ({
    ClickedAddPair: PairedDefinition.makeFieldsStep(
      (_model, { key, count }) => ({
        primaryCounters: Array.append(
          PrimaryCountersBinding.create({ key, args: [count + offset] }),
        ),
      }),
    ),
    ClickedIncrementPrimary: model => ({ model }),
    ClickedIncrementSecondary: model => ({ model }),
    ClickedKeepCounters: model => ({ model }),
  }))
}
void rejectMismatchedFields

export const payloadOnlyUpdate = ApplicationComposition.makeUpdate({
  ClickedAddCounter: makeFieldsStep.fromMessage(({ key, count }) => ({
    counters: Array.append(CountersBinding.create({ key, args: [count] })),
  })),
  ClickedAddAndIncrement: model => ({ model }),
  ClickedRemoveCounter: model => ({ model }),
})

export type PublicApplicationModel = typeof ApplicationBlock.Model.Type
export type CreationRequirements = Update.RequirementsOf<
  ReturnType<typeof addCounter>
>
