import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

const ApplicationBlock = Block.make('Application', { key: ApplicationKey, Model, Message, Init })
const ChildBinding = ApplicationBlock.makeRequiredFieldBinding(ChildBlock, { field: 'child' })
const ApplicationComposition = ApplicationBlock.makeComposition({ bindings: [ChildBinding] })
export const update = ApplicationComposition.makeUpdate({
  ClickedSave: model => ({ model: modifyFields(model, { child: child => modifyFields(child, { title: () => 'Bypassed' }) }) }),
})
