import { Application, Runtime } from 'foldkit'

import { application } from './application'
import { WebsiteLive } from './live'

Runtime.hydrate(Application.provide(application, WebsiteLive))
