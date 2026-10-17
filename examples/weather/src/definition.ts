import { defineApplication } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const Application = defineApplication({ Model, Message })
