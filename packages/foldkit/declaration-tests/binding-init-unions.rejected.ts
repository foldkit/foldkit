import { Option, Schema } from 'effect'
import { Block, Message, Struct } from 'foldkit'
import { initAndAppend, initAndInsert, initAndSet } from 'foldkit/bindingInit'
import { makeMapBinding } from 'foldkit/mapBinding'

const ChildModel = Schema.Struct({ count: Schema.Number })
const FirstComposition = Block.makeDefinition('FirstUnionInitChild', {
  Model: ChildModel,
  Message: Schema.Never,
}).makeComposition()
const prepareFirst = () =>
  FirstComposition.prepareBlock({
    init: FirstComposition.makeInit((count: number) => ({ model: { count } })),
    update: FirstComposition.makeUpdate({}),
  })
const FirstBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareFirst
> = Block.assemble(prepareFirst)
const SecondComposition = Block.makeDefinition('SecondUnionInitChild', {
  Model: ChildModel,
  Message: Schema.Never,
}).makeComposition()
const prepareSecond = () =>
  SecondComposition.prepareBlock({
    init: SecondComposition.makeInit((label: string) => ({
      model: { count: label.length },
    })),
    update: SecondComposition.makeUpdate({}),
  })
const SecondBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareSecond
> = Block.assemble(prepareSecond)
const Entry = Schema.Struct({ id: Schema.String, child: ChildModel })
const Model = Schema.Struct({
  child: ChildModel,
  maybeEntry: Schema.Option(Entry),
  entries: Schema.Array(Entry),
  mapped: Schema.Record(Schema.String, ChildModel),
})
const Definition = Block.makeDefinition('UnionInitParent', {
  Model,
  Message: Message.defineMessageUnion({}),
})
const model = Model.make({
  child: { count: 0 },
  maybeEntry: Option.none(),
  entries: [],
  mapped: {},
})
const FirstDirect = Definition.makeBinding(FirstBlock, {
  field: 'child',
  placement: 'same',
  init: false,
})
const SecondDirect = Definition.makeBinding(SecondBlock, {
  field: 'child',
  placement: 'same',
  init: false,
})
const selectedDirect = Math.random() > 0.5 ? FirstDirect : SecondDirect
// @ts-expect-error Identical storage and placement do not identify one init signature.
initAndSet(selectedDirect, model, { args: [1] })
const FirstOptional = Definition.makeBinding(FirstBlock, {
  field: 'maybeEntry',
  key: 'id',
  childField: 'child',
  placement: 'same',
})
const SecondOptional = Definition.makeBinding(SecondBlock, {
  field: 'maybeEntry',
  key: 'id',
  childField: 'child',
  placement: 'same',
})
const selectedOptional = Math.random() > 0.5 ? FirstOptional : SecondOptional
// @ts-expect-error Option storage must retain one exact child initializer.
initAndSet(selectedOptional, model, { key: 'one', args: [1] })
const FirstProjected = Definition.makeBinding(FirstBlock, {
  placement: 'same',
  read: model => Option.some(model.child),
  write: (model, child) => Struct.modifyFields(model, { child: () => child }),
  init: { contextToArgs: () => [0], toParentFields: child => ({ child }) },
})
const SecondProjected = Definition.makeBinding(SecondBlock, {
  placement: 'same',
  read: model => Option.some(model.child),
  write: (model, child) => Struct.modifyFields(model, { child: () => child }),
  init: { contextToArgs: () => [''], toParentFields: child => ({ child }) },
})
const selectedProjected = Math.random() > 0.5 ? FirstProjected : SecondProjected
// @ts-expect-error Projection evidence does not make different init signatures interchangeable.
initAndSet(selectedProjected, model, { args: [1] })
const FirstArray = Definition.makeBinding(FirstBlock, {
  field: 'entries',
  key: 'id',
  childField: 'child',
  placement: 'same',
  init: {
    instances: () => [],
    toItem: ({ key }, child) => ({ id: key, child }),
  },
})
const SecondArray = Definition.makeBinding(SecondBlock, {
  field: 'entries',
  key: 'id',
  childField: 'child',
  placement: 'same',
  init: {
    instances: () => [],
    toItem: ({ key }, child) => ({ id: key, child }),
  },
})
const selectedArray = Math.random() > 0.5 ? FirstArray : SecondArray
// @ts-expect-error Append must select one exact Binding even when its storage is identical.
initAndAppend(selectedArray, model, { key: 'one', args: [1] })
const FirstMap = makeMapBinding(Definition, FirstBlock, {
  field: 'mapped',
  placement: 'same',
})
const SecondMap = makeMapBinding(Definition, SecondBlock, {
  field: 'mapped',
  placement: 'same',
})
const selectedMap = Math.random() > 0.5 ? FirstMap : SecondMap
// @ts-expect-error Insert must retain one exact child initializer.
initAndInsert(selectedMap, model, { key: 'one', args: [1] })
