import { Effect, Stream } from 'effect'

import { WorkspaceAgentContext } from './agentContext'
import { AgentSession } from './agentSession'

export const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  agentContext: entry('PublishAgentContext', WorkspaceAgentContext.fields, {
    messages: [],
    // The Stream restarts only when a declared field changes.
    modelToDependencies: WorkspaceAgentContext.read,
    handler: function* () {
      const agentSession = yield* AgentSession

      return context =>
        Stream.fromEffect(
          agentSession
            .publishContext(WorkspaceAgentContext.encode(context))
            .pipe(Effect.ignore),
        ).pipe(Stream.drain)
    },
  }),
}))

export const EffectsLayer = subscriptions.layer
