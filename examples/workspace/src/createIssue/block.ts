import { Block } from 'foldkit'

import { CreateIssue } from './command'
import { CreateIssueComposition } from './composition'
import { init } from './init'
import { Message } from './message'
import type { Model } from './model'
import { update } from './update'
import { view } from './view'

const prepare = () =>
  CreateIssueComposition.prepareBlock({
    init,
    update,
    view,
    EffectsLayer: CreateIssue.layer,
    operations: {
      requestOpen: Message.RequestedOpen,
      requestClose: Message.RequestedClose,
    },
  })
export const CreateIssueBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
