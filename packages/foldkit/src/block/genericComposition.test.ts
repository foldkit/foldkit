import { Effect, Layer, Schema } from 'effect'
import { expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { makeDefinition, makeNamespace } from './define.js'
import * as Block from './public.js'

const Message = defineMessageUnion({
  RequestedWork: {},
  CompletedWork: {},
})
const makeGenericComplete = <const Id extends string>(id: Id) => {
  const FeatureNamespace = makeNamespace(id)
  const Model = Schema.Struct({ value: Schema.String })
  const Work = FeatureNamespace.makeCommand('Work', {
    messages: [Message.CompletedWork],
    handler: function* () {
      return () => Effect.succeed(Message.CompletedWork())
    },
  })

  const composition = FeatureNamespace.makeDefinition({
    Model,
    Message,
  }).makeComposition()

  const prepare = () =>
    composition.prepareBlock({
      init: () => ({ model: Model.make({ value: '' }) }),
      update: composition.makeUpdate({
        RequestedWork: model => ({ model, commands: [Work()] }),
        CompletedWork: model => ({ model }),
      }),
      view: composition.makeView((model, h) => h.div([], [model.value])),
      EffectsLayer: Work.layer,
    })
  const completedBlock: Block.FromAssemblyWithView<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)
  return completedBlock
}

const makeGenericMissing = <const Id extends string>(id: Id) => {
  const FeatureNamespace = makeNamespace(id)
  const Model = Schema.Struct({ value: Schema.String })
  const Work = FeatureNamespace.makeCommand('Work', {
    messages: [Message.CompletedWork],
  })

  const composition = FeatureNamespace.makeDefinition({
    Model,
    Message,
  }).makeComposition()

  const prepare = () =>
    composition.prepareBlock({
      init: () => ({ model: Model.make({ value: '' }) }),
      update: composition.makeUpdate({
        RequestedWork: model => ({ model, commands: [Work()] }),
        CompletedWork: model => ({ model }),
      }),
      view: composition.makeView((model, h) => h.div([], [model.value])),
      EffectsLayer: Layer.empty,
    })
  const completedBlock: Block.FromAssemblyWithView<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)
  return completedBlock
}

const complete = makeGenericComplete('GenericComplete')
const CompleteParentModel = Schema.Struct({ child: complete.Model })

const CompleteParent = makeDefinition('GenericCompleteParent', {
  Model: CompleteParentModel,
  Message: Schema.Never,
})
const CompleteBinding = CompleteParent.makeBinding(complete, {
  placement: 'GenericComplete',
  field: 'child',
})

it('keeps a complete generic Block connectable after literal instantiation', () => {
  expectTypeOf(CompleteBinding.placement).toEqualTypeOf<'GenericComplete'>()
})

if (false) {
  const missing = makeGenericMissing('GenericMissing')
  const MissingParentModel = Schema.Struct({ child: missing.Model })
  const MissingParent = makeDefinition('GenericMissingParent', {
    Model: MissingParentModel,
    Message: Schema.Never,
  })

  // @ts-expect-error Concrete Bindings validate deferred generic handler coverage.
  MissingParent.makeBinding(missing, {
    placement: 'GenericMissing',
    field: 'child',
  })
}
