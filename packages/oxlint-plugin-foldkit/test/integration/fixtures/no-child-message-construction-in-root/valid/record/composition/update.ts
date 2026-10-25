import { Block } from 'foldkit'

import { Message, Model } from '../definition'

const Definition = Block.makeDefinition('RecordOwnership', {
  Model,
  Message,
})
const Composition = Definition.makeComposition()

const handleClickedDirectRecord = (model: typeof Model.Type) => {
  Message.ClickedDirectRecord()
  return { model }
}

const directHandlers = {
  ClickedDirectRecord: handleClickedDirectRecord,
  ClickedContextRecord: model => ({ model }),
}

export const directUpdate = Composition.makeUpdate(directHandlers)

const handleClickedContextRecord = (model: typeof Model.Type) => {
  Message.ClickedContextRecord()
  return { model }
}

const contextualHandlers = {
  ClickedDirectRecord: model => ({ model }),
  ClickedContextRecord: handleClickedContextRecord,
}

export const contextualUpdate = Composition.makeUpdate.withContext(
  (_context: string) => contextualHandlers,
)
