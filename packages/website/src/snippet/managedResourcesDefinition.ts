// resource.ts
import { CameraBlock } from './definition'

export const CameraStream =
  CameraBlock.makeResource<MediaStream>()('CameraStream')
