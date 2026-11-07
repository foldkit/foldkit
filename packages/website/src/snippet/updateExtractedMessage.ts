import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { Url } from 'foldkit/url'

const Model = Schema.Struct({ path: Schema.String })
type Model = typeof Model.Type
const Message = defineMessageUnion({ ChangedUrl: { url: Url } })
type Message = typeof Message.Type
type ChangedUrl = typeof Message.ChangedUrl.Type
const RouterKey = Symbol('Router')
const RouterBlock = Block.make('Router', {
  key: RouterKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
})
const { makeStep, makeFieldsStep } = RouterBlock

export const changeUrl = makeStep((model, { url }: ChangedUrl) => ({
  model: modifyFields(model, { path: () => url.pathname }),
}))

export const followUrl = makeStep.fromMessage(({ url }: ChangedUrl) =>
  makeFieldsStep(() => ({ path: () => url.pathname })),
)
