import { Effect } from 'effect'
import { Command, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  ClickedResetAfterDelay: {},
  CompletedDelayReset: {},
})

const DelayReset = Command.define(
  // The identifier for the Command, surfaces in DevTools and Story/Scene tests
  'DelayReset',
  {
    // Every Message this Command can produce
    messages: [Message.CompletedDelayReset],
  },
)

const DelayResetLive = DelayReset.toLayer(() =>
  Effect.sleep('1 second').pipe(Effect.as(Message.CompletedDelayReset())),
)

const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedResetAfterDelay: () => ({ model, commands: [DelayReset()] }),
    CompletedDelayReset: () => ({
      model: modifyFields(model, { count: () => 0 }),
    }),
  }),
)
