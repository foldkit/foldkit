import type { Block } from 'foldkit'

import { makeComposition } from './block'
import { MountMap } from './mount'

export const ApplicationComposition = makeComposition({
  mounts: [MountMap],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
