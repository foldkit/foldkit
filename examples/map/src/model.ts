import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Location } from './locations'

export const Bounds = Schema.Struct({
  west: Schema.Number,
  south: Schema.Number,
  east: Schema.Number,
  north: Schema.Number,
})
export type Bounds = typeof Bounds.Type

export const LngLat = Schema.Struct({ lng: Schema.Number, lat: Schema.Number })
export type LngLat = typeof LngLat.Type

export const GeolocateState = defineTaggedUnion({
  Idle: {},
  Locating: {},
  Failed: { reason: Schema.String },
})
export type GeolocateState = typeof GeolocateState.Type

export const Model = Schema.Struct({
  locations: Schema.Array(Location),
  searchQuery: Schema.String,
  maybeMapHostId: Schema.Option(Schema.String),
  maybeMapError: Schema.Option(Schema.String),
  maybeBounds: Schema.Option(Bounds),
  maybeSelectedLocationId: Schema.Option(Schema.String),
  maybeUserLocation: Schema.Option(LngLat),
  geolocateState: GeolocateState,
})
export type Model = typeof Model.Type
