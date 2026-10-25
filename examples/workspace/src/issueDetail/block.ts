import { Block } from 'foldkit'

import { EffectsLayer } from './command'
import { IssueDetailComposition } from './composition'
import { Message, type Model } from './definition'
import { init } from './init'
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
      requestReportDraft: Message.RequestedReportDraft,
    },
  })
export const IssueDetailBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
