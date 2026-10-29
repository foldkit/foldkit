import { Block } from 'foldkit'

import { EffectsLayer } from './command'
import { IssueDetailComposition } from './composition'
import { init } from './init'
import { Message } from './message'
import type { Model } from './model'
import { update } from './update'
import { view } from './view'

const prepare = () =>
  IssueDetailComposition.prepareBlock({
    init,
    update,
    view,
    EffectsLayer,
    operations: {
      informIssueChanged: Message.InformedOfIssueChange,
      requestSave: Message.RequestedSave,
    },
  })
export const IssueDetailBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
