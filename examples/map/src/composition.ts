import type { Block } from 'foldkit'

import { Application } from './definition'
import { MountMap } from './mount'

export const ApplicationComposition = Application.makeComposition({
  mounts: [MountMap],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
