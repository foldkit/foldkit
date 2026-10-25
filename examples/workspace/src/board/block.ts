import { Block } from 'foldkit'

import { IssueBoardComposition } from './composition'
import { Message, type Model } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

const prepare = () =>
  IssueBoardComposition.prepareBlock({
    init,
    update,
    view,
    operations: {
      informIssueMoved: Message.InformedOfIssueMove,
      informIssueMoveFailed: Message.InformedOfIssueMoveFailure,
    },
  })
export const IssueBoardBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
