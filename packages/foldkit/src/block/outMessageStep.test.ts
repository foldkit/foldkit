import { Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Update from '../update/public.js'
import * as Block from './public.js'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  RequestedSelect: { value: Schema.String },
})
type Message = typeof Message.Type
const OutMessage = defineMessageUnion({
  Selected: { value: Schema.String },
  Closed: {},
})
type OutMessage = typeof OutMessage.Type
const SelectionDefinition = Block.makeDefinition('OutMessageStepSelection', {
  Model,
  Message,
  OutMessage,
})

it('returns the identical Model and OutMessage without other result channels', () => {
  const model = Model.make({ count: 1 })
  const outMessage = OutMessage.Closed()
  const closeStep = SelectionDefinition.makeOutMessageStep(() => outMessage)
  const result = closeStep(model)

  expect(result).toEqual({ model, outMessage })
  expect(result.model).toBe(model)
  expect(result.outMessage).toBe(outMessage)
  expectTypeOf<typeof result.outMessage>().toEqualTypeOf<
    typeof OutMessage.Closed.Type
  >()
  expect(Object.keys(result).sort()).toEqual(['model', 'outMessage'])
  expectTypeOf<typeof result.commands>().toEqualTypeOf<undefined>()
  expectTypeOf<Update.RequirementsOf<typeof closeStep>>().toEqualTypeOf<never>()
  expectTypeOf<
    Update.RegistrationEvidenceOf<typeof result>
  >().toEqualTypeOf<never>()
})

it('retains refined input Models and literal OutMessage payloads', () => {
  const ExtendedModel = Schema.Struct({ ...Model.fields, label: Schema.String })
  type ExtendedModel = typeof ExtendedModel.Type
  const model = ExtendedModel.make({ count: 2, label: 'Selected' })
  const selectStep = SelectionDefinition.makeOutMessageStep(() => ({
    _tag: 'Selected',
    value: 'Pear',
  }))
  const result = selectStep(model)

  expect(result.model).toBe(model)
  expect(result.outMessage.value).toBe('Pear')
  expectTypeOf<typeof result.model>().toEqualTypeOf<typeof ExtendedModel.Type>()
  expectTypeOf<typeof result.outMessage.value>().toEqualTypeOf<'Pear'>()
  expectTypeOf<typeof result.outMessage._tag>().toEqualTypeOf<'Selected'>()
})

it('supports primitive Models without changing their value', () => {
  const TextDefinition = Block.makeDefinition('OutMessageStepText', {
    Model: Schema.String,
    Message: Schema.Never,
    OutMessage,
  })
  const result = TextDefinition.makeOutMessageStep(() => OutMessage.Closed())(
    'ready',
  )

  expect(result.model).toBe('ready')
  expectTypeOf<typeof result.model>().toEqualTypeOf<'ready'>()
})

it('emits a derived OutMessage from an inferred Binding policy', () => {
  const SelectionComposition = SelectionDefinition.makeComposition()
  const prepareSelection = () =>
    SelectionComposition.prepareBlock({
      init: SelectionComposition.makeInit(() => ({ model: { count: 0 } })),
      update: SelectionComposition.makeUpdate({
        RequestedSelect: (model, { value }) => ({
          model,
          outMessage: OutMessage.Selected({ value }),
        }),
      }),
      operations: { requestSelect: Message.RequestedSelect },
    })
  const SelectionBlock: Block.FromAssemblyWithOutMessage<
    typeof Model,
    typeof prepareSelection
  > = Block.assemble(prepareSelection)
  const ParentModel = Schema.Struct({ selection: SelectionBlock.Model })
  type ParentModel = typeof ParentModel.Type
  const ParentOutMessage = defineMessageUnion({
    Chose: { value: Schema.String },
  })
  type ParentOutMessage = typeof ParentOutMessage.Type
  const ParentDefinition = Block.makeDefinition('OutMessageStepParent', {
    Model: ParentModel,
    Message,
    OutMessage: ParentOutMessage,
  })
  const SelectionBinding = ParentDefinition.makeBinding(SelectionBlock, {
    field: 'selection',
  }).withOutMessagePolicy({
    fold: ParentDefinition.makeOutMessageFold(SelectionBlock, {
      Selected: ({ value }) =>
        ParentDefinition.makeOutMessageStep(() =>
          ParentOutMessage.Chose({ value }),
        ),
      Closed: ParentDefinition.makeNoopStep,
    }),
  })
  const ParentComposition = ParentDefinition.makeComposition({
    bindings: [SelectionBinding],
  })
  const update = ParentComposition.makeUpdate({
    RequestedSelect: (model, { value }) =>
      SelectionBinding.requestSelect({ value })(model),
  })
  const model = ParentModel.make({ selection: { count: 3 } })
  const result = update(model, Message.RequestedSelect({ value: 'Pear' }))

  expect(result.model).toEqual(model)
  expect(result.outMessage).toEqual(ParentOutMessage.Chose({ value: 'Pear' }))
  expectTypeOf<Update.RequirementsOf<typeof update>>().toEqualTypeOf<never>()

  const unsafeUpdate = Reflect.apply(
    ParentComposition.makeUpdate,
    ParentComposition,
    [
      {
        RequestedSelect: (parentModel: ParentModel) => {
          const combined = Reflect.apply(Update.combineSteps, undefined, [
            [
              ParentDefinition.makeNoopStep(),
              SelectionBinding.requestSelect({ value: 'Pear' }),
            ],
          ])

          return Reflect.apply(combined, undefined, [parentModel])
        },
      },
    ],
  )
  expect(() =>
    Reflect.apply(unsafeUpdate, undefined, [
      model,
      Message.RequestedSelect({ value: 'Pear' }),
    ]),
  ).toThrow(
    '[foldkit] Update.combineSteps cannot combine a Step that emits an OutMessage.',
  )

  if (false) {
    const selectAndPreserveStep = ParentDefinition.makeStep(() =>
      Update.combineSteps([
        ParentDefinition.makeNoopStep(),
        SelectionBinding.requestSelect({ value: 'Pear' }),
      ]),
    )

    ParentComposition.makeUpdate({
      // @ts-expect-error combineSteps cannot discard an OutMessage produced by a registered Binding policy.
      RequestedSelect: model => {
        const combined = Update.combineSteps(model, [
          ParentDefinition.makeNoopStep(),
          SelectionBinding.requestSelect({ value: 'Pear' }),
        ])
        return combined
      },
    })
    ParentComposition.makeUpdate({
      // @ts-expect-error Extracting the combination through makeStep cannot erase the deferred OutMessage.
      RequestedSelect: model => selectAndPreserveStep(model),
    })
    ParentComposition.makeUpdate({
      // @ts-expect-error Conditional use cannot erase the deferred OutMessage.
      RequestedSelect: (model, message) =>
        message.value === 'Pear' ? selectAndPreserveStep(model) : { model },
    })
    ParentComposition.makeInit(
      // @ts-expect-error Initializers cannot discard an OutMessage from a deferred combined Step.
      () => ({ model: {}, steps: [selectAndPreserveStep] }),
    )

    ParentDefinition.makeComposition().makeUpdate({
      RequestedSelect: model =>
        // @ts-expect-error Emitting an OutMessage cannot erase child registration obligations.
        SelectionBinding.requestSelect({ value: 'Pear' })(model),
    })
  }
})

