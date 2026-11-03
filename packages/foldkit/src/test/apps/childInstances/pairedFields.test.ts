import { Array } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { it } from '@effect/vitest'

import * as Story from '../../../story/public.js'
import * as Update from '../../../update/index.js'
import { CounterBlock, initializationCounts } from './counter.js'
import {
  PairedBlock,
  PairedDefinition,
  PairedInMessage,
  PairedMessage,
  PairedModel,
  PrimaryCountersBinding,
  SecondaryCountersBinding,
  addPair,
} from './pairedFields.js'

it.effect(
  'keeps two occurrences of the same child and key independent by field',
  () =>
    Story.withBlock(PairedBlock, executable => {
      initializationCounts.length = 0
      const initial = executable.init()
      const added = executable.update(
        initial.model,
        PairedMessage.ClickedAddPair({ key: 'shared', count: 4 }),
        10,
      )

      expect(initializationCounts).toEqual([14, 15])
      expect(added.commands).toHaveLength(2)
      expect(added.model.total).toBe(29)

      const primary = executable.update(
        added.model,
        PairedMessage.ClickedIncrementPrimary({ key: 'shared' }),
        0,
      )
      const secondary = executable.update(
        primary.model,
        PairedMessage.ClickedIncrementSecondary({ key: 'shared' }),
        0,
      )

      expect(primary.model.primaryCount).toBe(15)
      expect(primary.model.secondaryCount).toBe(0)
      expect(primary.model.secondaryCounters).toBe(
        added.model.secondaryCounters,
      )
      expect(secondary.model.primaryCount).toBe(15)
      expect(secondary.model.secondaryCount).toBe(16)
      expect(secondary.model.primaryCounters).toBe(
        primary.model.primaryCounters,
      )
    }),
)

it.effect(
  'resolves creation before later Steps in a context-bearing InMessage update',
  () =>
    Story.withBlock(PairedBlock, executable => {
      const initial = executable.init()
      const added = executable.inMessageUpdate(
        PairedInMessage.RequestedAddPair({ key: 'input', count: 2 }),
      )(initial.model, 3)

      expect(added.model.primaryCounters).toEqual([
        { key: 'input', model: { count: 5 } },
      ])
      expect(added.model.secondaryCounters).toEqual([
        { key: 'input', model: { count: 6 } },
      ])
      expect(added.model.total).toBe(11)
      expect(added.commands).toHaveLength(2)
    }),
)

it.effect(
  'preserves Model identity when an Instance field Step changes no fields',
  () =>
    Story.withBlock(PairedBlock, executable => {
      const initial = executable.init()
      const unchanged = executable.update(
        initial.model,
        PairedMessage.ClickedKeepCounters(),
        0,
      )

      expect(unchanged.model).toBe(initial.model)
      expect(unchanged.commands).toBeUndefined()
    }),
)

it('retains the same exact init requirements and registrations as explicit Binding init', () => {
  const initializePrimary = () =>
    PrimaryCountersBinding.init({
      key: 'first',
      args: [4],
      toParentModel: model =>
        PairedModel.make({
          primaryCounters: [
            CounterBlock.Instance.make({ key: 'first', model }),
          ],
          secondaryCounters: [],
          primaryCount: 0,
          secondaryCount: 0,
          total: 0,
        }),
    })
  const initializeSecondary = () =>
    SecondaryCountersBinding.init({
      key: 'second',
      args: [5],
      toParentModel: model =>
        PairedModel.make({
          primaryCounters: [],
          secondaryCounters: [
            CounterBlock.Instance.make({ key: 'second', model }),
          ],
          primaryCount: 0,
          secondaryCount: 0,
          total: 0,
        }),
    })

  expectTypeOf<
    Update.RequirementsOf<ReturnType<typeof addPair>>
  >().toEqualTypeOf<
    | Update.RequirementsOf<typeof initializePrimary>
    | Update.RequirementsOf<typeof initializeSecondary>
  >()
  expectTypeOf<
    Update.RegistrationEvidenceOf<ReturnType<ReturnType<typeof addPair>>>
  >().toEqualTypeOf<
    | Update.RegistrationEvidenceOf<ReturnType<typeof initializePrimary>>
    | Update.RegistrationEvidenceOf<ReturnType<typeof initializeSecondary>>
  >()

  const checkRejectedFields = () =>
    PairedDefinition.makeFieldsStep(() => ({
      // @ts-expect-error Matching child and parent ownership cannot transfer a token to another field.
      secondaryCounters: Array.append(
        PrimaryCountersBinding.create({ key: 'wrong-field', args: [3] }),
      ),
    }))
  void checkRejectedFields
})
