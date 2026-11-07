import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { ChildBlock, ParentBlock, makeCustomBinding as importedMakeBinding } from '../shared/unified'

ParentBlock.makeCustomBinding(ChildBlock, {
  read: model => Option.some(model.child),
  write: (model, nextChild) => modifyFields(model, {
    child: () => nextChild,
    announcement: () => nextChild.label,
  }),
})
const { makeCustomBinding } = ParentBlock
makeCustomBinding(ChildBlock, {
  read: model => Option.some(model.child),
  write: (model, nextChild) => modifyFields(model, {
    child: () => nextChild,
    announcement: () => nextChild.label,
  }),
})
importedMakeBinding(ChildBlock, {
  read: model => Option.some(model.child),
  write: (model, nextChild) => modifyFields(model, {
    child: () => nextChild,
    announcement: () => nextChild.label,
  }),
})
