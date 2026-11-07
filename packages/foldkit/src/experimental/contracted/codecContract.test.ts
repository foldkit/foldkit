import {
  Effect,
  Layer,
  Option,
  Result,
  Schema,
  SchemaTransformation,
} from 'effect'
import { vi } from 'vitest'

import { describe, expect, it } from '@effect/vitest'

import * as Block from '../../block/public.js'
import { Request } from '../../devTools/protocol.js'
import { createDevToolsStore } from '../../devTools/store.js'
import { dispatchRequest } from '../../devTools/webSocketBridge.js'
import { defineMessageUnion } from '../../message/index.js'
import { __setDevToolsOverlay } from '../../runtime/devToolsConfig.js'
import * as ModelPreservationBridge from '../../runtime/modelPreservationBridge.js'
import * as Program from '../../runtime/programPublic.js'
import { embed } from '../../runtime/start.js'
import * as Story from '../../story/public.js'
import { modifyFields } from '../../struct/index.js'

const decodeLabel = vi.fn((value: string) => Effect.succeed(`decoded:${value}`))
const encodeLabel = vi.fn((value: string) => Effect.succeed(`encoded:${value}`))

const Label = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformEffect({
      decode: decodeLabel,
      encode: encodeLabel,
    }),
  ),
)
const ChildModel = Schema.Struct({ label: Schema.String })
const ChildMessage = defineMessageUnion({ SubmittedLabel: { label: Label } })
const EditorKey = Symbol('CodecContractEditor')
const EditorBlock = Block.make('CodecContractEditor', {
  key: EditorKey,
  Model: ChildModel,
  Message: ChildMessage,
  InitArgs: Schema.Tuple([]),
})
const childComposition = EditorBlock.makeComposition()
const editorLayer = EditorBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: childComposition.makeInit(() => ({
      model: ChildModel.make({ label: '' }),
    })),
    update: childComposition.makeUpdate({
      SubmittedLabel: (model, { label }) => ({
        model: modifyFields(model, { label: () => label }),
      }),
    }),
  }),
)
const Model = Schema.Struct({ editor: EditorBlock.Model })
type Model = typeof Model.Type
const Message = defineMessageUnion({ ClickedReload: {} })
const ApplicationKey = Symbol('CodecContractApplication')
const ApplicationBlock = Block.make('CodecContractApplication', {
  key: ApplicationKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const EditorBinding = ApplicationBlock.makeRequiredFieldBinding(EditorBlock, {
  field: 'editor',
})
const composition = ApplicationBlock.makeComposition({
  bindings: [EditorBinding],
})
const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const editor = yield* EditorBinding

    return {
      children: [editor],
      init: composition.makeInit(() => ({ model: {} })),
      update: composition.makeUpdate({
        ClickedReload: ApplicationBlock.makeNoopStep(),
      }),
      view: composition.makeView((model, h) => h.div([], [model.editor.label])),
    }
  }),
).pipe(Layer.provide(editorLayer))
const subject = { block: ApplicationBlock, layer }
const encodedChildMessage = {
  _tag: 'GotEditorMessage',
  placement: 'editor',
  generation: 0,
  message: { _tag: 'SubmittedLabel', label: 'value' },
}

describe('complete child Message serialization', () => {
  it('hosts a child codec without evaluating its transformations during startup', async () => {
    decodeLabel.mockClear()
    encodeLabel.mockClear()
    const preservation = vi
      .spyOn(ModelPreservationBridge, 'resolvePreservedModel')
      .mockReturnValue(Effect.succeed(undefined))
    const installOverlay = vi.fn(() => Effect.void)
    __setDevToolsOverlay(installOverlay)
    expect(decodeLabel).not.toHaveBeenCalled()
    expect(encodeLabel).not.toHaveBeenCalled()
    const container = document.createElement('div')
    container.id = 'opaque-codec-devtools'
    document.body.append(container)
    const handle = embed(
      Program.makeElement({
        ...subject,
        container,
        devTools: { dispatch: true, show: 'Always' },
      }),
    )

    try {
      await vi.waitFor(() => expect(installOverlay).toHaveBeenCalledTimes(1))
      expect(decodeLabel).not.toHaveBeenCalled()
      expect(encodeLabel).not.toHaveBeenCalled()
    } finally {
      await handle.dispose()
      __setDevToolsOverlay(undefined)
      preservation.mockRestore()
      container.remove()
    }
  })

  it.effect(
    'retains synchronous child transformations in the complete Message codec',
    () =>
      Story.withBlock(subject, executable =>
        Effect.gen(function* () {
          const decoded = yield* Schema.decodeUnknownEffect(executable.Message)(
            encodedChildMessage,
          )
          const applied = executable.update(executable.init().model, decoded)
          const encoded = yield* Schema.encodeEffect(executable.Message)(
            decoded,
          )

          expect(applied.model.editor.label).toBe('decoded:value')
          expect(encoded).toEqual({
            ...encodedChildMessage,
            message: { _tag: 'SubmittedLabel', label: 'encoded:decoded:value' },
          })
        }),
      ),
  )

  it.effect(
    'decodes a child envelope before DevTools admits it to update',
    () =>
      Story.withBlock(subject, executable =>
        Effect.gen(function* () {
          const initialModel = executable.init().model
          const store = yield* createDevToolsStore({
            replay: model => model,
            render: () => Effect.void,
            markRenderPending: Effect.void,
          })
          yield* store.recordInit(initialModel, [])
          const applied: Array<Model> = []
          const response = yield* dispatchRequest(
            store,
            Option.some(Schema.toCodecJson(executable.Message)),
            Option.none(),
            Request.RequestDispatchMessage({ message: encodedChildMessage }),
            decoded => {
              if (!Schema.is(executable.Message)(decoded)) {
                return Result.fail('Expected a decoded complete Message')
              }

              return Result.succeed(
                Effect.sync(() => {
                  applied.push(executable.update(initialModel, decoded).model)
                  return Result.succeed(Option.some(0))
                }),
              )
            },
          )

          expect(response._tag).toBe('ResponseDispatched')
          expect(applied).toEqual([{ editor: { label: 'decoded:value' } }])
        }),
      ),
  )
})
