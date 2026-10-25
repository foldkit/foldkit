import { Schema } from 'effect'
import { Block } from 'foldkit'

import { ChildComposition, init, update } from './schema-boundary-block.js'
import {
  ChildBinding,
  ParentDefinition,
} from './schema-boundary-parent-composition.js'
import * as Child from './schema-boundary-public.js'

// @ts-expect-error A plain number does not satisfy the branded Model field.
Child.Model.make({ count: 0 })
// @ts-expect-error Exposed operation arguments stay exact.
ChildBinding.load('Other')
ParentDefinition.makeComposition().makeUpdate({
  RequestedLoad: model =>
    // @ts-expect-error The parent cannot use an unregistered child Step.
    ChildBinding.load('Primary')(model),
})
// @ts-expect-error The completed producer still requires the Command handler.
ChildComposition.prepareBlock({ init, update })

const WrongFieldDefinition = Block.makeDefinition('PublicModelWrongField', {
  Model: Schema.Struct({ child: Schema.String }),
  Message: Schema.Never,
})
// @ts-expect-error An early Schema export does not permit an incompatible child field.
WrongFieldDefinition.makeBinding(Child.ChildBlock, { field: 'child' })
