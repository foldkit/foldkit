import { Clock, DateTime, Effect, Schema } from 'effect'
import { load, pushUrl, replaceUrl } from 'foldkit/navigation'

import { makeCommand } from './block'
import { IssueDraft, IssueStatus } from './domain'
import { Message } from './message'
import { WorkspaceRepository } from './repository'

export const LoadWorkspace = makeCommand('LoadWorkspace', {
  messages: [Message.SucceededLoadWorkspace, Message.FailedLoadWorkspace],
  handler: function* () {
    const repository = yield* WorkspaceRepository

    return () =>
      repository.load.pipe(
        Effect.map(workspace => Message.SucceededLoadWorkspace({ workspace })),
        Effect.catch(error =>
          Effect.succeed(Message.FailedLoadWorkspace({ error: error.message })),
        ),
      )
  },
})

export const NavigateInternal = makeCommand('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  handler: function* () {
    return ({ url }) =>
      pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal()))
  },
})

export const LoadExternal = makeCommand('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  handler: function* () {
    return ({ href }) =>
      load(href).pipe(Effect.as(Message.CompletedLoadExternal()))
  },
})

export const ReplaceInternalUrl = makeCommand('ReplaceInternalUrl', {
  args: { url: Schema.String },
  messages: [Message.CompletedReplaceInternalUrl],
  handler: function* () {
    return ({ url }) =>
      replaceUrl(url).pipe(Effect.as(Message.CompletedReplaceInternalUrl()))
  },
})

export const SimulateSaveFailure = makeCommand('SimulateSaveFailure', {
  messages: [Message.CompletedSimulateSaveFailure],
  handler: function* () {
    const repository = yield* WorkspaceRepository

    return () =>
      repository
        .failNext('Save')
        .pipe(Effect.as(Message.CompletedSimulateSaveFailure()))
  },
})

export const MoveIssue = makeCommand('MoveIssue', {
  args: {
    issueId: Schema.String,
    status: IssueStatus,
    insertionIndex: Schema.Number,
    expectedVersion: Schema.Number,
  },
  messages: [Message.SucceededMoveIssue, Message.FailedMoveIssue],
  handler: function* () {
    const repository = yield* WorkspaceRepository

    return args =>
      repository.moveIssue(args).pipe(
        Effect.map(movedIssue => Message.SucceededMoveIssue({ movedIssue })),
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
      )
  },
})

export const AppendActivity = makeCommand('AppendActivity', {
  args: {
    issueId: Schema.String,
    authorId: Schema.String,
    body: Schema.String,
  },
  messages: [Message.SucceededAppendActivity, Message.FailedAppendActivity],
  handler: function* () {
    const repository = yield* WorkspaceRepository

    return args =>
      repository.addComment(args).pipe(
        Effect.map(comment =>
          Message.SucceededAppendActivity({ issueId: args.issueId, comment }),
        ),
        Effect.catch(error =>
          Effect.succeed(
            Message.FailedAppendActivity({ error: error.message }),
          ),
        ),
      )
  },
})

export const AssignIssue = makeCommand('AssignIssue', {
  args: {
    issueId: Schema.String,
    draft: IssueDraft,
    expectedVersion: Schema.Number,
    actorId: Schema.String,
  },
  messages: [Message.SucceededAssignIssue, Message.FailedAssignIssue],
  handler: function* () {
    const repository = yield* WorkspaceRepository
    const clock = yield* Clock.Clock

    return args =>
      Effect.gen(function* () {
        const savedIssue = yield* repository.saveIssue(args)

        const createdAt = DateTime.formatIso(
          DateTime.makeUnsafe(yield* clock.currentTimeMillis),
        )

        return Message.SucceededAssignIssue({
          savedIssue,
          actorId: args.actorId,
          createdAt,
        })
      }).pipe(
        Effect.catch(error =>
          Effect.succeed(Message.FailedAssignIssue({ error: error.message })),
        ),
      )
  },
})
