// ✅ Keep view pure
import { Effect, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export class Profile extends Block<Profile>()('Profile', {
  Model: Schema.Struct({ title: Schema.String, count: Schema.Number }),
  Message: defineMessageUnion({ ClickedIncrement: {} }),
}) {}

export const ProfileLive = Profile.make(
  Effect.fn(function* () {
    return {
      model: { title: 'Profile', count: 0 },

      update: {
        ClickedIncrement: model => ({
          model: modifyFields(model, { count: Number.increment }),
        }),
      },

      view: (model, h) => ({
        title: model.title,
        body: h.div(
          [h.Class('container')],
          [
            h.h1([], [model.title]),
            h.p([], [`Count: ${model.count}`]),
            h.button([h.OnClick(Profile.Message.ClickedIncrement())], ['+']),
          ],
        ),
      }),
    }
  }),
)
