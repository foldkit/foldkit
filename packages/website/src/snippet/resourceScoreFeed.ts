import { Effect, Option, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  ReceivedScore: { score: Schema.String },
})

export class LiveScore extends Block<
  LiveScore,
  Readonly<{ matchId: string }>
>()('LiveScore', {
  Model: Schema.Struct({
    matchId: Schema.String,
    maybeScore: Schema.Option(Schema.String),
  }),
  Message,
}) {}

const scoreEvents = (matchId: string) =>
  Stream.unwrap(
    Effect.acquireRelease(
      Effect.sync(() => new EventSource(`/matches/${matchId}/score`)),
      source => Effect.sync(() => source.close()),
    ).pipe(
      Effect.map(source =>
        Stream.fromEventListener<MessageEvent>(source, 'message').pipe(
          Stream.map(event =>
            Message.ReceivedScore({ score: globalThis.String(event.data) }),
          ),
        ),
      ),
    ),
  )

export const LiveScoreLive = LiveScore.toLayer(() => ({
  init: ({ matchId }) => ({ matchId, maybeScore: Option.none() }),

  subscriptions: {
    scoreEvents: {
      dependencies: model => model.matchId,
      stream: scoreEvents,
    },
  },

  update: {
    ReceivedScore: (model, { score }) => ({
      model: modifyFields(model, { maybeScore: () => Option.some(score) }),
    }),
  },

  view: (model, h) =>
    h.p([], [Option.getOrElse(model.maybeScore, () => 'Waiting for kickoff')]),
}))
