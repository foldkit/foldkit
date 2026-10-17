import { Block } from 'foldkit'

import { Child } from './child'
import {
  ApplicationComposition,
  type ApplicationViewBuilder as ImportedApplicationViewBuilder,
} from './rootApplication'

type ApplicationViewBuilder = Block.ViewBuilderFor<typeof ApplicationComposition>

export const localAliasButton = (h: ApplicationViewBuilder) =>
  h.button([h.OnClick(Child.Message.ClickedFromLocalViewBuilder())])

export const importedAliasButton = (h: ImportedApplicationViewBuilder) =>
  h.button([h.OnClick(Child.Message.ClickedFromImportedViewBuilder())])
