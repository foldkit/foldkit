import { Effect, Number, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Flags = Schema.Struct({ initialCount: Schema.Number })
export type Flags = typeof Flags.Type

export const readCountCookie = (cookieHeader: string): number =>
  Option.getOrElse(
    Option.flatMap(
      Option.fromNullishOr(/(?:^|; )count=(\d+)/.exec(cookieHeader)?.[1]),
      Number.parse,
    ),
    () => 0,
  )

export class Application extends Block<
  Application,
  Readonly<{ flags: Flags }>
>()('Application', {
  Model: Schema.Struct({ count: Schema.Number }),
  Message: defineMessageUnion({ ClickedIncrement: {} }),
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { flags }) {
    return {
      model: { count: flags.initialCount },

      update: {
        ClickedIncrement: model => ({
          model: modifyFields(model, { count: Number.increment }),
        }),
      },

      view: (model, h) => ({
        title: `Count: ${model.count}`,
        body: h.button(
          [h.OnClick(Application.Message.ClickedIncrement())],
          [`${model.count}`],
        ),
      }),
    }
  }),
)
