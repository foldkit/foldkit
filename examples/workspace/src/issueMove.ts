import { Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

import {
  IssueStatus,
  MovedIssue,
  type Workspace,
  moveIssue,
} from './domain/domain'
import { RepositoryError, WorkspaceRepository } from './services'

export const IssueMoveState = defineTaggedUnion({
  Idle: {},
  MovingIssue: {
    issueId: Schema.String,
    status: IssueStatus,
    insertionIndex: Schema.Number,
    expectedVersion: Schema.Number,
  },
  FailedMove: {
    issueId: Schema.String,
    status: IssueStatus,
    insertionIndex: Schema.Number,
    error: Schema.String,
  },
})
export type IssueMoveState = typeof IssueMoveState.Type

const Model = Schema.Struct({ state: IssueMoveState })

const Message = defineMessageUnion({
  RequestedMove: {
    issueId: Schema.String,
    status: IssueStatus,
    insertionIndex: Schema.Number,
    expectedVersion: Schema.Number,
  },
  SucceededMoveIssue: { movedIssue: MovedIssue },
  FailedMoveIssue: {
    issueId: Schema.String,
    status: IssueStatus,
    insertionIndex: Schema.Number,
    error: RepositoryError,
  },
  ClickedRetryMove: {},
})

const OutMessage = defineMessageUnion({
  Moved: { movedIssue: MovedIssue },
  FailedMove: { issueId: Schema.String, error: RepositoryError },
  RequestedRetry: {
    issueId: Schema.String,
    status: IssueStatus,
    insertionIndex: Schema.Number,
  },
})

export const MoveIssue = Command.define('MoveIssue', {
  args: {
    issueId: Schema.String,
    status: IssueStatus,
    insertionIndex: Schema.Number,
    expectedVersion: Schema.Number,
  },
  messages: [Message.SucceededMoveIssue, Message.FailedMoveIssue],
})

export class IssueMove extends Block<IssueMove>()('IssueMove', {
  Model,
  Message,
  OutMessage,
  Command: [MoveIssue],
}) {}

export const workspaceWithPendingMove = (
  workspace: Workspace,
  issueMoveState: IssueMoveState,
) =>
  IssueMoveState.matchOrElse(
    issueMoveState,
    {
      MovingIssue: ({ issueId, status, insertionIndex }) =>
        modifyFields(workspace, {
          issues: issues => moveIssue(issues, issueId, status, insertionIndex),
        }),
    },
    () => workspace,
  )

export const IssueMoveLive = IssueMove.make(
  Effect.fn(function* () {
    const repository = yield* WorkspaceRepository

    return {
      model: { state: IssueMoveState.Idle() },

      update: {
        RequestedMove: (
          model,
          { issueId, status, insertionIndex, expectedVersion },
        ) => ({
          model: modifyFields(model, {
            state: () =>
              IssueMoveState.MovingIssue({
                issueId,
                status,
                insertionIndex,
                expectedVersion,
              }),
          }),
          commands: [
            MoveIssue({ issueId, status, insertionIndex, expectedVersion }),
          ],
        }),
        SucceededMoveIssue: (model, { movedIssue }) => ({
          model: modifyFields(model, { state: () => IssueMoveState.Idle() }),
          outMessage: OutMessage.Moved({ movedIssue }),
        }),
        FailedMoveIssue: (
          model,
          { issueId, status, insertionIndex, error },
        ) => ({
          model: modifyFields(model, {
            state: () =>
              IssueMoveState.FailedMove({
                issueId,
                status,
                insertionIndex,
                error: error.message,
              }),
          }),
          outMessage: OutMessage.FailedMove({ issueId, error }),
        }),
        ClickedRetryMove: model =>
          IssueMoveState.matchOrElse(
            model.state,
            {
              FailedMove: ({ issueId, status, insertionIndex }) => ({
                model,
                outMessage: OutMessage.RequestedRetry({
                  issueId,
                  status,
                  insertionIndex,
                }),
              }),
            },
            () => ({ model }),
          ),
      },

      commands: {
        MoveIssue: args =>
          repository.moveIssue(args).pipe(
            Effect.map(movedIssue =>
              Message.SucceededMoveIssue({ movedIssue }),
            ),
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedMoveIssue({
                  issueId: args.issueId,
                  status: args.status,
                  insertionIndex: args.insertionIndex,
                  error,
                }),
              ),
            ),
          ),
      },

      view: (model, h) =>
        IssueMoveState.match(model.state, {
          Idle: () => h.empty,
          MovingIssue: () =>
            h.p([h.Class('sr-only'), h.Role('status')], ['Moving issue…']),
          FailedMove: ({ error }) =>
            h.div(
              [
                h.Role('alert'),
                h.Class(
                  'mx-5 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 lg:mx-8',
                ),
              ],
              [
                h.p([], [error]),
                Button.view(
                  {
                    type: 'button',
                    onClick: Message.ClickedRetryMove(),
                    toView: attributes =>
                      h.button(
                        [...attributes.button, h.Class('button')],
                        ['Retry changes'],
                      ),
                  },
                  h,
                ),
              ],
            ),
        }),
    }
  }),
)
