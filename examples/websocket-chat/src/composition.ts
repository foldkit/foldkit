import type { Block } from 'foldkit'

import { Application } from './definition'

export const ApplicationComposition = Application.makeComposition()
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
