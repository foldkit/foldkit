import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

import { PlaygroundFileTabsBlock } from './fileTabs'
import * as PlaygroundPreview from './playgroundPreview'
import type { ViewInputs } from './viewInputs'

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
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
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
export type Message = typeof Message.Type
export type EditedPlaygroundFile = typeof Message.EditedPlaygroundFile.Type
export type SucceededMountPlaygroundEditor =
  typeof Message.SucceededMountPlaygroundEditor.Type
export type FailedMountPlaygroundEditor =
  typeof Message.FailedMountPlaygroundEditor.Type

export const InMessage = defineInMessageUnion({
  InformedOfSupport: { isSupported: Schema.Boolean },
})
export type InMessage = typeof InMessage.Type

export const PlaygroundKey = Symbol('Playground')
export const PlaygroundBlock = Block.make('Playground', {
  key: PlaygroundKey,
  InitArgs: Schema.Tuple([
    Schema.String,
    Schema.optional(Schema.Option(Schema.Boolean)),
  ]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  Model,
  Message,
  InMessage,
})

export const {
  makeRequiredFieldBinding,
  makeCommand,
  makeComposition,
  makeFieldsStep,
  makeManagedResources,
  makeMountStream,
  makeNoopStep,
  makeOutMessageFold,
  makeResource,
} = PlaygroundBlock
