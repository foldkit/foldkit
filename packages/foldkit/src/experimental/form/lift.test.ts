import { Effect, Option, Result, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Story from '../../test/story.js'
import * as Update from '../../update/index.js'
import * as Form from './form.js'

const registrationForm = Form.define({
  name: 'Registration',
  fields: {
    email: Form.field({ schema: Schema.String, initial: '' }),
    age: Form.field({ schema: Schema.Number, initial: 18 }),
  },
  submit: {
    data: Schema.Number,
    error: Schema.String,
    execute: () => Effect.succeed(7),
  },
})
type RegistrationModel = typeof registrationForm.Model.Type
type RegistrationMessage = typeof registrationForm.Message.Type

const ParentMessage = defineMessageUnion({
  GotRegistrationMessage: { message: registrationForm.Message },
})
type ParentMessage = typeof ParentMessage.Type
const toParentMessage = (message: RegistrationMessage) =>
  ParentMessage.GotRegistrationMessage({ message })

const foldRegistrationOutMessage = <ParentModel>() =>
  registrationForm.OutMessage.match<Update.Step<ParentModel, ParentMessage>>({
    SucceededSubmit: () => stepModel => ({ model: stepModel }),
    FailedSubmit: () => stepModel => ({ model: stepModel }),
  })

const Parent = Schema.Struct({
  registration: registrationForm.Model,
  maybeRegisteredId: Schema.Option(Schema.Number),
  maybeFailure: Schema.Option(Schema.String),
})
type Parent = typeof Parent.Type

const initialParent = Parent.make({
  registration: registrationForm.init(),
  maybeRegisteredId: Option.none(),
  maybeFailure: Option.none(),
})

const registration = registrationForm.lift<Parent, ParentMessage>({
  parentField: 'registration',
  toParentMessage,
  foldOutMessage: registrationForm.OutMessage.match<
    Update.Step<Parent, ParentMessage>
  >({
    SucceededSubmit:
      ({ data }) =>
      stepModel => ({
        model: modifyFields(stepModel, {
          maybeRegisteredId: () => Option.some(data),
        }),
      }),
    FailedSubmit:
      ({ error }) =>
      stepModel => ({
        model: modifyFields(stepModel, {
          maybeFailure: () => Option.some(error),
        }),
      }),
  }),
})

const ExtendedRegistration = Schema.Struct({
  ...registrationForm.Model.fields,
  recordId: Schema.String,
})
const ExtendedParent = Schema.Struct({ registration: ExtendedRegistration })
type ExtendedParent = typeof ExtendedParent.Type

const extendedParent = ExtendedParent.make({
  registration: ExtendedRegistration.make({
    ...registrationForm.init(),
    recordId: 'profile-1',
  }),
})

describe('lifting through a parent field', () => {
  it('folds Form Messages into the parent field', () => {
    const ageChange = registration.fold(
      initialParent,
      registrationForm.changed('age', 22),
    )

    expect(registrationForm.inputs(ageChange.model.registration).age).toBe(22)
  })

  it('folds an accepted submission result through foldOutMessage', () => {
    const attempt = registration.submit()(initialParent)
    const settled = registration.fold(
      attempt.model,
      registrationForm.Message.CompletedSubmit({
        generation: 1,
        result: Result.succeed(7),
      }),
    )

    expect(settled.model.maybeRegisteredId).toEqual(Option.some(7))
  })

  it('folds a rejected submission result through foldOutMessage', () => {
    const attempt = registration.submit()(initialParent)
    const settled = registration.fold(
      attempt.model,
      registrationForm.Message.CompletedSubmit({
        generation: 1,
        result: Result.fail('Registration is closed'),
      }),
    )

    expect(settled.model.maybeFailure).toEqual(
      Option.some('Registration is closed'),
    )
  })

  it('composes its Steps with Update.combine', () => {
    const reinitializeThenSubmit = Update.combine([
      registration.reinitialize({ email: 'ada@example.com' }),
      registration.submit(),
    ])(initialParent)

    expect(
      reinitializeThenSubmit.commands?.map(command => command.name),
    ).toEqual(['SubmitRegistration'])
  })

  it('treats a parentField config with undefined read and write as a parent field', () => {
    const directRegistration = registrationForm.lift<Parent, ParentMessage>({
      parentField: 'registration',
      read: undefined,
      write: undefined,
      toParentMessage,
      foldOutMessage: foldRegistrationOutMessage<Parent>(),
    })
    const reinitialize = directRegistration.reinitialize({
      email: 'new@example.com',
    })(initialParent)

    expect(registrationForm.inputs(reinitialize.model.registration).email).toBe(
      'new@example.com',
    )
  })
})

describe('lifting through a lens', () => {
  it('leaves the parent unchanged when the lens reads no Form', () => {
    const absentRegistration = registrationForm.lift<Parent, ParentMessage>({
      read: () => Option.none(),
      write: parent => parent,
      toParentMessage,
      foldOutMessage: foldRegistrationOutMessage<Parent>(),
    })

    expect(absentRegistration.submit()(initialParent).model).toBe(initialParent)
    expect(absentRegistration.reset(initialParent).model).toBe(initialParent)
    expect(
      absentRegistration.reinitialize({ email: 'new@example.com' })(
        initialParent,
      ).model,
    ).toBe(initialParent)
  })

  it.each([
    { label: 'no parentField', parentField: undefined },
    { label: 'an erased parentField', parentField: 'registration' },
  ])(
    'uses read and write and keeps the data write adds, given $label',
    ({ parentField }) => {
      type RegistrationLens = Form.FormLens<
        ExtendedParent,
        ParentMessage,
        RegistrationModel,
        RegistrationMessage
      >
      const toLens = (
        lensConfig: Pick<
          RegistrationLens,
          'read' | 'write' | 'toParentMessage'
        >,
      ): RegistrationLens => lensConfig
      const config = {
        parentField,
        read: (parent: ExtendedParent) => Option.some(parent.registration),
        write: (parent: ExtendedParent, nextRegistration: RegistrationModel) =>
          modifyFields(parent, {
            registration: () =>
              ExtendedRegistration.make({
                ...nextRegistration,
                recordId: parent.registration.recordId,
              }),
          }),
        toParentMessage,
      }
      const lens = toLens(config)
      const extendedRegistration = registrationForm.lift<
        ExtendedParent,
        ParentMessage
      >({
        ...lens,
        foldOutMessage: foldRegistrationOutMessage<ExtendedParent>(),
      })
      const reinitialize = extendedRegistration.reinitialize({
        email: 'new@example.com',
      })(extendedParent)

      expect(reinitialize.model.registration.recordId).toBe('profile-1')
      expect(
        registrationForm.inputs(reinitialize.model.registration).email,
      ).toBe('new@example.com')
    },
  )

  it('calls class lens methods with the lens as `this`', () => {
    class RegistrationRecordLens implements Form.FormLens<
      ExtendedParent,
      ParentMessage,
      RegistrationModel,
      RegistrationMessage
    > {
      readonly recordId = 'profile-1'

      read(parent: ExtendedParent) {
        return parent.registration.recordId === this.recordId
          ? Option.some(parent.registration)
          : Option.none()
      }

      write(parent: ExtendedParent, nextRegistration: RegistrationModel) {
        return modifyFields(parent, {
          registration: () =>
            ExtendedRegistration.make({
              ...nextRegistration,
              recordId: this.recordId,
            }),
        })
      }

      toParentMessage(message: RegistrationMessage) {
        return toParentMessage(message)
      }
    }
    const classLensRegistration = registrationForm.lift<
      ExtendedParent,
      ParentMessage
    >(
      Object.assign(new RegistrationRecordLens(), {
        foldOutMessage: foldRegistrationOutMessage<ExtendedParent>(),
      }),
    )
    const ageChange = classLensRegistration.fold(
      extendedParent,
      registrationForm.changed('age', 22),
    )
    const reinitialize = classLensRegistration.reinitialize({
      email: 'new@example.com',
    })(ageChange.model)
    const attempt = classLensRegistration.submit()(reinitialize.model)
    const reset = classLensRegistration.reset(attempt.model)

    expect(registrationForm.inputs(ageChange.model.registration).age).toBe(22)
    expect(registrationForm.inputs(reinitialize.model.registration).email).toBe(
      'new@example.com',
    )
    expect(registrationForm.submission(attempt.model.registration)._tag).toBe(
      'Submitting',
    )
    expect(registrationForm.submission(reset.model.registration)._tag).toBe(
      'Idle',
    )
    expect(reset.model.registration.recordId).toBe('profile-1')
  })
})

describe('lifted submit with context', () => {
  const RecordContext = Schema.Struct({ recordId: Schema.String })
  const editingForm = Form.define({
    name: 'Editing',
    fields: { name: Form.field({ schema: Schema.String, initial: 'Ada' }) },
    submit: { context: RecordContext, execute: () => Effect.void },
  })
  const EditingParent = Schema.Struct({ editing: editingForm.Model })
  type EditingParent = typeof EditingParent.Type
  const EditingParentMessage = defineMessageUnion({
    ClickedSave: {},
    GotEditingMessage: { message: editingForm.Message },
  })
  type EditingParentMessage = typeof EditingParentMessage.Type
  const editing = editingForm.lift<EditingParent, EditingParentMessage>({
    parentField: 'editing',
    toParentMessage: message =>
      EditingParentMessage.GotEditingMessage({ message }),
    foldOutMessage: editingForm.OutMessage.match<
      Update.Step<EditingParent, EditingParentMessage>
    >({
      SucceededSubmit: () => stepModel => ({ model: stepModel }),
      FailedSubmit: () => stepModel => ({ model: stepModel }),
    }),
  })
  const update = (model: EditingParent, message: EditingParentMessage) =>
    EditingParentMessage.match<
      Update.Return<EditingParent, EditingParentMessage>
    >(message, {
      ClickedSave: () => editing.submit({ recordId: 'profile-1' })(model),
      GotEditingMessage: ({ message }) => editing.fold(model, message),
    })
  const submitWithContext = editingForm.Submit({
    values: { name: 'Ada' },
    context: { recordId: 'profile-1' },
    generation: 1,
  })

  it('passes the context to the Submit Command it returns', () => {
    Story.story(
      update,
      Story.given(EditingParent.make({ editing: editingForm.init() })),
      Story.message(EditingParentMessage.ClickedSave()),
      Story.Command.expectHas(submitWithContext),
      Story.Command.resolve(
        submitWithContext,
        editingForm.Message.CompletedSubmit({
          generation: 1,
          result: Result.succeed(undefined),
        }),
      ),
      Story.model(parent =>
        expect(editingForm.submission(parent.editing)._tag).toBe('Succeeded'),
      ),
    )
  })
})
