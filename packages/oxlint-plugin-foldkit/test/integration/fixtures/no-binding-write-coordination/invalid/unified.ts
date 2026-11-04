import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { ChildBlock, ParentBlock, makeBinding as importedMakeBinding } from '../shared/unified'

ParentBlock.makeBinding(ChildBlock, {
  read: model => Option.some(model.child),
  write: (model, nextChild) => modifyFields(model, {
    child: () => nextChild,
    announcement: () => nextChild.label,
  }),
})
const { makeBinding } = ParentBlock
makeBinding(ChildBlock, {
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
