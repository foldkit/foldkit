import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

import * as PlaygroundPreview from '../playgroundPreview'
import { PlaygroundContainer } from './container'
import { PlaygroundFileTabs } from './fileTabs'

export const PlaygroundState = defineTaggedUnion({
  Idle: {},
  Booting: {},
  Booted: { preview: PlaygroundPreview.State },
  Failed: { reason: Schema.String },
})
export type PlaygroundState = typeof PlaygroundState.Type

export const Model = Schema.Struct({
  slug: Schema.String,
  state: PlaygroundState,
  files: Schema.Record(Schema.String, Schema.String),
  fileTabs: PlaygroundFileTabs,
  activeFilePath: Schema.String,
  // NOTE: Paths edited before the WebContainer finished booting. Writes
  // dispatched at that time fail because the container is not ready yet,
  // so we accumulate the paths here and flush them once the container
  // reports `Booted`.
  dirtyPaths: Schema.Array(Schema.String),
  // NOTE: Surfaced as a banner when set. Cleared on `Booted` and on each
  // successful write schedule, so transient errors don't linger after
  // recovery.
  lastWriteError: Schema.Option(Schema.String),
  maybeIsSupported: Schema.Option(Schema.Boolean),
  maybeContainer: Schema.Option(PlaygroundContainer),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  InformedOfSupport: { isSupported: Schema.Boolean },
  LoadedPlaygroundPreview: { previewUrl: Schema.String },
  EditedPlaygroundFile: { path: Schema.String, content: Schema.String },
  SucceededMountPlaygroundEditor: {},
  FailedMountPlaygroundEditor: { reason: Schema.String },
  SucceededSchedulePlaygroundFileWrite: {},
  FailedSchedulePlaygroundFileWrite: { reason: Schema.String },
  CompletedWaitForPlaygroundServerFailure: { reason: Schema.String },
})
export type Message = typeof Message.Type
export type EditedPlaygroundFile = typeof Message.EditedPlaygroundFile.Type
export type SucceededMountPlaygroundEditor =
  typeof Message.SucceededMountPlaygroundEditor.Type
export type FailedMountPlaygroundEditor =
  typeof Message.FailedMountPlaygroundEditor.Type
