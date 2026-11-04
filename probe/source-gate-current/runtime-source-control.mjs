import { Effect, Layer, Schema } from 'effect'
import * as Block from '../../packages/foldkit/dist/block/public.js'
import { defineMessageUnion } from '../../packages/foldkit/dist/message/index.js'
import { writeFileSync } from 'node:fs'
const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({ ClickedIncrement: {} })
const LocalKey = Symbol('RuntimeSourceLocal')
const ForeignKey = Symbol('RuntimeSourceForeign')
const Local = Block.make('RuntimeSourceLocal', { key: LocalKey, Model, Message, Init: Schema.Tuple([]), view: { kind: 'Element' } })
const Foreign = Block.make('RuntimeSourceForeign', { key: ForeignKey, Model, Message, Init: Schema.Tuple([]), view: { kind: 'Element' } })
const local = Local.makeComposition()
const foreign = Foreign.makeComposition()
const updateCases = { ClickedIncrement: Local.makeNoopStep() }
const update = local.makeUpdate(updateCases)
const view = local.makeView((_model, h) => h.div([]))
const init = local.makeInit(() => ({ model: Model.make({ count: 0 }) }))
const results = []
for (const [name, fields] of [
 ['valid', { update, view }],
 ['foreign-update', { update: foreign.makeUpdate(updateCases), view }],
 ['foreign-view', { update, view: foreign.makeView((_model, h) => h.div([])) }],
 ['same-owner-identical-metadata', { update: Local.makeComposition().makeUpdate(updateCases), view }],
]) {
 const layer = Local.makeLayer(Effect.succeed({ children: [], init, ...fields }))
 try {
  await Effect.runPromise(Effect.scoped(Layer.build(layer)))
  results.push({ name, acquired: true })
 } catch (error) {
  results.push({ name, acquired: false, message: String(error) })
 }
}
if (!results[0].acquired || results.slice(1).some(value => value.acquired || !value.message.includes('another static Composition'))) throw new Error('Unexpected runtime source behavior')
writeFileSync(new URL('runtime-source-control.json', import.meta.url), JSON.stringify(results,null,2)+'\n')
console.log(results)
