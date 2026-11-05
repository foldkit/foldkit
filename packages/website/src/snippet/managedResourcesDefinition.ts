// resource.ts
import { makeResource } from './block'

export const CameraStream = makeResource<MediaStream>()('CameraStream')
