import { Block } from 'foldkit'

import { IssueBoardComposition } from './composition'
import { init } from './init'
import { Message } from './message'
import type { Model } from './model'
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
