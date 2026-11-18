import { Effect, Option, Result, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Story from '../../test/story.js'
import * as Update from '../../update/index.js'
import * as Form from './form.js'

const registration = Form.define({
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
type RegistrationModel = typeof registration.Model.Type
type RegistrationMessage = typeof registration.Message.Type

const ParentMessage = defineMessageUnion({
  GotRegistrationMessage: { message: registration.Message },
})
type ParentMessage = typeof ParentMessage.Type
const toParentMessage = (message: RegistrationMessage) =>
  ParentMessage.GotRegistrationMessage({ message })

const foldRegistrationOutMessage = <ParentModel>() =>
  registration.OutMessage.match<Update.Step<ParentModel, ParentMessage>>({
    SucceededSubmit: () => stepModel => ({ model: stepModel }),
    FailedSubmit: () => stepModel => ({ model: stepModel }),
  })

const Parent = Schema.Struct({
  registration: registration.Model,
  maybeRegisteredId: Schema.Option(Schema.Number),
  maybeFailure: Schema.Option(Schema.String),
})
type Parent = typeof Parent.Type

const initialParent = Parent.make({
  registration: registration.init(),
  maybeRegisteredId: Option.none(),
  maybeFailure: Option.none(),
})

const lifted = registration.lift<Parent, ParentMessage>({
  parentField: 'registration',
  toParentMessage,
  foldOutMessage: registration.OutMessage.match<
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
  ...registration.Model.fields,
  recordId: Schema.String,
})
const ExtendedParent = Schema.Struct({ registration: ExtendedRegistration })
type ExtendedParent = typeof ExtendedParent.Type

const extendedParent = ExtendedParent.make({
  registration: ExtendedRegistration.make({
    ...registration.init(),
    recordId: 'profile-1',
  }),
})

describe('lifting through a parent field', () => {
  it('folds Form Messages into the parent field', () => {
    const fold = lifted.fold(initialParent, registration.changed('age', 22))

    expect(registration.inputs(fold.model.registration).age).toBe(22)
  })

  it('folds an accepted submission result through foldOutMessage', () => {
    const attempt = lifted.submit()(initialParent)
    const settled = lifted.fold(
      attempt.model,
      registration.Message.CompletedSubmit({
        generation: 1,
        result: Result.succeed(7),
      }),
    )

    expect(settled.model.maybeRegisteredId).toEqual(Option.some(7))
  })

  it('folds a rejected submission result through foldOutMessage', () => {
    const attempt = lifted.submit()(initialParent)
    const settled = lifted.fold(
      attempt.model,
      registration.Message.CompletedSubmit({
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
      lifted.reinitialize({ email: 'ada@example.com' }),
      lifted.submit(),
    ])(initialParent)

    expect(
      reinitializeThenSubmit.commands?.map(command => command.name),
    ).toEqual(['SubmitRegistration'])
  })

  it('treats a parentField config with undefined read and write as a direct field', () => {
    const direct = registration.lift<Parent, ParentMessage>({
      parentField: 'registration',
      read: undefined,
      write: undefined,
      toParentMessage,
      foldOutMessage: foldRegistrationOutMessage<Parent>(),
    })
    const reinitialize = direct.reinitialize({ email: 'new@example.com' })(
      initialParent,
    )

    expect(registration.inputs(reinitialize.model.registration).email).toBe(
      'new@example.com',
    )
  })
})

describe('lifting through a lens', () => {
  it('leaves the parent unchanged when the lens reads no Form', () => {
    const absent = registration.lift<Parent, ParentMessage>({
      read: () => Option.none(),
      write: parent => parent,
      toParentMessage,
      foldOutMessage: foldRegistrationOutMessage<Parent>(),
    })

    expect(absent.submit()(initialParent).model).toBe(initialParent)
    expect(absent.reset(initialParent).model).toBe(initialParent)
    expect(
      absent.reinitialize({ email: 'new@example.com' })(initialParent).model,
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
      const extended = registration.lift<ExtendedParent, ParentMessage>({
        ...lens,
        foldOutMessage: foldRegistrationOutMessage<ExtendedParent>(),
      })
      const reinitialize = extended.reinitialize({ email: 'new@example.com' })(
        extendedParent,
      )

      expect(reinitialize.model.registration.recordId).toBe('profile-1')
      expect(registration.inputs(reinitialize.model.registration).email).toBe(
        'new@example.com',
      )
    },
  )

  it('calls inherited lens methods with the lens as their receiver', () => {
    class ProfileLens implements Form.FormLens<
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
    const classLifted = registration.lift<ExtendedParent, ParentMessage>(
      Object.assign(new ProfileLens(), {
        foldOutMessage: foldRegistrationOutMessage<ExtendedParent>(),
      }),
    )
    const fold = classLifted.fold(
      extendedParent,
      registration.changed('age', 22),
    )
    const reinitialize = classLifted.reinitialize({ email: 'new@example.com' })(
      fold.model,
    )
    const attempt = classLifted.submit()(reinitialize.model)
    const reset = classLifted.reset(attempt.model)

    expect(registration.inputs(fold.model.registration).age).toBe(22)
    expect(registration.inputs(reinitialize.model.registration).email).toBe(
      'new@example.com',
    )
    expect(registration.submission(attempt.model.registration)._tag).toBe(
      'Submitting',
    )
    expect(registration.submission(reset.model.registration)._tag).toBe('Idle')
    expect(reset.model.registration.recordId).toBe('profile-1')
  })
})

describe('lifted submit with context', () => {
  const RecordContext = Schema.Struct({ recordId: Schema.String })
  const editing = Form.define({
    name: 'Editing',
    fields: { name: Form.field({ schema: Schema.String, initial: 'Ada' }) },
    submit: { context: RecordContext, execute: () => Effect.void },
  })
  const EditingParent = Schema.Struct({ editing: editing.Model })
  type EditingParent = typeof EditingParent.Type
  const EditingMessage = defineMessageUnion({
    ClickedSave: {},
    GotEditingMessage: { message: editing.Message },
  })
  type EditingMessage = typeof EditingMessage.Type
  const liftedEditing = editing.lift<EditingParent, EditingMessage>({
    parentField: 'editing',
    toParentMessage: message => EditingMessage.GotEditingMessage({ message }),
    foldOutMessage: editing.OutMessage.match<
      Update.Step<EditingParent, EditingMessage>
    >({
      SucceededSubmit: () => stepModel => ({ model: stepModel }),
      FailedSubmit: () => stepModel => ({ model: stepModel }),
    }),
  })
  const update = (parent: EditingParent, parentMessage: EditingMessage) =>
    EditingMessage.match<Update.Return<EditingParent, EditingMessage>>(
      parentMessage,
      {
        ClickedSave: () =>
          liftedEditing.submit({ recordId: 'profile-1' })(parent),
        GotEditingMessage: ({ message: editingMessage }) =>
          liftedEditing.fold(parent, editingMessage),
      },
    )
  const submitWithContext = editing.Submit({
    values: { name: 'Ada' },
    context: { recordId: 'profile-1' },
    generation: 1,
  })

  it('passes the context to the Submit Command it returns', () => {
    Story.story(
      update,
      Story.given(EditingParent.make({ editing: editing.init() })),
      Story.message(EditingMessage.ClickedSave()),
      Story.Command.expectHas(submitWithContext),
      Story.Command.resolve(
        submitWithContext,
        editing.Message.CompletedSubmit({
          generation: 1,
          result: Result.succeed(undefined),
        }),
      ),
      Story.model(parent =>
        expect(editing.submission(parent.editing)._tag).toBe('Succeeded'),
      ),
    )
  })
})
