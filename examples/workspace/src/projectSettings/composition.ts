import type { Block } from 'foldkit'

import { ProjectSettingsDefinition } from './definition'

export const ProjectSettingsComposition =
  ProjectSettingsDefinition.makeComposition()
export type ProjectSettingsViewBuilder = Block.ViewBuilderFor<
  typeof ProjectSettingsComposition
>
