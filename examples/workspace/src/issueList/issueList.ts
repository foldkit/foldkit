import { Block } from 'foldkit'

import { IssueListComposition } from './composition'
import { Message } from './message'
import type { Model } from './model'
import { update } from './update'
import { view } from './view'

const init = IssueListComposition.makeInit(() => ({
  model: {
    savedViewName: '',
  },
}))

const prepare = () =>
  IssueListComposition.prepareBlock({
    init,
    update,
    view,
    operations: {
      requestClearFilters: Message.RequestedClearFilters,
    },
  })
export const IssueListBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
