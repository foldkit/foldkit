import { Option } from 'effect'
import { Runtime } from 'foldkit'

import * as Sentry from '@sentry/browser'

import { ApplicationComposition, init, update, view } from './application'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  crash: {
    report: ({ error, model, message }) => {
      Sentry.captureException(error, {
        extra: { model, message: Option.getOrUndefined(message) },
      })
    },
  },
  container: document.getElementById('root'),
})

Runtime.run(application)
