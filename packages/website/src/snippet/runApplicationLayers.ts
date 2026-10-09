import { Application, Runtime } from 'foldkit'

import { application } from './application'
import { layer } from './layer'

Runtime.run(Application.provide(application, layer))
