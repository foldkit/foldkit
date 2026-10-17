import type { Block } from 'foldkit'

import { Application } from './definition'
import { Message } from './message'
import { People } from './page'

export const PeoplePageBinding = Application.bindChild(People.block, {
  field: 'peoplePage',
  parentMessage: Message.GotPeopleMessage,
  init: { args: route => [route] },
})

export const ApplicationComposition = Application.makeComposition({
  childBindings: [PeoplePageBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
