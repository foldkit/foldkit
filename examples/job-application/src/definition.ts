import { defineApplication } from 'foldkit'

import { Flags } from './flags'
import { Message } from './message'
import { Model } from './model'

export const Application = defineApplication({ Model, Message, Startup: Flags })
