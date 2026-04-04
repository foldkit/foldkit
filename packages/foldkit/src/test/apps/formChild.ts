import { Effect, Match as M, Option, Schema as S } from 'effect'

import * as Command from '../../command'
import { m } from '../../message'

// CHILD MODEL

export const ChildModel = S.Struct({
  status: S.Literal('Idle', 'Submitting', 'Submitted'),
})
export type ChildModel = typeof ChildModel.Type

// CHILD MESSAGE

export const SubmittedForm = m('SubmittedForm')
export const SucceededSubmit = m('SucceededSubmit', { id: S.String })
export const CancelledForm = m('CancelledForm')
export const CompletedReset = m('CompletedReset')

export const ChildMessage = S.Union(
  SubmittedForm,
  SucceededSubmit,
  CancelledForm,
  CompletedReset,
)
export type ChildMessage = typeof ChildMessage.Type

// CHILD OUT MESSAGE

export const RequestedSave = m('RequestedSave', { id: S.String })
export const RequestedCancel = m('RequestedCancel')

export const ChildOutMessage = S.Union(RequestedSave, RequestedCancel)
export type ChildOutMessage = typeof ChildOutMessage.Type

// CHILD COMMAND

export const SubmitForm = Command.define('SubmitForm', SucceededSubmit)
export const submitForm = SubmitForm(
  Effect.sync(() => SucceededSubmit({ id: 'abc' })),
)

export const ResetForm = Command.define('ResetForm', CompletedReset)
export const resetForm = ResetForm(Effect.sync(() => CompletedReset()))

// CHILD INIT

export const initialChildModel: ChildModel = { status: 'Idle' }

// CHILD UPDATE

export const childUpdate = (
  _model: ChildModel,
  message: ChildMessage,
): readonly [
  ChildModel,
  ReadonlyArray<Command.Command<ChildMessage>>,
  Option.Option<ChildOutMessage>,
] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [
        ChildModel,
        ReadonlyArray<Command.Command<ChildMessage>>,
        Option.Option<ChildOutMessage>,
      ]
    >(),
    M.tagsExhaustive({
      SubmittedForm: () => [
        { status: 'Submitting' },
        [submitForm],
        Option.none(),
      ],
      SucceededSubmit: ({ id }) => [
        { status: 'Submitted' },
        [resetForm],
        Option.some(RequestedSave({ id })),
      ],
      CancelledForm: () => [
        { status: 'Idle' },
        [],
        Option.some(RequestedCancel()),
      ],
      CompletedReset: () => [{ status: 'Idle' }, [], Option.none()],
    }),
  )

// PARENT MODEL

export const ParentModel = S.Struct({
  child: ChildModel,
  savedIds: S.Array(S.String),
  cancelled: S.Boolean,
})
export type ParentModel = typeof ParentModel.Type

// PARENT MESSAGE

export const GotChildMessage = m('GotChildMessage', {
  message: ChildMessage,
})
export const CompletedParentReset = m('CompletedParentReset')

export const ParentMessage = S.Union(GotChildMessage, CompletedParentReset)
export type ParentMessage = typeof ParentMessage.Type

// PARENT INIT

export const initialParentModel: ParentModel = {
  child: { status: 'Idle' },
  savedIds: [],
  cancelled: false,
}

// PARENT UPDATE

export const parentUpdate = (
  parentModel: ParentModel,
  message: ParentMessage,
): readonly [ParentModel, ReadonlyArray<Command.Command<ChildMessage>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [ParentModel, ReadonlyArray<Command.Command<ChildMessage>>]
    >(),
    M.tagsExhaustive({
      GotChildMessage: ({ message: childMessage }) => {
        const [nextChild, commands, maybeOutMessage] = childUpdate(
          parentModel.child,
          childMessage,
        )
        const nextParent = Option.match(maybeOutMessage, {
          onNone: () => ({ ...parentModel, child: nextChild }),
          onSome: outMessage =>
            M.value(outMessage).pipe(
              M.withReturnType<ParentModel>(),
              M.tagsExhaustive({
                RequestedSave: ({ id }) => ({
                  ...parentModel,
                  child: nextChild,
                  savedIds: [...parentModel.savedIds, id],
                }),
                RequestedCancel: () => ({
                  ...parentModel,
                  child: nextChild,
                  cancelled: true,
                }),
              }),
            ),
        })
        return [nextParent, commands]
      },
      CompletedParentReset: () => [parentModel, []],
    }),
  )
