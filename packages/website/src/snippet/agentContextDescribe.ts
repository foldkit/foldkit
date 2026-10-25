import { Effect, Schema } from 'effect'

import { WorkspaceAgentContext } from '../client/agentContext'

const AgentTurnRequest = Schema.Struct({
  prompt: Schema.String,
  context: Schema.toCodecJson(WorkspaceAgentContext.Context),
})

const decodeAgentTurnRequest = Schema.decodeUnknownEffect(AgentTurnRequest)

const contextInstructions = [
  'The person is using the workspace app.',
  'Each turn carries a context document that matches this JSON Schema:',
  JSON.stringify(WorkspaceAgentContext.jsonSchema),
].join('\n')

const handleAgentTurn = (body: unknown) =>
  Effect.gen(function* () {
    const { prompt, context } = yield* decodeAgentTurnRequest(body)

    return yield* runAgentTurn({
      instructions: contextInstructions,
      prompt,
      context,
    })
  })
