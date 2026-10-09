import { Application, Runtime } from 'foldkit'

import { application } from './application'
import { Live } from './live'

Runtime.hydrate(Application.provide(application, Live))
