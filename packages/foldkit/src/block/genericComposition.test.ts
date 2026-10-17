import { Effect, Layer, Option, Schema } from 'effect'
import { expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { define } from './define.js'

const Message = defineMessageUnion({
  RequestedWork: {},
  CompletedWork: {},
})
type Message = typeof Message.Type

const makeGenericComplete = <const Id extends string>(id: Id) => {
  const Feature = define(id)
  const Model = Schema.Struct({ value: Schema.String })
  type Model = typeof Model.Type
  const Work = Feature.command('Work', {
    messages: [Message.CompletedWork],
    handler: function* () {
      return () => Effect.succeed(Message.CompletedWork())
    },
  })
  const definition = Feature.define({ Model, Message })
  const composition = definition.makeComposition()

  return composition.makeBlock({
    init: () => ({ model: Model.make({ value: '' }) }),
    update: composition.makeUpdate((model, message) =>
      Message.match(message, {
        RequestedWork: () => ({ model, commands: [Work()] }),
        CompletedWork: () => ({ model }),
      }),
    ),
    view: composition.makeView((model, h) => h.div([], [model.value])),
    EffectsLayer: Work.layer,
  })
}

const makeGenericMissing = <const Id extends string>(id: Id) => {
  const Feature = define(id)
  const Model = Schema.Struct({ value: Schema.String })
  type Model = typeof Model.Type
  const Work = Feature.command('Work', {
    messages: [Message.CompletedWork],
  })
  const definition = Feature.define({ Model, Message })
  const composition = definition.makeComposition()

  return composition.makeBlock({
    init: () => ({ model: Model.make({ value: '' }) }),
    update: composition.makeUpdate((model, message) =>
      Message.match(message, {
        RequestedWork: () => ({ model, commands: [Work()] }),
        CompletedWork: () => ({ model }),
      }),
    ),
    view: composition.makeView((model, h) => h.div([], [model.value])),
    EffectsLayer: Layer.empty,
  })
}

const complete = makeGenericComplete('GenericComplete')
type CompleteModel = typeof complete.Model.Type

const CompleteParent = define('GenericCompleteParent', {
  Model: complete.Model,
  Message: complete.Message,
})
const CompleteBinding = CompleteParent.bindChild(complete, {
  fromParentMessage: false,
  read: (model: CompleteModel) => Option.some(model),
  write: (_model: CompleteModel, nextModel: CompleteModel) => nextModel,
  toParentMessage: (message: Message) => message,
})

it('keeps a complete generic Block connectable after literal instantiation', () => {
  expectTypeOf(CompleteBinding.placement).toEqualTypeOf<'GenericComplete'>()
})

if (false) {
  const missing = makeGenericMissing('GenericMissing')
  type MissingModel = typeof missing.Model.Type
  const MissingParent = define('GenericMissingParent', {
    Model: missing.Model,
    Message: missing.Message,
  })

  MissingParent.bindChild(missing, {
    // @ts-expect-error Deferred generic handler coverage prevents accessor overload selection.
    read: (model: MissingModel) => Option.some(model),
    // @ts-expect-error Concrete Bindings validate deferred generic handler coverage.
    write: (_model: MissingModel, nextModel: MissingModel) => nextModel,
    // @ts-expect-error Concrete Bindings validate deferred generic handler coverage.
    toParentMessage: (message: Message) => message,
  })
}
