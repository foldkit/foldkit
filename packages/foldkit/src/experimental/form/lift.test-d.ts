import { Context, Effect, Option, Schema } from 'effect'
import { expectTypeOf } from 'vitest'

import { defineMessageUnion } from '../../message/index.js'
import { defineTaggedUnion } from '../../schema/index.js'
import { modifyFields } from '../../struct/index.js'
import type * as Update from '../../update/index.js'
import * as Form from './index.js'

class UsernameValidator extends Context.Service<
  UsernameValidator,
  { readonly errors: ReadonlyArray<string> }
>()('UsernameValidator') {}

class ProfileStore extends Context.Service<
  ProfileStore,
  { readonly endpoint: string }
>()('ProfileStore') {}

const profileForm = Form.define({
  name: 'Profile',
  fields: {
    username: Form.field({
      schema: Schema.String,
      initial: '',
      validate: () => Effect.map(UsernameValidator, service => service.errors),
    }),
    count: Form.field({ schema: Schema.NumberFromString, initial: '0' }),
  },
  submit: {
    data: Schema.Number,
    error: Schema.String,
    execute: values => Effect.map(ProfileStore, () => values.count),
  },
})
type ProfileModel = typeof profileForm.Model.Type
type ProfileMessage = typeof profileForm.Message.Type
type Requirements = UsernameValidator | ProfileStore

const Parent = Schema.Struct({
  form: profileForm.Model,
  savedCount: Schema.Number,
})
type Parent = typeof Parent.Type
const Message = defineMessageUnion({
  GotFormMessage: { message: profileForm.Message },
})
type Message = typeof Message.Type
const toParentMessage = (message: ProfileMessage) =>
  Message.GotFormMessage({ message })

const foldProfileOutMessage = <ParentModel>() =>
  profileForm.OutMessage.match<Update.Step<ParentModel, Message>>({
    SucceededSubmit: () => stepModel => ({ model: stepModel }),
    FailedSubmit: () => stepModel => ({ model: stepModel }),
  })

const profile = profileForm.lift<Parent, Message>({
  parentField: 'form',
  toParentMessage,
  foldOutMessage: profileForm.OutMessage.match<Update.Step<Parent, Message>>({
    SucceededSubmit:
      ({ data }) =>
      stepModel => ({
        model: modifyFields(stepModel, { savedCount: () => data }),
      }),
    FailedSubmit: () => stepModel => ({ model: stepModel }),
  }),
})

const liftedOperationTypes = (model: Parent, message: ProfileMessage) => {
  expectTypeOf(profile.fold(model, message)).toEqualTypeOf<
    Update.Return<Parent, Message, Requirements>
  >()
  expectTypeOf(profile.fold(message)).toEqualTypeOf<
    Update.Step<Parent, Message, Requirements>
  >()
  expectTypeOf(profile.submit()).toEqualTypeOf<
    Update.Step<Parent, Message, Requirements>
  >()
  expectTypeOf(profile.reinitialize({ count: 2 })).toEqualTypeOf<
    Update.Step<Parent, Message>
  >()
  expectTypeOf(profile.reset).toEqualTypeOf<Update.Step<Parent, Message>>()
  // @ts-expect-error Lifted overrides are decoded values, not inputs.
  profile.reinitialize({ count: '2' })
  const unknownOverrides = { count: 2, extra: '' }
  // @ts-expect-error Lifted overrides reject unknown fields, even through a variable.
  profile.reinitialize(unknownOverrides)
  // @ts-expect-error A Form without a context codec takes no context.
  profile.submit({ recordId: 'record-1' })
}
void liftedOperationTypes

const foldOutMessageTypes = () => {
  profileForm.lift<Parent, Message>({
    parentField: 'form',
    toParentMessage,
    foldOutMessage: (outMessage, { liftCommand }) => {
      expectTypeOf(outMessage).toEqualTypeOf<
        Form.OutMessage<typeof profileForm>
      >()
      void liftCommand
      return stepModel => ({ model: stepModel })
    },
  })
  // @ts-expect-error lift requires foldOutMessage.
  profileForm.lift<Parent, Message>({ parentField: 'form', toParentMessage })
  const parentField: 'form' = 'form'
  const wrongStepConfig = {
    parentField,
    toParentMessage,
    foldOutMessage: () => () => ({ model: 1 }),
  }
  // @ts-expect-error The OutMessage Step returns the parent Model.
  profileForm.lift<Parent, Message>(wrongStepConfig)
}
void foldOutMessageTypes

const contextTypes = () => {
  const RecordContext = Schema.Struct({ recordId: Schema.String })
  const editingForm = Form.define({
    name: 'Editing',
    fields: { title: Form.field({ schema: Schema.String, initial: '' }) },
    submit: { context: RecordContext, execute: () => Effect.void },
  })
  const EditingParent = Schema.Struct({ form: editingForm.Model })
  type EditingParent = typeof EditingParent.Type
  const editing = editingForm.lift<EditingParent, Message>({
    parentField: 'form',
    toParentMessage: () =>
      Message.GotFormMessage({ message: profileForm.blurred('count') }),
    foldOutMessage: editingForm.OutMessage.match<
      Update.Step<EditingParent, Message>
    >({
      SucceededSubmit: () => stepModel => ({ model: stepModel }),
      FailedSubmit: () => stepModel => ({ model: stepModel }),
    }),
  })
  editing.submit({ recordId: 'record-1' })
  // @ts-expect-error The lifted submit requires the context.
  editing.submit()
  // @ts-expect-error The lifted submit context follows its codec.
  editing.submit({ recordId: 1 })
}
void contextTypes

