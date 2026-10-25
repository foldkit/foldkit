import { Effect, Option, Schema, pipe } from 'effect'
import { HttpClient, HttpClientRequest, HttpClientResponse } from 'effect/http'
import { modifyFields } from 'foldkit/struct'

import { WorkspaceAgentContext } from './agentContext'

const AgentReply = Schema.Struct({ reply: Schema.String })

const SendAgentTurn = ApplicationDefinition.makeCommand('SendAgentTurn', {
  args: { prompt: Schema.String, context: WorkspaceAgentContext.Context },
  messages: [Message.SucceededSendAgentTurn, Message.FailedSendAgentTurn],
  handler: function* () {
    const client = yield* HttpClient.HttpClient

    return ({ prompt, context }) =>
      pipe(
        HttpClientRequest.post('/api/agent/turns'),
        // The server receives only the declared fields, as JSON.
        HttpClientRequest.bodyJsonUnsafe({
          prompt,
          context: WorkspaceAgentContext.encode(context),
        }),
        client.execute,
        Effect.flatMap(HttpClientResponse.schemaBodyJson(AgentReply)),
        Effect.map(({ reply }) => Message.SucceededSendAgentTurn({ reply })),
        Effect.catch(() => Effect.succeed(Message.FailedSendAgentTurn())),
      )
  },
})

const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    SubmittedAgentPrompt: ({ prompt }) => ({
      model,
      // update returns the Command; the Runtime sends the turn later.
      commands: [
        SendAgentTurn({ prompt, context: WorkspaceAgentContext.read(model) }),
      ],
    }),
    SucceededSendAgentTurn: ({ reply }) => ({
      model: modifyFields(model, { maybeAgentReply: () => Option.some(reply) }),
    }),
    FailedSendAgentTurn: () => ({ model }),
  }),
)
