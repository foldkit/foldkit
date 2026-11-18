import { Context, Effect, Option, Schema } from 'effect'
import { expectTypeOf } from 'vitest'

import { defineMessageUnion } from '../../message/index.js'
import { defineTaggedUnion } from '../../schema/index.js'
import { modifyFields } from '../../struct/index.js'
import type * as Update from '../../update/index.js'
import * as Form from './index.js'

class UsernameValidation extends Context.Service<
  UsernameValidation,
  { readonly errors: ReadonlyArray<string> }
>()('UsernameValidation') {}

class SaveService extends Context.Service<
  SaveService,
  { readonly endpoint: string }
>()('SaveService') {}

const profile = Form.define({
  name: 'Profile',
  fields: {
    username: Form.field({
      schema: Schema.String,
      initial: '',
      validate: () => Effect.map(UsernameValidation, service => service.errors),
    }),
    count: Form.field({ schema: Schema.NumberFromString, initial: '0' }),
  },
  submit: {
    data: Schema.Number,
    error: Schema.String,
    execute: values => Effect.map(SaveService, () => values.count),
  },
})
type ProfileModel = typeof profile.Model.Type
type ProfileMessage = typeof profile.Message.Type
type Requirements = UsernameValidation | SaveService

const Parent = Schema.Struct({ form: profile.Model, savedCount: Schema.Number })
type Parent = typeof Parent.Type
const Message = defineMessageUnion({
  GotFormMessage: { message: profile.Message },
})
type Message = typeof Message.Type
const toParentMessage = (message: ProfileMessage) =>
  Message.GotFormMessage({ message })

const ignoreOutMessage = <ParentModel>() =>
  profile.OutMessage.match<Update.Step<ParentModel, Message>>({
    SucceededSubmit: () => stepModel => ({ model: stepModel }),
    FailedSubmit: () => stepModel => ({ model: stepModel }),
  })

const lifted = profile.lift<Parent, Message>({
  parentField: 'form',
  toParentMessage,
  foldOutMessage: profile.OutMessage.match<Update.Step<Parent, Message>>({
    SucceededSubmit:
      ({ data }) =>
      stepModel => ({
        model: modifyFields(stepModel, { savedCount: () => data }),
      }),
    FailedSubmit: () => stepModel => ({ model: stepModel }),
  }),
})

const liftedOperationTypes = (model: Parent, message: ProfileMessage) => {
  expectTypeOf(lifted.fold(model, message)).toEqualTypeOf<
    Update.Return<Parent, Message, Requirements>
  >()
  expectTypeOf(lifted.fold(message)).toEqualTypeOf<
    Update.Step<Parent, Message, Requirements>
  >()
  expectTypeOf(lifted.submit()).toEqualTypeOf<
    Update.Step<Parent, Message, Requirements>
  >()
  expectTypeOf(lifted.reinitialize({ count: 2 })).toEqualTypeOf<
    Update.Step<Parent, Message>
  >()
  expectTypeOf(lifted.reset).toEqualTypeOf<Update.Step<Parent, Message>>()
  // @ts-expect-error Lifted overrides are decoded values, not inputs.
  lifted.reinitialize({ count: '2' })
  const unknownOverrides = { count: 2, extra: '' }
  // @ts-expect-error Lifted overrides reject unknown fields, even through a variable.
  lifted.reinitialize(unknownOverrides)
  // @ts-expect-error A Form without a context codec takes no context.
  lifted.submit({ recordId: 'record-1' })
}
void liftedOperationTypes

const foldOutMessageTypes = () => {
  profile.lift<Parent, Message>({
    parentField: 'form',
    toParentMessage,
    foldOutMessage: (outMessage, { liftCommand }) => {
      expectTypeOf(outMessage).toEqualTypeOf<Form.OutMessage<typeof profile>>()
      void liftCommand
      return stepModel => ({ model: stepModel })
    },
  })
  // @ts-expect-error lift requires foldOutMessage.
  profile.lift<Parent, Message>({ parentField: 'form', toParentMessage })
  const parentField: 'form' = 'form'
  const wrongStepConfig = {
    parentField,
    toParentMessage,
    foldOutMessage: () => () => ({ model: 1 }),
  }
  // @ts-expect-error The OutMessage Step returns the parent Model.
  profile.lift<Parent, Message>(wrongStepConfig)
}
void foldOutMessageTypes

const contextTypes = () => {
  const RecordContext = Schema.Struct({ recordId: Schema.String })
  const editing = Form.define({
    name: 'Editing',
    fields: { title: Form.field({ schema: Schema.String, initial: '' }) },
    submit: { context: RecordContext, execute: () => Effect.void },
  })
  const EditingParent = Schema.Struct({ form: editing.Model })
  type EditingParent = typeof EditingParent.Type
  const liftedEditing = editing.lift<EditingParent, Message>({
    parentField: 'form',
    toParentMessage: () =>
      Message.GotFormMessage({ message: profile.blurred('count') }),
    foldOutMessage: editing.OutMessage.match<
      Update.Step<EditingParent, Message>
    >({
      SucceededSubmit: () => stepModel => ({ model: stepModel }),
      FailedSubmit: () => stepModel => ({ model: stepModel }),
    }),
  })
  liftedEditing.submit({ recordId: 'record-1' })
  // @ts-expect-error The lifted submit requires the context.
  liftedEditing.submit()
  // @ts-expect-error The lifted submit context follows its codec.
  liftedEditing.submit({ recordId: 1 })
}
void contextTypes

