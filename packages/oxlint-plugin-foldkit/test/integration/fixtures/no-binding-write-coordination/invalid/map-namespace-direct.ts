import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import * as Helpers from '../shared/definition'


const writer = {
  field: 'child',
  read: (model: typeof Helpers.ParentDefinition.Model.Type) => Option.some(model.child),
  write: (model: typeof Helpers.ParentDefinition.Model.Type, nextChild: typeof Helpers.ChildModel.Type) =>
    modifyFields(model, {
      child: () => nextChild,
      announcement: () => nextChild.label,
    }),
}

// @ts-expect-error Map storage rejects this low-level writer independently of the ownership lint.
Helpers.makeMapBinding(Helpers.ChildBlock, writer)
