import { defineApplication } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { Startup } from './startup'

export const Application = defineApplication({ Model, Message, Startup })
