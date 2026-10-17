import { defineApplication } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { ApplicationRoute } from './route'

export const Application = defineApplication({
  Model,
  Message,
  Startup: ApplicationRoute.People,
})
