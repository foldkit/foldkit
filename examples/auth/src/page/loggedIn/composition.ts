import { Block } from 'foldkit'

import { Message, OutMessage } from './message'
import { Model } from './model'

export const LoggedInDefinition = Block.makeDefinition('LoggedIn', {
  Model,
  Message,
  OutMessage,
})
export const LoggedInComposition = LoggedInDefinition.makeComposition()
export type LoggedInViewBuilder = Block.ViewBuilderFor<
  typeof LoggedInComposition
>
