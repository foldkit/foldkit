import { Application, Runtime } from 'foldkit'

import { application } from './application'
import { Live } from './live'

Runtime.run(Application.provide(application, Live))
