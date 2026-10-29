import { Block } from 'foldkit'

import { EffectsLayer } from './command'
import { CommentComposerComposition } from './composition'
import { init } from './init'
import type { Model } from './model'
import { update } from './update'
import { view } from './view'

const prepare = () =>
  CommentComposerComposition.prepareBlock({
    init,
    update,
    view,
    EffectsLayer,
  })
export const CommentComposerBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
