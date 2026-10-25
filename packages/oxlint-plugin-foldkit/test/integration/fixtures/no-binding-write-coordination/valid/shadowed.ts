import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { ChildBlock, ParentDefinition } from '../shared/definition'

ParentDefinition.makeBinding(ChildBlock, {
  read: model => Option.some(model.child),
  write: (model, nextChild) => modifyFields(model, {
    child: () => nextChild,
    announcement: nextChild => nextChild,
  }),
})
