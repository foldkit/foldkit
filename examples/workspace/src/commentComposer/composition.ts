import type { Block } from 'foldkit'

import { CommentComposerDefinition } from './definition'

export const CommentComposerComposition =
  CommentComposerDefinition.makeComposition()
export type CommentComposerViewBuilder = Block.ViewBuilderFor<
  typeof CommentComposerComposition
>
