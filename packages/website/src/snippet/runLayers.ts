import { Application, Runtime } from 'foldkit'

import { makeApplication } from './application'
import { AppLayer } from './layer'

const application = makeApplication(document.getElementById('root'))

Runtime.run(Application.provide(application, AppLayer))
