import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { ApplicationRoute } from './route'

export const CatalogStatus = Schema.Literals(['Idle', 'Loading', 'Ready'])
export type CatalogStatus = typeof CatalogStatus.Type

export const PaintingStatus = defineTaggedUnion({
  Idle: {},
  Loading: { paintingId: Schema.Number },
  Ready: { paintingId: Schema.Number },
})
export type PaintingStatus = typeof PaintingStatus.Type

export const LoggedTransition = Schema.Struct({
  sequenceNumber: Schema.Number,
  maybePreviousRoute: Schema.Option(ApplicationRoute),
  nextRoute: ApplicationRoute,
})
export type LoggedTransition = typeof LoggedTransition.Type

export const Model = Schema.Struct({
  route: ApplicationRoute,
  transitionLog: Schema.Array(LoggedTransition),
  catalogStatus: CatalogStatus,
  paintingStatus: PaintingStatus,
  studioDraft: Schema.String,
  maybeSavedDraft: Schema.Option(Schema.String),
})
export type Model = typeof Model.Type
