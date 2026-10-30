import { Effect, Number, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import type { Flags } from './flagsDefinition'

export class Application extends Block<
  Application,
  Readonly<{ flags: Flags }>
>()('Application', {
  Model: Schema.Struct({
    count: Schema.Number,
    maybeStartingCount: Schema.Option(Schema.Number),
  }),
  Message: defineMessageUnion({ ClickedIncrement: {} }),
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { flags }) {
    return {
      model: {
        count: Option.getOrElse(flags.savedCount, () => 0),
        maybeStartingCount: flags.savedCount,
      },

      update: {
        ClickedIncrement: model => ({
          model: modifyFields(model, { count: Number.increment }),
        }),
      },

      view: (model, h) => ({
        title: `Counter: ${model.count}`,
        body: h.button(
          [h.OnClick(Application.Message.ClickedIncrement())],
          [`${model.count}`],
        ),
      }),
    }
  }),
)
