import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

import * as PlaygroundPreview from '../playgroundPreview'
import { PlaygroundFileTabsBlock } from './fileTabs'

export const PlaygroundState = defineTaggedUnion({
  Idle: {},
  Booting: {},
  Booted: { preview: PlaygroundPreview.State },
  Failed: { reason: Schema.String },
})

export const Model = Schema.Struct({
  slug: Schema.String,
  state: PlaygroundState,
  files: Schema.Record(Schema.String, Schema.String),
  fileTabs: PlaygroundFileTabsBlock.Model,
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

export const Message = defineMessageUnion({
  InformedOfSupport: { isSupported: Schema.Boolean },
  BootedPlayground: { previewUrl: Schema.String },
  FailedBootPlayground: { reason: Schema.String },
  ReleasedPlayground: {},
  LoadedPlaygroundPreview: { previewUrl: Schema.String },
  EditedPlaygroundFile: { path: Schema.String, content: Schema.String },
  SucceededMountPlaygroundEditor: {},
  FailedMountPlaygroundEditor: { reason: Schema.String },
  SucceededSchedulePlaygroundFileWrite: {},
  FailedSchedulePlaygroundFileWrite: { reason: Schema.String },
  CompletedWaitForPlaygroundServerFailure: { reason: Schema.String },
})

export const PlaygroundDefinition = Block.makeDefinition('Playground', {
  Model,
  Message,
})

export const { makeFieldsStep, makeNoopStep } = PlaygroundDefinition
