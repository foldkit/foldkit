import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const PreviewModel = Schema.Struct({ content: Schema.String })
type PreviewModel = typeof PreviewModel.Type

export const PreviewKey = Symbol('Preview')
export const PreviewBlock = Block.make('Preview', {
  key: PreviewKey,
  InitArgs: Schema.Tuple([]),
  isMessageFree: true,

  Model: PreviewModel,
  Message: Schema.Never,
})

const PreviewComposition = PreviewBlock.makeComposition()
const previewInit = PreviewComposition.makeInit(() => ({
  model: PreviewModel.make({ content: '' }),
}))

const layer = PreviewBlock.makeLayer({
  init: previewInit,
  update: PreviewComposition.makeUpdate({}),
})

const PageModel = Schema.Struct({ preview: PreviewModel })
type PageModel = typeof PageModel.Type

const PageMessage = defineMessageUnion({ ClickedPublish: {} })
type PageMessage = typeof PageMessage.Type

export const PageKey = Symbol('Page')
const PageBlock = Block.make('Page', {
  key: PageKey,
  InitArgs: Schema.Tuple([]),
  Model: PageModel,
  Message: PageMessage,
})

export const PreviewBinding = PageBlock.makeRequiredFieldBinding(PreviewBlock, {
  field: 'preview',
})
