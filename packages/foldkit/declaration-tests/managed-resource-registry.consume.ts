import { Layer } from 'effect'

import {
  type AttachedErrors,
  type AttachedHandlers,
  type AttachedServices,
  type EmptyLayer,
  type MixedHasNoLayer,
  HostedLayer,
  aggregated,
  attached,
  lifted,
  mixed,
} from './managed-resource-registry.accepted.js'

Layer.isLayer(attached.layer)
Layer.isLayer(HostedLayer)
void aggregated.text
void lifted.text
void mixed.attached

export type {
  AttachedErrors,
  AttachedHandlers,
  AttachedServices,
  EmptyLayer,
  MixedHasNoLayer,
}