const ExtendedForm = Schema.Struct({
  ...profile.Model.fields,
  recordId: Schema.String,
})
const ExtendedParent = Schema.Struct({ form: ExtendedForm })
type ExtendedParent = typeof ExtendedParent.Type
const OptionalParent = Schema.Struct({
  form: Schema.optionalKey(profile.Model),
})
const WiderParent = Schema.Struct({ form: Schema.Unknown })
const UnionParent = Schema.Struct({
  form: Schema.Union([profile.Model, Schema.String]),
})
const PristineForm = Schema.Struct({
  ...profile.Model.fields,
  submission: profile.Submission.Idle,
})
const NarrowerParent = Schema.Struct({ form: PristineForm })
const EquivalentParent = Schema.Struct({
  form: Schema.Union([profile.Model, PristineForm]),
})
const ExtendedParentUnion = defineTaggedUnion({
  Draft: { form: profile.Model },
  Saved: { form: ExtendedForm },
})
const NarrowerParentUnion = defineTaggedUnion({
  Editable: { form: profile.Model },
  Pristine: { form: PristineForm },
})
const CompleteParentUnion = defineTaggedUnion({
  Draft: { form: profile.Model },
  Saved: { form: profile.Model, recordId: Schema.String },
})

const parentFieldTypeChecks = () => {
  profile.lift<typeof OptionalParent.Type, Message>({
    // @ts-expect-error A parent field must always hold the Form Model.
    parentField: 'form',
    toParentMessage,
    foldOutMessage: ignoreOutMessage<typeof OptionalParent.Type>(),
  })
  profile.lift<typeof WiderParent.Type, Message>({
    // @ts-expect-error A parent field must hold exactly the Form Model.
    parentField: 'form',
    toParentMessage,
    foldOutMessage: ignoreOutMessage<typeof WiderParent.Type>(),
  })
  profile.lift<typeof UnionParent.Type, Message>({
    // @ts-expect-error Every member of a union parent field must be a Form Model.
    parentField: 'form',
    toParentMessage,
    foldOutMessage: ignoreOutMessage<typeof UnionParent.Type>(),
  })
  profile.lift<typeof NarrowerParent.Type, Message>({
    // @ts-expect-error A parent field must accept every submission state.
    parentField: 'form',
    toParentMessage,
    foldOutMessage: ignoreOutMessage<typeof NarrowerParent.Type>(),
  })
  profile.lift<ExtendedParent, Message>({
    // @ts-expect-error Writing a Form Model back would drop the parent's extra data.
    parentField: 'form',
    toParentMessage,
    foldOutMessage: ignoreOutMessage<ExtendedParent>(),
  })
  profile.lift<typeof ExtendedParentUnion.Type, Message>({
    // @ts-expect-error Every parent variant must accept a Form Model.
    parentField: 'form',
    toParentMessage,
    foldOutMessage: ignoreOutMessage<typeof ExtendedParentUnion.Type>(),
  })
  profile.lift<typeof NarrowerParentUnion.Type, Message>({
    // @ts-expect-error Every parent variant must accept every submission state.
    parentField: 'form',
    toParentMessage,
    foldOutMessage: ignoreOutMessage<typeof NarrowerParentUnion.Type>(),
  })
  profile.lift<typeof EquivalentParent.Type, Message>({
    parentField: 'form',
    toParentMessage,
    foldOutMessage: ignoreOutMessage<typeof EquivalentParent.Type>(),
  })
  profile.lift<typeof CompleteParentUnion.Type, Message>({
    parentField: 'form',
    toParentMessage,
    foldOutMessage: ignoreOutMessage<typeof CompleteParentUnion.Type>(),
  })
  profile.lift<Parent, Message>({
    parentField: 'form',
    read: undefined,
    write: undefined,
    toParentMessage,
    foldOutMessage: ignoreOutMessage<Parent>(),
  })
}
void parentFieldTypeChecks

const lensTypeChecks = (model: ExtendedParent) => {
  const extended = profile.lift<ExtendedParent, Message>({
    read: parent => Option.some(parent.form),
    write: (parent, nextForm) =>
      modifyFields(parent, {
        form: () =>
          ExtendedForm.make({ ...nextForm, recordId: parent.form.recordId }),
      }),
    toParentMessage,
    foldOutMessage: ignoreOutMessage<ExtendedParent>(),
  })
  expectTypeOf(
    extended.reinitialize()(model).model.form.recordId,
  ).toEqualTypeOf<string>()

  const parentField: 'form' = 'form'
  const mixedConfig = {
    parentField,
    read: (parent: Parent) => Option.some(parent.form),
    write: (parent: Parent, nextForm: ProfileModel) =>
      modifyFields(parent, { form: () => nextForm }),
    toParentMessage,
    foldOutMessage: ignoreOutMessage<Parent>(),
  }
  // @ts-expect-error A parent field cannot also supply a lens.
  profile.lift<Parent, Message>(mixedConfig)
}
void lensTypeChecks
