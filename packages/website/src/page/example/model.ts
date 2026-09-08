import { Schema } from 'effect'
import { AsyncData } from 'foldkit'

import { Tabs } from '@foldkit/ui'

import { ExampleSources } from './sources'

export const CurrentSourcesAsyncData = AsyncData.Schema(
  ExampleSources,
  Schema.String,
)

export const Model = Schema.Struct({
  sourceFileTabs: Tabs.Model,
  maybeActiveSourceFilePath: Schema.Option(Schema.String),
  maybeExampleUrl: Schema.Option(Schema.String),
  isLivePreviewOpen: Schema.Boolean,
  currentSources: CurrentSourcesAsyncData.schema,
})
export type Model = typeof Model.Type
