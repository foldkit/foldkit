import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { ChildBlock, ParentBlock, makeBinding } from '../shared/unified'

ParentBlock.makeBinding(ChildBlock, { field: 'child' })
makeBinding(ChildBlock, {
  read: model => Option.some(model.child),
  write: (model, nextChild) => modifyFields(model, { child: () => nextChild }),
})
