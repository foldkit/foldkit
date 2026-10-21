import { Context, Effect, Layer, Schema } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Program from '../runtime/programPublic.js'
import { modifyFields } from '../struct/index.js'
import { makeNamespace } from './define.js'
import { ImplementationTypeId, LocalEffectsLayerTypeId } from './definition.js'
import type {
  OperationRequirementsOfBlock,
  RequirementsOfBlock,
} from './requirements.js'

const CounterModel = Schema.Struct({ count: Schema.Number })
const CounterMessage = defineMessageUnion({
  ClickedIncrement: {},
  RequestedSave: {},
  CompletedSave: {},
})

class Store extends Context.Service<
  Store,
  Readonly<{ save: (count: number) => Effect.Effect<void> }>
>()('ImplementedBlockTest/Store') {}

const makeCounter = (namespace: string) => {
  const Definition = makeNamespace(namespace).makeDefinition({
    Model: CounterModel,
    Message: CounterMessage,
  })
  const SaveCount = Definition.makeCommand('SaveCount', {
    args: { count: Schema.Number },
    messages: [CounterMessage.CompletedSave],
    handler: function* () {
      const store = yield* Store
      return ({ count }) =>
        store.save(count).pipe(Effect.as(CounterMessage.CompletedSave()))
    },
  })
  const Composition = Definition.makeComposition()
  const update = Composition.makeUpdate((model, message) =>
    CounterMessage.match(message, {
      ClickedIncrement: () => ({
        model: modifyFields(model, { count: count => count + 1 }),
      }),
      RequestedSave: () => ({
        model,
        commands: [SaveCount({ count: model.count })],
      }),
      CompletedSave: () => ({ model }),
    }),
  )
  const view = Composition.makeView((model, h) =>
    h.button(
      [h.OnClick(CounterMessage.ClickedIncrement())],
      [String(model.count)],
    ),
  )

  return { Composition, SaveCount, update, view }
}

describe('Composition.implement', () => {
  it('captures and assembles an implementation passively', () => {
    const { Composition, SaveCount, update, view } =
      makeCounter('ImplementedPassive')
    let initCalls = 0
    let layerBuilds = 0
    const EffectsLayer = Layer.suspend(() => {
      layerBuilds += 1
      return SaveCount.layer
    })
    const init = Composition.makeInit(() => {
      initCalls += 1
      return { model: CounterModel.make({ count: 0 }) }
    })

    const implemented = Composition.implement({
      init,
      update,
      view,
      EffectsLayer,
    })
    const block = implemented.assembleBlock()

    expect(implemented[ImplementationTypeId]).toEqual({
      init,
      update,
      view,
      EffectsLayer,
    })
    expect(block[LocalEffectsLayerTypeId]).toBe(EffectsLayer)
    expect(initCalls).toBe(0)
    expect(layerBuilds).toBe(0)
  })

  it('returns the Block that assembleBlock returns for the same implementation', () => {
    const { Composition, SaveCount, update, view } = makeCounter(
      'ImplementedEquivalent',
    )
    const init = Composition.makeInit(() => ({
      model: CounterModel.make({ count: 2 }),
    }))
    const implementation = {
      init,
      update,
      view,
      EffectsLayer: SaveCount.layer,
    }

    const implemented = Composition.implement(implementation).assembleBlock()
    const assembled = Composition.assembleBlock(implementation)

    expectTypeOf(implemented).toEqualTypeOf(assembled)
    expect(Reflect.ownKeys(implemented)).toEqual(Reflect.ownKeys(assembled))
    expect(implemented.Model).toBe(assembled.Model)
    expect(implemented.Message).toBe(assembled.Message)
    expect(implemented.owner).toBe(assembled.owner)
    expect(implemented.init).toBe(assembled.init)
    expect(implemented[LocalEffectsLayerTypeId]).toBe(
      assembled[LocalEffectsLayerTypeId],
    )

    const { model } = implemented.init()

    expect(
      implemented.update(model, CounterMessage.ClickedIncrement()),
    ).toEqual(assembled.update(model, CounterMessage.ClickedIncrement()))
    expect(
      implemented
        .update(model, CounterMessage.RequestedSave())
        .commands?.map(command => command.name),
    ).toEqual(
      assembled
        .update(model, CounterMessage.RequestedSave())
        .commands?.map(command => command.name),
    )
  })

  it('keeps the exact requirements of the implemented Block', () => {
    const { Composition, SaveCount, update } = makeCounter(
      'ImplementedRequirements',
    )
    const implementation = {
      init: Composition.makeInit(() => ({
        model: CounterModel.make({ count: 0 }),
      })),
      update,
      view: Composition.makeView((model, h) => ({
        title: 'Implemented',
        body: h.main([], [String(model.count)]),
      })),
      EffectsLayer: SaveCount.layer,
    }
    const implemented = Composition.implement(implementation).assembleBlock()
    const assembled = Composition.assembleBlock(implementation)
    const makeImplementedProgram = () =>
      Program.make({ block: implemented, container: null })
    const makeAssembledProgram = () =>
      Program.make({ block: assembled, container: null })

    expectTypeOf<
      RequirementsOfBlock<typeof implemented>
    >().toEqualTypeOf<Store>()
    expectTypeOf<
      OperationRequirementsOfBlock<typeof implemented>
    >().toEqualTypeOf<OperationRequirementsOfBlock<typeof assembled>>()
    expectTypeOf<ReturnType<typeof makeImplementedProgram>>().toEqualTypeOf<
      ReturnType<typeof makeAssembledProgram>
    >()
  })
})
