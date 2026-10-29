import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const PreviewModel = Schema.Struct({ content: Schema.String })
type PreviewModel = typeof PreviewModel.Type

const PreviewComposition = Block.makeDefinition('Preview', {
  Model: PreviewModel,
  Message: Schema.Never,
}).makeComposition()
const previewInit = PreviewComposition.makeInit(() => ({
  model: PreviewModel.make({ content: '' }),
}))
const prepare = () =>
  PreviewComposition.prepareBlock({
    init: previewInit,
    update: PreviewComposition.makeUpdate({}),
  })
const PreviewBlock = Block.assemble(prepare)

const PageModel = Schema.Struct({ preview: PreviewModel })
type PageModel = typeof PageModel.Type

const PageMessage = defineMessageUnion({ ClickedPublish: {} })
type PageMessage = typeof PageMessage.Type

const PageDefinition = Block.makeDefinition('Page', {
  Model: PageModel,
  Message: PageMessage,
})

export const PreviewBinding = PageDefinition.makeBinding(PreviewBlock, {
  field: 'preview',
})
