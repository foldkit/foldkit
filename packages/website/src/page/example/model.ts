import { Schema } from 'effect'
import { AsyncData } from 'foldkit'

import { SourceFileTabsBlock } from './fileTabs'
import { ExampleSources } from './sources'

export const CurrentSourcesAsyncData = AsyncData.Schema(
  ExampleSources,
  Schema.String,
)
export type CurrentSourcesAsyncData = typeof CurrentSourcesAsyncData.schema.Type
export const Model = Schema.Struct({
  sourceFileTabs: SourceFileTabsBlock.Model,
  maybeActiveSourceFilePath: Schema.Option(Schema.String),
  maybeExampleUrl: Schema.Option(Schema.String),
  isLivePreviewOpen: Schema.Boolean,
  currentSources: CurrentSourcesAsyncData.schema,
})
export type Model = typeof Model.Type
