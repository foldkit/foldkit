// resource.ts
import { CameraDefinition } from './definition'

export const CameraStream =
  CameraDefinition.makeResource<MediaStream>()('CameraStream')
