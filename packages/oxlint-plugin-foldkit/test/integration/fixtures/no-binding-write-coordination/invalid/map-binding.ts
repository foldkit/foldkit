import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import {
  ChildBlock,
  ChildModel,
  ParentDefinition,
  makeMapBinding as bindMap,
} from '../shared/definition'

// @ts-expect-error This invalid low-level writer proves lint provenance for the Definition helper.
bindMap(ChildBlock, {
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