if (false) {
  const WithoutOutMessage = Block.makeDefinition('OutMessageStepWithout', {
    Model,
    Message,
  })
  // @ts-expect-error An OutMessage contract is required.
  WithoutOutMessage.makeOutMessageStep
  // @ts-expect-error Composition does not duplicate Definition-owned Step authoring.
  SelectionDefinition.makeComposition().makeOutMessageStep
  // @ts-expect-error Foreign OutMessages are rejected.
  SelectionDefinition.makeOutMessageStep(() => ({ _tag: 'Foreign' }))
  SelectionDefinition.makeOutMessageStep(() => ({
    _tag: 'Selected',
    // @ts-expect-error Payloads must satisfy the declared OutMessage Schema.
    value: 1,
  }))
  // @ts-expect-error Optional values use withOutMessage instead.
  SelectionDefinition.makeOutMessageStep(undefined)
  const unknownValue: unknown = OutMessage.Closed()
  const uncheckedValue: any = OutMessage.Closed()
  // @ts-expect-error Unknown values cannot establish the OutMessage contract.
  SelectionDefinition.makeOutMessageStep(unknownValue)
  // @ts-expect-error Any values cannot bypass the OutMessage contract.
  SelectionDefinition.makeOutMessageStep(uncheckedValue)
  const closeStep = SelectionDefinition.makeOutMessageStep(() =>
    OutMessage.Closed(),
  )
  const noopStep = SelectionDefinition.makeNoopStep()
  const fieldsStep = SelectionDefinition.makeFieldsStep(() => ({}))
  const noopAndClose = [noopStep, closeStep]
  const fieldsAndClose = [fieldsStep, closeStep]
  // @ts-expect-error The produced Step checks its owning Model.
  closeStep({ count: 'invalid' })
  // @ts-expect-error combineSteps cannot discard an OutMessage.
  Update.combineSteps(Model.make({ count: 0 }), [closeStep, noopStep])
  // @ts-expect-error A preceding Model-only Step cannot hide an OutMessage.
  Update.combineSteps([noopStep, closeStep])
  // @ts-expect-error A later Model-only Step cannot hide an OutMessage.
  Update.combineSteps([closeStep, noopStep])
  // @ts-expect-error An extracted Step list retains its OutMessage channel.
  Update.combineSteps(noopAndClose)
  // @ts-expect-error A field Step cannot hide an OutMessage in an extracted list.
  Update.combineSteps(fieldsAndClose)
  // @ts-expect-error A data-first extracted list cannot hide its OutMessage.
  Update.combineSteps(Model.make({ count: 0 }), noopAndClose)
  // @ts-expect-error A pure no-op's public contract cannot hide an OutMessage.
  const emittingNoopStep: typeof noopStep = closeStep
  // @ts-expect-error A pure field Step's public contract cannot hide an OutMessage.
  const emittingFieldsStep: typeof fieldsStep = closeStep
  void emittingNoopStep
  void emittingFieldsStep

  const UnknownDefinition = Block.makeDefinition('UnknownOutMessageStep', {
    Model: Schema.Unknown,
    Message: Schema.Never,
    OutMessage,
  })
  const emitUnknownStep = UnknownDefinition.makeOutMessageStep(() =>
    OutMessage.Closed(),
  )
  const preserveUnknownStep = UnknownDefinition.makeNoopStep()
  // @ts-expect-error An unconstrained Model still retains its OutMessage channel.
  Update.combineSteps([preserveUnknownStep, emitUnknownStep])
}
