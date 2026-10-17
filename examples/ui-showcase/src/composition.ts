import type { Block } from 'foldkit'

import { Application } from './definition'
import { Message } from './message'
import * as Ui from './ui'

export const UiBinding = Application.bindChild(Ui.block, {
  field: 'uiModel',
  parentMessage: Message.GotUiMessage,
  init: { args: ({ today }) => [today] },
})

export const ApplicationComposition = Application.makeComposition({
  childBindings: [UiBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
