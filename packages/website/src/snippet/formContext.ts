import { Effect, Schema } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import { Http, Update } from 'foldkit'
import { Form } from 'foldkit/experimental'
import { defineMessageUnion } from 'foldkit/message'

const profileFields = Form.defineFields({
  displayName: Form.field({ schema: Schema.String, initial: '' }),
})

const saveProfile = (
  profileId: string,
  profile: Form.FieldValues<typeof profileFields>,
) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const request = yield* HttpClientRequest.bodyJson(
      HttpClientRequest.put(`/api/profiles/${profileId}`),
      profile,
    )
    yield* HttpClient.filterStatusOk(client).execute(request)
  }).pipe(
    Effect.mapError(() => 'Could not save the profile'),
    Effect.provide(Http.layer),
  )

const profileForm = Form.define({
  name: 'Profile',
  fields: profileFields,
  submit: {
    error: Schema.String,
    context: Schema.Struct({ profileId: Schema.String }),
    execute: (profile, { profileId }) => saveProfile(profileId, profile),
  },
})

const Model = Schema.Struct({
  profileId: Schema.String,
  profile: profileForm.Model,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  GotProfileMessage: { message: profileForm.Message },
  SubmittedProfileForm: {},
})
type Message = typeof Message.Type

const foldProfileOutMessage = profileForm.OutMessage.match<
  Update.Step<Model, Message>
>({
  SucceededSubmit: () => stepModel => ({ model: stepModel }),
  FailedSubmit: () => stepModel => ({ model: stepModel }),
})

const profile = profileForm.lift<Model, Message>({
  parentField: 'profile',
  toParentMessage: message => Message.GotProfileMessage({ message }),
  foldOutMessage: foldProfileOutMessage,
})

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotProfileMessage: ({ message }) => profile.fold(model, message),
    // The parent supplies the context the Form doesn't hold
    SubmittedProfileForm: () =>
      profile.submit({ profileId: model.profileId })(model),
  })