const ExtendedForm = Schema.Struct({
  ...profileForm.Model.fields,
  recordId: Schema.String,
})
const ExtendedParent = Schema.Struct({ form: ExtendedForm })
type ExtendedParent = typeof ExtendedParent.Type
const OptionalParent = Schema.Struct({
  form: Schema.optionalKey(profileForm.Model),
})
const WiderParent = Schema.Struct({ form: Schema.Unknown })
const UnionParent = Schema.Struct({
  form: Schema.Union([profileForm.Model, Schema.String]),
})
const PristineForm = Schema.Struct({
  ...profileForm.Model.fields,
  submission: profileForm.Submission.Idle,
})
const NarrowerParent = Schema.Struct({ form: PristineForm })
const EquivalentParent = Schema.Struct({
  form: Schema.Union([profileForm.Model, PristineForm]),
})
const ExtendedParentUnion = defineTaggedUnion({
  Draft: { form: profileForm.Model },
  Saved: { form: ExtendedForm },
})
const NarrowerParentUnion = defineTaggedUnion({
  Editable: { form: profileForm.Model },
  Pristine: { form: PristineForm },
})
const CompleteParentUnion = defineTaggedUnion({
  Draft: { form: profileForm.Model },
  Saved: { form: profileForm.Model, recordId: Schema.String },
})

const parentFieldTypeChecks = () => {
  profileForm.lift<typeof OptionalParent.Type, Message>({
    // @ts-expect-error A parent field must always hold the Form Model.
    parentField: 'form',
    toParentMessage,
    foldOutMessage: foldProfileOutMessage<typeof OptionalParent.Type>(),
  })
  profileForm.lift<typeof WiderParent.Type, Message>({
    // @ts-expect-error A parent field must hold exactly the Form Model.
    parentField: 'form',
    toParentMessage,
    foldOutMessage: foldProfileOutMessage<typeof WiderParent.Type>(),
  })
  profileForm.lift<typeof UnionParent.Type, Message>({
    // @ts-expect-error Every member of a union parent field must be a Form Model.
    parentField: 'form',
    toParentMessage,
    foldOutMessage: foldProfileOutMessage<typeof UnionParent.Type>(),
  })
  profileForm.lift<typeof NarrowerParent.Type, Message>({
    // @ts-expect-error A parent field must accept every submission state.
    parentField: 'form',
    toParentMessage,
    foldOutMessage: foldProfileOutMessage<typeof NarrowerParent.Type>(),
  })
  profileForm.lift<ExtendedParent, Message>({
    // @ts-expect-error Writing a Form Model back would drop the parent's extra data.
    parentField: 'form',
    toParentMessage,
    foldOutMessage: foldProfileOutMessage<ExtendedParent>(),
  })
  profileForm.lift<typeof ExtendedParentUnion.Type, Message>({
    // @ts-expect-error Every parent variant must accept a Form Model.
    parentField: 'form',
    toParentMessage,
    foldOutMessage: foldProfileOutMessage<typeof ExtendedParentUnion.Type>(),
  })
  profileForm.lift<typeof NarrowerParentUnion.Type, Message>({
    // @ts-expect-error Every parent variant must accept every submission state.
    parentField: 'form',
    toParentMessage,
    foldOutMessage: foldProfileOutMessage<typeof NarrowerParentUnion.Type>(),
  })
  profileForm.lift<typeof EquivalentParent.Type, Message>({
    parentField: 'form',
    toParentMessage,
    foldOutMessage: foldProfileOutMessage<typeof EquivalentParent.Type>(),
  })
  profileForm.lift<typeof CompleteParentUnion.Type, Message>({
    parentField: 'form',
    toParentMessage,
    foldOutMessage: foldProfileOutMessage<typeof CompleteParentUnion.Type>(),
  })
  profileForm.lift<Parent, Message>({
    parentField: 'form',
    read: undefined,
    write: undefined,
    toParentMessage,
    foldOutMessage: foldProfileOutMessage<Parent>(),
  })
}
void parentFieldTypeChecks

const lensTypeChecks = (model: ExtendedParent) => {
  const extendedProfile = profileForm.lift<ExtendedParent, Message>({
    read: parent => Option.some(parent.form),
    write: (parent, nextForm) =>
      modifyFields(parent, {
        form: () =>
          ExtendedForm.make({ ...nextForm, recordId: parent.form.recordId }),
      }),
    toParentMessage,
    foldOutMessage: foldProfileOutMessage<ExtendedParent>(),
  })
  expectTypeOf(
    extendedProfile.reinitialize()(model).model.form.recordId,
  ).toEqualTypeOf<string>()

  const parentField: 'form' = 'form'
  const mixedConfig = {
    parentField,
    read: (parent: Parent) => Option.some(parent.form),
    write: (parent: Parent, nextForm: ProfileModel) =>
      modifyFields(parent, { form: () => nextForm }),
    toParentMessage,
    foldOutMessage: foldProfileOutMessage<Parent>(),
  }
  // @ts-expect-error A parent field cannot also supply a lens.
  profileForm.lift<Parent, Message>(mixedConfig)
}
void lensTypeChecks
