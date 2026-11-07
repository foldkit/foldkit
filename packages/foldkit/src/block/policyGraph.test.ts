import { Schema, Tuple } from 'effect'
import { expect, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Update from '../update/index.js'
import * as Block from './public.js'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  RequestedNotify: {},
  InformedOfIncrement: {},
})
type Message = typeof Message.Type
const OutMessage = defineMessageUnion({ Notify: {} })
type OutMessage = typeof OutMessage.Type
const Definition = Block.makeDefinition('Child', { Model, Message, OutMessage })
const ChildComposition = Definition.makeComposition()
const prepare = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({ model: { count: 0 } })),
    update: ChildComposition.makeUpdate({
      RequestedNotify: model => ({ model, outMessage: OutMessage.Notify() }),
      InformedOfIncrement: model => ({
        model: { count: model.count + 1 },
      }),
    }),
    operations: {
      requestNotify: () => Tuple.make(Message.RequestedNotify()),
      informOfIncrement: () => Tuple.make(Message.InformedOfIncrement()),
    },
  })
const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

const ApplicationDefinition = Block.makeDefinition('Parent', {
  Model: Schema.Struct({
    b0: ChildBlock.Model,
    b1: ChildBlock.Model,
    b2: ChildBlock.Model,
    b3: ChildBlock.Model,
    b4: ChildBlock.Model,
    b5: ChildBlock.Model,
    b6: ChildBlock.Model,
    b7: ChildBlock.Model,
    b8: ChildBlock.Model,
    b9: ChildBlock.Model,
    b10: ChildBlock.Model,
    b11: ChildBlock.Model,
  }),
  Message: defineMessageUnion({ ClickedNotify: {} }),
})

const b0 = ApplicationDefinition.makeRequiredFieldBinding(ChildBlock, {
  field: 'b0',
  init: { contextToArgs: () => [] },
})

const b1 = ApplicationDefinition.makeRequiredFieldBinding(ChildBlock, {
  field: 'b1',
  init: { contextToArgs: () => [] },
})

const b2 = ApplicationDefinition.makeRequiredFieldBinding(ChildBlock, {
  field: 'b2',
  init: { contextToArgs: () => [] },
})

const b3 = ApplicationDefinition.makeRequiredFieldBinding(ChildBlock, {
  field: 'b3',
  init: { contextToArgs: () => [] },
})

const b4 = ApplicationDefinition.makeRequiredFieldBinding(ChildBlock, {
  field: 'b4',
  init: { contextToArgs: () => [] },
})

const b5 = ApplicationDefinition.makeRequiredFieldBinding(ChildBlock, {
  field: 'b5',
  init: { contextToArgs: () => [] },
})

const b6 = ApplicationDefinition.makeRequiredFieldBinding(ChildBlock, {
  field: 'b6',
  init: { contextToArgs: () => [] },
})

const b7 = ApplicationDefinition.makeRequiredFieldBinding(ChildBlock, {
  field: 'b7',
  init: { contextToArgs: () => [] },
})

const b8 = ApplicationDefinition.makeRequiredFieldBinding(ChildBlock, {
  field: 'b8',
  init: { contextToArgs: () => [] },
})

const b9 = ApplicationDefinition.makeRequiredFieldBinding(ChildBlock, {
  field: 'b9',
  init: { contextToArgs: () => [] },
})

const b10 = ApplicationDefinition.makeRequiredFieldBinding(ChildBlock, {
  field: 'b10',
  init: { contextToArgs: () => [] },
})

const b11 = ApplicationDefinition.makeRequiredFieldBinding(ChildBlock, {
  field: 'b11',
  init: { contextToArgs: () => [] },
})

const p0 = b0.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b1.informOfIncrement(),
        b2.informOfIncrement(),
        b3.informOfIncrement(),
      ]),
  }),
})

const p1 = b1.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b2.informOfIncrement(),
        b3.informOfIncrement(),
        b4.informOfIncrement(),
      ]),
  }),
})

const p2 = b2.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b3.informOfIncrement(),
        b4.informOfIncrement(),
        b5.informOfIncrement(),
      ]),
  }),
})

const p3 = b3.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b4.informOfIncrement(),
        b5.informOfIncrement(),
        b6.informOfIncrement(),
      ]),
  }),
})

const p4 = b4.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b5.informOfIncrement(),
        b6.informOfIncrement(),
        b7.informOfIncrement(),
      ]),
  }),
})

const p5 = b5.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b6.informOfIncrement(),
        b7.informOfIncrement(),
        b8.informOfIncrement(),
      ]),
  }),
})

const p6 = b6.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b7.informOfIncrement(),
        b8.informOfIncrement(),
        b9.informOfIncrement(),
      ]),
  }),
})

const p7 = b7.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b8.informOfIncrement(),
        b9.informOfIncrement(),
        b10.informOfIncrement(),
      ]),
  }),
})

const p8 = b8.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b9.informOfIncrement(),
        b10.informOfIncrement(),
        b11.informOfIncrement(),
      ]),
  }),
})

const p9 = b9.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b10.informOfIncrement(),
        b11.informOfIncrement(),
        b0.informOfIncrement(),
      ]),
  }),
})

const p10 = b10.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b11.informOfIncrement(),
        b0.informOfIncrement(),
        b1.informOfIncrement(),
      ]),
  }),
})

const p11 = b11.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b0.informOfIncrement(),
        b1.informOfIncrement(),
        b2.informOfIncrement(),
      ]),
  }),
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11],
})

const update = ApplicationComposition.makeUpdate({
  ClickedNotify: model => b0.requestNotify()(model),
})
const init = ApplicationComposition.makeInit(() => ({ model: {} }))
it('terminates a twelve-placement reciprocal policy after three silent sibling operations', () => {
  const notification = update(
    init().model,
    ApplicationComposition.Message.ClickedNotify(),
  )
  expect(Object.values(notification.model).map(child => child.count)).toEqual([
    0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
  ])
  expect(notification.commands ?? []).toEqual([])
})
