// resource.ts
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const Camera = Block.define('Camera', { Model, Message })
export const CameraComposition = Camera.makeComposition()
export const CameraStream = Camera.resource<MediaStream>()('CameraStream')
