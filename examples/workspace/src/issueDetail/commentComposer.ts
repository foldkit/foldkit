import { Array, Effect, Option, Schema, String } from 'effect'
import { Block, Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Button, Textarea } from '@foldkit/ui'

import { Comment, Member } from '../domain/domain'
import { WorkspaceRepository } from '../services'

export const PostState = defineTaggedUnion({
  Idle: {},
  Posting: {},
  Failed: { error: Schema.String },
})
export type PostState = typeof PostState.Type

export const Model = Schema.Struct({
  issueId: Schema.String,
  body: Schema.String,
  postState: PostState,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  UpdatedBody: { value: Schema.String },
  ClickedDiscardComment: {},
  SubmittedCommentForm: { authorId: Schema.String },
  SucceededAddComment: { comment: Comment },
  FailedAddComment: { error: Schema.String },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  AddedComment: { comment: Comment },
})
export type OutMessage = typeof OutMessage.Type

export const AddComment = Command.define('AddComment', {
  args: {
    issueId: Schema.String,
    body: Schema.String,
    authorId: Schema.String,
  },
  messages: [Message.SucceededAddComment, Message.FailedAddComment],
})

const ViewInput = Schema.Struct({
  members: Schema.Array(Member),
  comments: Schema.Array(Comment),
  authorId: Schema.String,
})
type ViewInput = typeof ViewInput.Type

export class CommentComposer extends Block<
  CommentComposer,
  Readonly<{ issueId: string }>,
  ViewInput
>()('CommentComposer', {
  Model,
  Message,
  OutMessage,
  Command: [AddComment],
}) {}

const isDraftEditable = (model: Model) =>
  !PostState.guards.Posting(model.postState)

const commentView = (
  comment: Comment,
  members: ReadonlyArray<Member>,
  h: HtmlBuilder<Message, unknown>,
): Html => {
  const maybeAuthor = Array.findFirst(
    members,
    member => member.id === comment.authorId,
  )

  return h.keyed('article')(
    comment.id,
    [h.Class('flex gap-3 py-2 text-sm font-normal leading-6 text-slate-500')],
    [
      h.span(
        [
          h.Class(
            'inline-grid size-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700',
          ),
          h.AriaHidden(true),
        ],
        [
          Option.match(maybeAuthor, {
            onNone: () => '?',
            onSome: ({ initials }) => initials,
          }),
        ],
      ),
      h.div(
        [h.Class('min-w-0')],
        [
          h.strong(
            [h.Class('font-semibold text-slate-700')],
            [
              Option.match(maybeAuthor, {
                onNone: () => 'Former member',
                onSome: ({ name }) => name,
              }),
            ],
          ),
          h.p(
            [h.Class('mt-1 whitespace-pre-wrap break-words')],
            [comment.body],
          ),
        ],
      ),
    ],
  )
}

const feedback = (model: Model, h: HtmlBuilder<Message, unknown>): Html =>
  PostState.match(model.postState, {
    Idle: () =>
      String.isEmpty(model.body)
        ? h.empty
        : h.p(
            [h.Role('status'), h.Class('text-xs font-medium text-slate-500')],
            ['Comment draft kept for this session'],
          ),
    Posting: () =>
      h.p(
        [h.Role('status'), h.Class('mb-3 text-xs font-medium text-slate-500')],
        ['Posting comment…'],
      ),
    Failed: ({ error }) =>
      h.p(
        [
          h.Role('alert'),
          h.Class(
            'mb-3 rounded-md border border-[#efc8ce] bg-[#fff6f6] p-3 text-sm leading-6 text-[#a94d60]',
          ),
        ],
        [error],
      ),
  })

export const CommentComposerLive = CommentComposer.make(
  Effect.fn(function* (_id, { issueId }) {
    const repository = yield* WorkspaceRepository

    return {
      model: { issueId, body: '', postState: PostState.Idle() },

      update: {
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
                  PostState.Failed({
                    error: 'Write a comment before posting.',
                  }),
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
      },

      commands: {
        AddComment: args =>
          repository.addComment(args).pipe(
            Effect.map(comment => Message.SucceededAddComment({ comment })),
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedAddComment({
                  error: error.message,
                }),
              ),
            ),
          ),
      },

      view: (model, h, viewInput) => {
        const textareaId = `issue-${model.issueId}-comment`

        const isDraftLocked = !isDraftEditable(model)
        const isBodyNonEmpty = String.isNonEmpty(model.body)

        return h.section(
          [
            h.Class('mt-8 border-t border-[#e3e6ef] pt-5'),
            h.AriaLabel('Activity'),
          ],
          [
            h.h2(
              [h.Class('mb-4 text-base font-semibold text-slate-700')],
              ['Activity'],
            ),
            ...Array.match(viewInput.comments, {
              onEmpty: () => [
                h.p([h.Class('text-sm text-slate-500')], ['No activity yet.']),
              ],
              onNonEmpty: comments =>
                Array.map(comments, comment =>
                  commentView(comment, viewInput.members, h),
                ),
            }),
            h.form(
              [
                h.Class('mt-5'),
                h.OnSubmit(
                  Message.SubmittedCommentForm({
                    authorId: viewInput.authorId,
                  }),
                ),
              ],
              [
                Textarea.view(
                  {
                    id: textareaId,
                    value: model.body,
                    rows: 3,
                    isDisabled: isDraftLocked,
                    isInvalid:
                      PostState.guards.Failed(model.postState) &&
                      String.isEmpty(String.trim(model.body)),
                    onInput: value => Message.UpdatedBody({ value }),
                    toView: attributes =>
                      h.div(
                        [h.Class('mb-4 grid gap-2')],
                        [
                          h.label(
                            [
                              ...attributes.label,
                              h.Class('text-[13px] font-medium text-slate-600'),
                            ],
                            ['Write a comment'],
                          ),
                          h.textarea([
                            ...attributes.textarea,
                            h.Class(
                              'text-control min-h-24 resize-y px-3 py-2.5 text-sm font-normal leading-6',
                            ),
                            h.Required(true),
                            h.AriaRequired(true),
                          ]),
                        ],
                      ),
                  },
                  h,
                ),
                feedback(model, h),
                h.div(
                  [h.Class('mt-3 flex items-center justify-end gap-2')],
                  [
                    ...(isBodyNonEmpty
                      ? [
                          Button.view(
                            {
                              type: 'button',
                              isDisabled: isDraftLocked,
                              onClick: Message.ClickedDiscardComment(),
                              toView: attributes =>
                                h.button(
                                  [
                                    ...attributes.button,
                                    h.Disabled(isDraftLocked),
                                    h.Class('button'),
                                  ],
                                  ['Discard comment'],
                                ),
                            },
                            h,
                          ),
                        ]
                      : []),
                    Button.view(
                      {
                        type: 'submit',
                        isDisabled: isDraftLocked,
                        toView: attributes =>
                          h.button(
                            [
                              ...attributes.button,
                              h.Disabled(isDraftLocked),
                              h.Class('button-primary'),
                            ],
                            ['Post comment'],
                          ),
                      },
                      h,
                    ),
                  ],
                ),
              ],
            ),
          ],
        )
      },
    }
  }),
)
