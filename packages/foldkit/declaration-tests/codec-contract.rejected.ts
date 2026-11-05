import { Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'

import {
  EditorBlock,
  Message,
  Model,
  decoding,
  dispatchProgram,
  editorLayer,
  encoding,
} from './codec-contract.accepted.js'

const UndeclaredCodecKey = Symbol('UndeclaredCodec')
const UndeclaredCodecBlock = Block.make('UndeclaredCodec', {
  key: UndeclaredCodecKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
})
const EditorBinding = UndeclaredCodecBlock.makeBinding(EditorBlock, {
  field: 'editor',
})
const composition = UndeclaredCodecBlock.makeComposition({
  bindings: [EditorBinding],
})
const constructor = Effect.gen(function* () {
  const editor = yield* EditorBinding

  return {
    children: [editor],
    init: composition.makeInit(() => ({ model: {} })),
    update: composition.makeUpdate({
      ClickedReload: UndeclaredCodecBlock.makeNoopStep(),
    }),
  }
})

// @ts-expect-error Opaque child dispatch codecs must fit the parent's public codec bounds.
UndeclaredCodecBlock.makeLayer(constructor).pipe(Layer.provide(editorLayer))

// @ts-expect-error Complete Message decoding retains its inferred Service requirement.
Effect.runPromise(decoding)

// @ts-expect-error Complete Message encoding retains its inferred Service requirement.
Effect.runPromise(encoding)

// @ts-expect-error External DevTools dispatch cannot start until its decoder is supplied.
dispatchProgram.start()
