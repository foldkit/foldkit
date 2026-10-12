import { pipe } from 'effect'
import { Application, Runtime } from 'foldkit'

import { makeApplication } from './application'
import { AppLayer } from './layer'

const application = makeApplication(document.getElementById('root'))

pipe(application, Application.provide(AppLayer), Runtime.hydrate)
