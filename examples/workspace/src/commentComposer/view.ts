import { Array, Option, Schema, String } from 'effect'
import type { Html } from 'foldkit/html'

import { Button, Textarea } from '@foldkit/ui'

import { Comment, Member } from '../domain'
import {
  CommentComposerComposition,
  type CommentComposerViewBuilder,
} from './composition'
import { isDraftEditable } from './draft'
import { Message } from './message'
import { type Model, PostState } from './model'

const ViewInputs = Schema.Struct({
  members: Schema.Array(Member),
  comments: Schema.Array(Comment),
  authorId: Schema.String,
})
type ViewInputs = typeof ViewInputs.Type

const commentView = (
  comment: Comment,
  members: ReadonlyArray<Member>,
  h: CommentComposerViewBuilder,
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

const feedback = (model: Model, h: CommentComposerViewBuilder): Html =>
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

export const view = CommentComposerComposition.makeView.withInputs<ViewInputs>(
  (model, viewInputs, h) => {
    const textareaId = `issue-${model.issueId}-comment`

    const isDraftLocked = !isDraftEditable(model)
    const isBodyNonEmpty = String.isNonEmpty(model.body)

    return h.section(
      [h.Class('mt-8 border-t border-[#e3e6ef] pt-5'), h.AriaLabel('Activity')],
      [
        h.h2(
          [h.Class('mb-4 text-base font-semibold text-slate-700')],
          ['Activity'],
        ),
        ...Array.match(viewInputs.comments, {
          onEmpty: () => [
            h.p([h.Class('text-sm text-slate-500')], ['No activity yet.']),
          ],
          onNonEmpty: comments =>
            Array.map(comments, comment =>
              commentView(comment, viewInputs.members, h),
            ),
        }),
        h.form(
          [
            h.Class('mt-5'),
            h.OnSubmit(
              Message.SubmittedCommentForm({ authorId: viewInputs.authorId }),
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
)
