import { Layer } from 'effect'
import type { Block, Command, Update } from 'foldkit'

import {
  ChildBlock,
  ChildInitContext,
  ChildrenBinding,
  FiniteBinding,
  Id,
  ParentBlock,
  ParentDefinition,
  ParentModel,
  PickerBinding,
  Read,
  ReadService,
  RowsBinding,
  init,
  insert,
  makeMapBinding,
} from './map-binding-method.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
type ExpectedRequirements = Block.Qualify<
  'children',
  Command.HandlerOf<typeof Read>
>
type ExpectedMessage = Readonly<{
  _tag: 'GotChildrenMessage'
  placement: 'children'
  generation: number
  key: typeof Id.Type
  message: typeof ChildBlock.Message.Type
}>
type IncomingMessage<Binding> =
  // oxlint-disable-next-line typescript/no-explicit-any -- Wildcards isolate the exact generated Message asserted below.
  Binding extends Block.BindingDeliveryEvidence<any, infer Message, any>
    ? Message
    : never

export type ExactRecordKey = Expect<
  Equal<Parameters<typeof ChildrenBinding.fold>[1], typeof Id.Type>
>
export type ExactLiteralKey = Expect<
  Equal<Parameters<typeof FiniteBinding.fold>[1], 'First' | 'Second'>
>
export type ExactMessage = Expect<
  Equal<IncomingMessage<typeof ChildrenBinding>, ExpectedMessage>
>
export type ExactWrapperPlacement = Expect<
  Equal<typeof RowsBinding.placement, 'rows'>
>
export type ExactInitArgs = Expect<
  Equal<
    Parameters<typeof ChildBlock.init>,
    [
      count: number,
      label?: string | undefined,
      ...labels: ReadonlyArray<string>,
    ]
  >
>
export type ExactInitRequirements = Expect<
  Equal<Update.RequirementsOf<typeof insert>, ExpectedRequirements>
>
export type ExactRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof insert>>,
    Block.RequirementOfBinding<typeof ChildrenBinding>
  >
>
export type ExactServices = Expect<
  Equal<Layer.Services<typeof ParentBlock.EffectsLayer>, ReadService>
>
export type ExactConstructorError = Expect<
  Equal<Layer.Error<typeof ParentBlock.EffectsLayer>, 'ReadUnavailable'>
>
export type ExactModel = Expect<
  Equal<typeof ParentBlock.Model.Type, typeof ParentModel.Type>
>
export type ExactChildInitContext = Expect<
  Equal<
    typeof ParentDefinition.ChildInitContext.Type,
    typeof ChildInitContext.Type
  >
>
export type ExactPickerModel = Expect<
  Equal<
    Parameters<typeof PickerBinding.fold>[0]['pickers'][string],
    Readonly<{ selected: 'Red' | 'Blue' }>
  >
>

export const ImportedHelperBinding = makeMapBinding(ChildBlock, {
  field: 'children',
  placement: 'importedChildren',
  delivery: {
    toUpdateContext: (model, key) => {
      const exactModel: Expect<Equal<typeof model, typeof ParentModel.Type>> =
        true
      const exactKey: Expect<Equal<typeof key, typeof Id.Type>> = true
      void exactModel
      void exactKey

      return [{ multiplier: model.multiplier }]
    },
  },
})
export type ExactImportedPlacement = Expect<
  Equal<typeof ImportedHelperBinding.placement, 'importedChildren'>
>

const model = init(1).model
const key = Id.make('first')
insert(model, key)
ChildBlock.init(1, undefined, 'extra label')
ChildrenBinding.read(key, { multiplier: 1 })
PickerBinding.select('first', { selected: 'Red' })
// @ts-expect-error Relocated imports retain branded occurrence identities.
ChildrenBinding.read('first', { multiplier: 1 })
// @ts-expect-error Relocated imports retain exact literal HashMap keys.
FiniteBinding.read('Third', { multiplier: 1 })
// @ts-expect-error Relocated imports retain required child initialization args.
ChildBlock.init()
// @ts-expect-error Relocated imports retain generic UI operation arguments.
PickerBinding.select('first', { selected: 'Green' })
makeMapBinding(ChildBlock, {
  field: 'children',
  // @ts-expect-error Relocated detached helpers reject incomplete child context.
  delivery: { toUpdateContext: () => [] },
})
