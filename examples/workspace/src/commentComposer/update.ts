import { String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { AddComment } from './command'
import { CommentComposerComposition } from './composition'
import { OutMessage, PostState, makeOutMessageStep } from './definition'
import { canEditDraft } from './draft'

export const update = CommentComposerComposition.makeUpdate({
  UpdatedBody: (model, { value }) => {
    if (!canEditDraft(model)) {
      return { model }
    }

    return {
      model: modifyFields(model, { body: () => value }),
      outMessage: OutMessage.ReportedDraft({ body: value }),
    }
  },
  ClickedDiscardComment: model => {
    if (!canEditDraft(model)) {
      return { model }
    }

    return {
      model: modifyFields(model, {
        body: () => '',
        postState: () => PostState.Idle(),
      }),
      outMessage: OutMessage.ReportedDraft({ body: '' }),
    }
  },
  RequestedReportDraft: makeOutMessageStep(model =>
    OutMessage.ReportedDraft({ body: model.body }),
  ),
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
  SucceededAddComment: (model, { issue }) => {
    if (!PostState.guards.Posting(model.postState)) {
      return { model }
    }

    return {
      model: modifyFields(model, {
        body: () => '',
        postState: () => PostState.Idle(),
      }),
      outMessage: OutMessage.AddedComment({ issue }),
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
