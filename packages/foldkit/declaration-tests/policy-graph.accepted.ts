import { Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Update from 'foldkit/update'

import { ChildBlock } from './policy-graph.child.js'
export { ChildBlock }

export const ApplicationDefinition = Block.makeDefinition('Parent', {
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

const b0 = ApplicationDefinition.makeBinding(ChildBlock, {
  field: 'b0',
  init: { contextToArgs: () => Tuple.make() },
})

const b1 = ApplicationDefinition.makeBinding(ChildBlock, {
  field: 'b1',
  init: { contextToArgs: () => Tuple.make() },
})

const b2 = ApplicationDefinition.makeBinding(ChildBlock, {
  field: 'b2',
  init: { contextToArgs: () => Tuple.make() },
})

const b3 = ApplicationDefinition.makeBinding(ChildBlock, {
  field: 'b3',
  init: { contextToArgs: () => Tuple.make() },
})

const b4 = ApplicationDefinition.makeBinding(ChildBlock, {
  field: 'b4',
  init: { contextToArgs: () => Tuple.make() },
})

const b5 = ApplicationDefinition.makeBinding(ChildBlock, {
  field: 'b5',
  init: { contextToArgs: () => Tuple.make() },
})

const b6 = ApplicationDefinition.makeBinding(ChildBlock, {
  field: 'b6',
  init: { contextToArgs: () => Tuple.make() },
})

const b7 = ApplicationDefinition.makeBinding(ChildBlock, {
  field: 'b7',
  init: { contextToArgs: () => Tuple.make() },
})

const b8 = ApplicationDefinition.makeBinding(ChildBlock, {
  field: 'b8',
  init: { contextToArgs: () => Tuple.make() },
})

const b9 = ApplicationDefinition.makeBinding(ChildBlock, {
  field: 'b9',
  init: { contextToArgs: () => Tuple.make() },
})

const b10 = ApplicationDefinition.makeBinding(ChildBlock, {
  field: 'b10',
  init: { contextToArgs: () => Tuple.make() },
})

const b11 = ApplicationDefinition.makeBinding(ChildBlock, {
  field: 'b11',
  init: { contextToArgs: () => Tuple.make() },
})

export const p0 = b0.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b1.informIncrement(),
        b2.informIncrement(),
        b3.informIncrement(),
      ]),
  }),
})

export const p1 = b1.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b2.informIncrement(),
        b3.informIncrement(),
        b4.informIncrement(),
      ]),
  }),
})

export const p2 = b2.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b3.informIncrement(),
        b4.informIncrement(),
        b5.informIncrement(),
      ]),
  }),
})

export const p3 = b3.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b4.informIncrement(),
        b5.informIncrement(),
        b6.informIncrement(),
      ]),
  }),
})

export const p4 = b4.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b5.informIncrement(),
        b6.informIncrement(),
        b7.informIncrement(),
      ]),
  }),
})

export const p5 = b5.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b6.informIncrement(),
        b7.informIncrement(),
        b8.informIncrement(),
      ]),
  }),
})

export const p6 = b6.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b7.informIncrement(),
        b8.informIncrement(),
        b9.informIncrement(),
      ]),
  }),
})

export const p7 = b7.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b8.informIncrement(),
        b9.informIncrement(),
        b10.informIncrement(),
      ]),
  }),
})

export const p8 = b8.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b9.informIncrement(),
        b10.informIncrement(),
        b11.informIncrement(),
      ]),
  }),
})

export const p9 = b9.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b10.informIncrement(),
        b11.informIncrement(),
        b0.informIncrement(),
      ]),
  }),
})

export const p10 = b10.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b11.informIncrement(),
        b0.informIncrement(),
        b1.informIncrement(),
      ]),
  }),
})

export const p11 = b11.withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ChildBlock, {
    Notify: () =>
      Update.combineSteps([
        b0.informIncrement(),
        b1.informIncrement(),
        b2.informIncrement(),
      ]),
  }),
})
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11],
})

export const update = ApplicationComposition.makeUpdate({
  ClickedNotify: model => b0.requestNotify()(model),
})
export const init = ApplicationComposition.makeInit(() => ({ model: {} }))
export const run = () =>
  update(init().model, ApplicationComposition.Message.ClickedNotify())
