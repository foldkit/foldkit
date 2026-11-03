import { String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { AddComment } from './command'
import { CommentComposerComposition } from './composition'
import { isDraftEditable } from './draft'
import { PostState } from './model'
import { OutMessage } from './outMessage'

export const update = CommentComposerComposition.makeUpdate({
  UpdatedBody: (model, { value }) => {
    if (!isDraftEditable(model)) {
      return { model }
    }

    return {
      model: modifyFields(model, { body: () => value }),
    }
  },
  ClickedDiscardComment: model => {
    if (!isDraftEditable(model)) {
      return { model }
    }

    return {
      model: modifyFields(model, {
        body: () => '',
        postState: () => PostState.Idle(),
      }),
    }
  },
  SubmittedCommentForm: (model, { authorId }) => {
    if (PostState.guards.Posting(model.postState)) {
      return { model }
    }

    const body = String.trim(model.body)

    if (String.isEmpty(body)) {
      return {
        model: modifyFields(model, {
          postState: () =>
            PostState.Failed({ error: 'Write a comment before posting.' }),
        }),
      }
    }

    return {
      model: modifyFields(model, {
        postState: () => PostState.Posting(),
      }),
      commands: [AddComment({ issueId: model.issueId, body, authorId })],
    }
  },
  SucceededAddComment: (model, { comment }) => {
    if (!PostState.guards.Posting(model.postState)) {
      return { model }
    }

    return {
      model: modifyFields(model, {
        body: () => '',
        postState: () => PostState.Idle(),
      }),
      outMessage: OutMessage.AddedComment({ comment }),
    }
  },
  FailedAddComment: (model, { error }) => {
    if (!PostState.guards.Posting(model.postState)) {
      return { model }
    }

    return {
      model: modifyFields(model, {
        postState: () => PostState.Failed({ error }),
      }),
    }
  },
})
