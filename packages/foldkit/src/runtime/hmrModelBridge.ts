import { Effect, Exit, Function, Schema, pipe } from 'effect'

import {
  PreserveModelMessage,
  RequestModelMessage,
  RestoreModelMessage,
} from './hmrProtocol.js'

const encodePreserveModelMessage =
  Schema.encodeUnknownSync(PreserveModelMessage)
const encodeRequestModelMessage = Schema.encodeUnknownSync(RequestModelMessage)
const decodeRestoreModelMessage = Schema.decodeUnknownExit(RestoreModelMessage)

export const preserveModel = (
  id: string,
  encodedModel: unknown,
  isHmrReload: boolean,
): void => {
  if (import.meta.hot) {
    import.meta.hot.send(
      'foldkit:preserve-model',
      encodePreserveModelMessage(
        PreserveModelMessage.make({ id, model: encodedModel, isHmrReload }),
      ),
    )
  }
}

const PLUGIN_RESPONSE_TIMEOUT_MS = 500

// NOTE: asks @foldkit/vite-plugin for a model preserved across the last HMR
// reload. The plugin only serves a model whose preservation was flushed by a
// reload, so a host-driven dispose-then-embed remount initializes fresh while
// a code reload restores state.
export const resolveHmrModel = (runtimeId: string): Effect.Effect<unknown> => {
  const hot = import.meta.hot
  if (!hot) {
    return Effect.succeed(undefined)
  }

  return pipe(
    Effect.callback<unknown>(resume => {
      const handler = (message: unknown): void => {
        Exit.match(decodeRestoreModelMessage(message), {
          onFailure: Function.constVoid,
          onSuccess: ({ id, model }) => {
            if (id === runtimeId) {
              hot.off('foldkit:restore-model', handler)
              resume(Effect.succeed(model))
            }
          },
        })
      }
      hot.on('foldkit:restore-model', handler)
      hot.send(
        'foldkit:request-model',
        encodeRequestModelMessage(RequestModelMessage.make({ id: runtimeId })),
      )
      return Effect.sync(() => hot.off('foldkit:restore-model', handler))
    }),
    Effect.timeout(PLUGIN_RESPONSE_TIMEOUT_MS),
    Effect.catchTag('TimeoutError', () => {
      console.warn(
        '[foldkit] No response from @foldkit/vite-plugin. Add it to your vite.config.ts for HMR model preservation:\n\n' +
          "  import { foldkit } from '@foldkit/vite-plugin'\n\n" +
          '  export default defineConfig({ plugins: [foldkit()] })\n\n' +
          'Starting without HMR support.',
      )
      return Effect.succeed(undefined)
    }),
  )
}
