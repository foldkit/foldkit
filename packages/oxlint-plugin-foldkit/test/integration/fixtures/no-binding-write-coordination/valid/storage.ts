import { Array, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { ChildBlock, ChildModel, ParentDefinition } from '../shared/definition'

ParentDefinition.makeRequiredFieldBinding(ChildBlock, { field: 'child' })
ParentDefinition.makeCustomBinding(ChildBlock, {
  read: model => Option.some(model.child),
  write: (model, nextChild) => modifyFields(model, {
    child: () => nextChild,
    announcement: announcement => announcement,
  }),
})

const Wrapped = Schema.Struct({ id: Schema.String, model: ChildModel, note: Schema.String })
const WrappedParentDefinition = Block.makeDefinition('WrappedWriter', {
  Model: Schema.Struct({ maybeChild: Schema.Option(Wrapped), children: Schema.Array(Wrapped) }),
  Message: Schema.Never,
})
WrappedParentDefinition.makeCustomBinding(ChildBlock, {
  read: model => Option.map(model.maybeChild, child => child.model),
  write: (model, nextChild) => modifyFields(model, {
    maybeChild: Option.map(child => modifyFields(child, { model: () => nextChild })),
  }),
})
WrappedParentDefinition.makeOptionalKeyedFieldBinding(ChildBlock, {
  field: 'maybeChild',
  key: 'id',
  childField: 'model',
})
WrappedParentDefinition.makeCustomKeyedBinding(ChildBlock, {
  keySchema: Schema.String,
  readAll: model => model.children,
  key: child => child.id,
  read: child => child.model,
  writeAt: (model, key, nextChild) => modifyFields(model, {
    children: Array.map(child => child.id === key
      ? modifyFields(child, { model: () => nextChild })
      : child),
  }),
})

const NestedParentDefinition = Block.makeDefinition('NestedWriter', {
  Model: Schema.Struct({ child: Wrapped }),
  Message: Schema.Never,
})
NestedParentDefinition.makeCustomBinding(ChildBlock, {
  read: model => Option.some(model.child.model),
  write: (model, nextChild) => modifyFields(model, {
    child: child => modifyFields(child, { model: () => nextChild }),
  }),
})

const VariantChildModel = Schema.Struct({
  _tag: Schema.Literals(['Child']),
  label: Schema.String,
})
const VariantChildKey = Symbol('VariantWriterChild')
const VariantChildBlock = Block.make('VariantWriterChild', {
  key: VariantChildKey,
  Model: VariantChildModel,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})
const VariantParentKey = Symbol('VariantWriterParent')
const VariantParentDefinition = Block.make('VariantWriterParent', {
  key: VariantParentKey,
  Model: Schema.Union([
    VariantChildModel,
    Schema.Struct({ _tag: Schema.Literals(['Other']) }),
  ]),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})
VariantParentDefinition.makeVariantBinding(VariantChildBlock)
