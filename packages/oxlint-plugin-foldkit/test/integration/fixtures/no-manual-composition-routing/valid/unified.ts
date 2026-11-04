import { Block } from 'foldkit'

const ApplicationBlock = Block.make('Application', { key: ApplicationKey, Model, Message, Init })
const ApplicationComposition = ApplicationBlock.makeComposition()
export const update = ApplicationComposition.makeUpdate({
  ClickedSave: model => ({ model }),
})
