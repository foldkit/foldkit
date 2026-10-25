import { Layer } from 'effect'
import { Block } from 'foldkit'

import { ScrollActiveResult } from './command'
import { CommandPaletteComposition } from './composition'
import { Message, type Model } from './definition'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

const prepare = () =>
  CommandPaletteComposition.prepareBlock({
    init,
    update,
    view,
    subscriptions,
    EffectsLayer: Layer.mergeAll(subscriptions.layer, ScrollActiveResult.layer),
    operations: {
      requestOpen: Message.RequestedOpen,
      requestClose: Message.RequestedClose,
    },
  })
export const CommandPaletteBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
