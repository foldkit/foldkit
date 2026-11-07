import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { ChildBlock, ParentBlock, makeCustomBinding } from '../shared/unified'

ParentBlock.makeRequiredFieldBinding(ChildBlock, { field: 'child' })
makeCustomBinding(ChildBlock, {
  read: model => Option.some(model.child),
  write: (model, nextChild) => modifyFields(model, { child: () => nextChild }),
})
