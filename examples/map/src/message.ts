import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Bounds } from './model'

export const Message = defineMessageUnion({
  SucceededMountMap: { hostId: Schema.String },
  FailedMountMap: { reason: Schema.String },
  MovedMap: { bounds: Bounds },
  ClickedMarker: { locationId: Schema.String },
  ClickedLocation: { locationId: Schema.String },
  UpdatedSearchQuery: { value: Schema.String },
  ClickedFindMe: {},
  DismissedGeolocate: {},
  SucceededGeolocate: {
    lng: Schema.Number,
    lat: Schema.Number,
  },
  FailedGeolocate: { reason: Schema.String },
  SucceededFlyTo: {},
  FailedFlyTo: { reason: Schema.String },
  CompletedFocusSearchInput: {},
  CompletedLockBodyScroll: {},
  CompletedUnlockBodyScroll: {},
})

export type Message = typeof Message.Type
