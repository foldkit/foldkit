import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const PreviewModel = Schema.Struct({ content: Schema.String })
type PreviewModel = typeof PreviewModel.Type

const PreviewKey = Symbol('Preview')

const PreviewDefinition = Block.makeDefinition('Preview', {
  key: PreviewKey,
  Init: Schema.Tuple([]),
  isMessageFree: true,

  Model: PreviewModel,
  Message: Schema.Never,
})

const PreviewComposition = PreviewDefinition.makeComposition()
const previewInit = PreviewComposition.makeInit(() => ({
  model: PreviewModel.make({ content: '' }),
}))
const PreviewBlock = PreviewDefinition.contract

const layer = PreviewDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init: previewInit,
      update: PreviewComposition.makeUpdate({}),
    }
  }),
).layer

const PageModel = Schema.Struct({ preview: PreviewModel })
type PageModel = typeof PageModel.Type

const PageMessage = defineMessageUnion({ ClickedPublish: {} })
type PageMessage = typeof PageMessage.Type

const PageKey = Symbol('Page')

const PageDefinition = Block.makeDefinition('Page', {
  key: PageKey,
  Init: Schema.Tuple([]),
  Model: PageModel,
  Message: PageMessage,
})

export const PreviewBinding = PageDefinition.makeBinding(PreviewBlock, {
  field: 'preview',
})
