import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

import { Tabs } from '@foldkit/ui'

import * as PlaygroundPreview from '../playgroundPreview'

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
  fileTabs: Tabs.Model,
  activeFilePath: Schema.String,
  // NOTE: Paths edited before the WebContainer finished booting. Writes
  // dispatched at that time fail with `ResourceNotAvailable`, so we
  // accumulate the paths here and flush them once `BootedPlayground`
  // fires.
  dirtyPaths: Schema.Array(Schema.String),
  // NOTE: Surfaced as a banner when set. Cleared on `BootedPlayground`
  // and on each successful write schedule, so transient errors don't
  // linger after recovery.
  lastWriteError: Schema.Option(Schema.String),
  maybeIsSupported: Schema.Option(Schema.Boolean),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  BootedPlayground: { previewUrl: Schema.String },
  FailedBootPlayground: { reason: Schema.String },
  ReleasedPlayground: {},
  LoadedPlaygroundPreview: { previewUrl: Schema.String },
  GotFileTabsMessage: { message: Tabs.Message },
  EditedPlaygroundFile: { path: Schema.String, content: Schema.String },
  SucceededMountPlaygroundEditor: {},
  FailedMountPlaygroundEditor: { reason: Schema.String },
  SucceededSchedulePlaygroundFileWrite: {},
  FailedSchedulePlaygroundFileWrite: { reason: Schema.String },
  CompletedWaitForPlaygroundServerFailure: { reason: Schema.String },
})
export type Message = typeof Message.Type

export const Playground = Block.define('Playground', {
  Model,
  Message,
})
