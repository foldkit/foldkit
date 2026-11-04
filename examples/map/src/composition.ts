import type { Block } from 'foldkit'

import { ApplicationBlock } from './definition'
import { MountMap } from './mount'

export const ApplicationComposition = ApplicationBlock.makeComposition({
  mounts: [MountMap],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
