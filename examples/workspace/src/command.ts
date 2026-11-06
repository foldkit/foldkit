import { Clock, DateTime, Effect, Schema } from 'effect'
import { load, pushUrl, replaceUrl } from 'foldkit/navigation'

import { makeCommand } from './block'
import { Issue } from './domain'
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

export const FailNextIssueSave = makeCommand('FailNextIssueSave', {
  messages: [Message.CompletedFailNextIssueSave],
  handler: function* () {
    const repository = yield* WorkspaceRepository

    return () =>
      repository
        .failNext('SaveIssue')
        .pipe(Effect.as(Message.CompletedFailNextIssueSave()))
  },
})

export const MoveIssue = makeCommand('MoveIssue', {
  args: {
    issueId: Schema.String,
    status: Issue.Status,
    insertionIndex: Schema.Number,
    expectedVersion: Schema.Number,
  },
  messages: [Message.SucceededMoveIssue, Message.FailedMoveIssue],
  handler: function* () {
    const repository = yield* WorkspaceRepository

    return args =>
      repository.moveIssue(args).pipe(
        Effect.map(moveResult => Message.SucceededMoveIssue({ moveResult })),
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

export const AddIssueComment = makeCommand('AddIssueComment', {
  args: {
    issueId: Schema.String,
    authorId: Schema.String,
    body: Schema.String,
  },
  messages: [Message.SucceededAddIssueComment, Message.FailedAddIssueComment],
  handler: function* () {
    const repository = yield* WorkspaceRepository

    return args =>
      repository.addIssueComment(args).pipe(
        Effect.map(comment =>
          Message.SucceededAddIssueComment({ issueId: args.issueId, comment }),
        ),
        Effect.catch(error =>
          Effect.succeed(
            Message.FailedAddIssueComment({ error: error.message }),
          ),
        ),
      )
  },
})

export const AssignIssue = makeCommand('AssignIssue', {
  args: {
    issueId: Schema.String,
    draft: Issue.Draft,
    expectedVersion: Schema.Number,
    actorId: Schema.String,
  },
  messages: [Message.SucceededAssignIssue, Message.FailedAssignIssue],
  handler: function* () {
    const repository = yield* WorkspaceRepository
    const clock = yield* Clock.Clock

    return args =>
      Effect.gen(function* () {
        const saveResult = yield* repository.saveIssue(args)

        const createdAt = DateTime.formatIso(
          DateTime.makeUnsafe(yield* clock.currentTimeMillis),
        )

        return Message.SucceededAssignIssue({
          saveResult,
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
