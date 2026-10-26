import { CommentComposerComposition } from './composition'
import { PostState } from './definition'

export const init = CommentComposerComposition.makeInit(
  (issueId: string, body = '') => ({
    model: { issueId, body, postState: PostState.Idle() },
  }),
)
