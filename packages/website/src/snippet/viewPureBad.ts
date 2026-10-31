// ❌ Don't do this in view
import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'

export class Profile extends Block<Profile>()('Profile', {
  Model: Schema.Struct({ title: Schema.String }),
}) {}

export const ProfileLive = Profile.make(
  Effect.fn(function* () {
    return {
      model: { title: 'Profile' },

      view: (model, h) => {
        fetch('/api/user').then(response => response.json())
        setTimeout(() => console.log('tick'), 1000)
        window.addEventListener('resize', () => {})

        return { title: model.title, body: h.div([], [model.title]) }
      },
    }
  }),
)
