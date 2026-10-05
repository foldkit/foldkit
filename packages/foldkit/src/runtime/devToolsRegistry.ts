import { Effect } from 'effect'

import {
  MountRuntime,
  MountTracker,
  liveViewStateChanges,
} from '../mount/index.js'
import type { DevToolsConfig } from './devToolsConfig.js'
import type { DevToolsIntegration } from './devToolsIntegration.js'

type MakeDevToolsIntegration = <Model, Message>(
  input: Readonly<{
    devTools: DevToolsConfig | undefined
    update: (model: Model, message: Message) => Readonly<{ model: Model }>
    maybeFreezeModel: (model: Model) => Model
    enqueueMessageEffect: (message: Message) => Effect.Effect<void>
  }>,
) => Effect.Effect<DevToolsIntegration<Model, Message>>

let registeredIntegration: MakeDevToolsIntegration | undefined

/** Registers the recording integration supplied by the optional DevTools entry. */
export const __registerDevToolsIntegration = (
  integration: MakeDevToolsIntegration,
): void => {
  registeredIntegration = integration
}

/** Builds a live-only integration when no DevTools capability was registered. */
export const makeDevToolsIntegration: MakeDevToolsIntegration = input => {
  if (registeredIntegration !== undefined) {
    return registeredIntegration(input)
  }

  return Effect.succeed({
    isRecordingCommands: false,
    mountTracker: MountTracker.of({
      started: () => {},
      ended: () => {},
    }),
    mountRuntime: MountRuntime.of({
      captureViewStateChanges: () => liveViewStateChanges,
    }),
    drainMountEvents: () => ({ starts: [], ends: [] }),
    readViewState: () => 'Live',
    setViewState: () => {},
    isPausedNow: () => false,
    installDevToolsStore: () => Effect.void,
    resumeDevTools: Effect.void,
    recordInit: () => Effect.void,
    recordMessage: () => {},
    recordCommandResult: () => {},
    attachRenderedMounts: () => {},
  })
}
