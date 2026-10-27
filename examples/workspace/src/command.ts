import { Clock, DateTime, Effect, Layer, Schema } from 'effect'
import { load, pushUrl, replaceUrl } from 'foldkit/navigation'

import { ApplicationDefinition } from './definition'
import { IssueDraft, IssueStatus } from './domain'
import { Message } from './message'
import { WorkspaceRepository } from './repository'

export const LoadWorkspace = ApplicationDefinition.makeCommand(
  'LoadWorkspace',
  {
    messages: [Message.SucceededLoadWorkspace, Message.FailedLoadWorkspace],
    handler: function* () {
      const repository = yield* WorkspaceRepository

      return () =>
        repository.load.pipe(
          Effect.map(workspace =>
            Message.SucceededLoadWorkspace({ workspace }),
          ),
          Effect.catch(error =>
            Effect.succeed(
              Message.FailedLoadWorkspace({ error: error.message }),
            ),
          ),
        )
    },
  },
)

export const NavigateInternal = ApplicationDefinition.makeCommand(
  'NavigateInternal',
  {
    args: { url: Schema.String },
    messages: [Message.CompletedNavigateInternal],
    handler: function* () {
      return ({ url }) =>
        pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal()))
    },
  },
)

export const LoadExternal = ApplicationDefinition.makeCommand('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  handler: function* () {
    return ({ href }) =>
      load(href).pipe(Effect.as(Message.CompletedLoadExternal()))
  },
})

export const ReplaceInternalUrl = ApplicationDefinition.makeCommand(
  'ReplaceInternalUrl',
  {
    args: { url: Schema.String },
    messages: [Message.CompletedReplaceInternalUrl],
    handler: function* () {
      return ({ url }) =>
        replaceUrl(url).pipe(Effect.as(Message.CompletedReplaceInternalUrl()))
    },
  },
)

export const SimulateSaveFailure = ApplicationDefinition.makeCommand(
  'SimulateSaveFailure',
  {
    messages: [Message.CompletedSimulateSaveFailure],
    handler: function* () {
      const repository = yield* WorkspaceRepository

      return () =>
        repository
          .failNext('Save')
          .pipe(Effect.as(Message.CompletedSimulateSaveFailure()))
    },
  },
)

export const MoveIssue = ApplicationDefinition.makeCommand('MoveIssue', {
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

export const AppendActivity = ApplicationDefinition.makeCommand(
  'AppendActivity',
  {
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
  },
)

export const AssignIssue = ApplicationDefinition.makeCommand('AssignIssue', {
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

export const EffectsLayer = Layer.mergeAll(
  LoadWorkspace.layer,
  NavigateInternal.layer,
  LoadExternal.layer,
  ReplaceInternalUrl.layer,
  SimulateSaveFailure.layer,
  MoveIssue.layer,
  AppendActivity.layer,
  AssignIssue.layer,
)
