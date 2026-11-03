import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

export const NativeModel = Schema.Struct({ count: Schema.Number })
export const NativeMessage = defineMessageUnion({
  UpdatedCount: { value: Schema.Number },
})
export const NativeDefinition = Block.makeDefinition('CanonicalNative', {
  Model: NativeModel,
  Message: NativeMessage,
})
export const NativeComposition = NativeDefinition.makeComposition()
export type NativeViewBuilder = Block.ViewBuilderFor<typeof NativeComposition>
const prepare = () =>
  NativeComposition.prepareBlock({
    init: NativeComposition.makeInit(() => ({ model: { count: 0 } })),
    update: NativeComposition.makeUpdate({
      UpdatedCount: NativeDefinition.makeFieldsStep.fromMessage(
        ({ value }) => ({
          count: () => value,
        }),
      ),
    }),
    view: NativeComposition.makeView((model, h) => h.p([], [`${model.count}`])),
  })
export const NativeBlock: Block.FromAssemblyWithView<
  typeof NativeModel,
  typeof prepare
> = Block.assemble(prepare)

export const PreboundKey = Symbol('CanonicalPrebound')
export const preboundConfig = Object.freeze({
  key: PreboundKey,
  Model: NativeModel,
  Message: NativeMessage,
  Init: Schema.Tuple([]),
})
export const PreboundDefinition = Block.makeDefinition(
  'CanonicalPrebound',
  preboundConfig,
)
