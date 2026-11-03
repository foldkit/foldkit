import type { Block } from 'foldkit'

import { makeComposition } from './definition'

export const ProjectSettingsComposition = makeComposition()
export type ProjectSettingsViewBuilder = Block.ViewBuilderFor<
  typeof ProjectSettingsComposition
>
