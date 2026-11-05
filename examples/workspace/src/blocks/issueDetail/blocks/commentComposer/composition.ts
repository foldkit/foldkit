import type { Block } from 'foldkit'

import { makeComposition } from './block'

export const CommentComposerComposition = makeComposition()
export type CommentComposerViewBuilder = Block.ViewBuilderFor<
  typeof CommentComposerComposition
>
