import * as Maybe from 'effect/Option'
import { modifyFields as changeFields } from 'foldkit/struct'
import { ChildBlock, ParentDefinition } from '../shared/definition'

const Owner = ParentDefinition
const formatAnnouncement = (_parent: unknown, child: typeof ChildBlock.Model.Type) => child.label
const read = (parent: typeof ParentDefinition.Model.Type) => Maybe.some(parent.child)
const write = (parent: typeof ParentDefinition.Model.Type, nextChild: typeof ChildBlock.Model.Type) => {
  const child = nextChild
  return changeFields(parent, {
    child: () => child,
    announcement: () => formatAnnouncement(parent, child),
  })
}
const config = { read, write }
const selectedConfig = config
Owner.makeBinding(ChildBlock, selectedConfig)
