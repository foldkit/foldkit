import { Application, Runtime } from 'foldkit'

import { application } from './application'
import { layer } from './layer'

Runtime.hydrate(Application.provide(application, layer))
