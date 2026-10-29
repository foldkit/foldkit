import { Block } from 'foldkit'

import { MemberDirectoryComposition } from './composition'
import { init } from './init'
import type { Model } from './model'
import { update } from './update'
import { view } from './view'

const prepare = () =>
  MemberDirectoryComposition.prepareBlock({ init, update, view })
export const MemberDirectoryBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
