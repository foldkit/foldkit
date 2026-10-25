import { Option } from 'effect'
import { makeMapBinding as bindMap } from 'foldkit/mapBinding'
import { modifyFields } from 'foldkit/struct'

import {
  ChildBlock,
  ChildModel,
  ParentDefinition,
} from '../shared/definition'

// @ts-expect-error This invalid low-level writer proves lint provenance for the dedicated helper.
bindMap(ParentDefinition, ChildBlock, {
  field: 'child',
  read: (model: typeof ParentDefinition.Model.Type) =>
    Option.some(model.child),
  write: (
    model: typeof ParentDefinition.Model.Type,
    nextChild: typeof ChildModel.Type,
  ) =>
    modifyFields(model, {
      child: () => nextChild,
      announcement: () => nextChild.label,
    }),
})
