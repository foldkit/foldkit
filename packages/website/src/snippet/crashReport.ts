import { Option } from 'effect'
import { Runtime } from 'foldkit'

import * as Sentry from '@sentry/browser'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  crash: {
    report: ({ error, model, message, maybeReleaseError }) => {
      Sentry.captureException(error, {
        extra: {
          model,
          message: Option.getOrUndefined(message),
          releaseError: Option.getOrUndefined(maybeReleaseError),
        },
      })
    },
  },
  container: document.getElementById('root'),
})

Runtime.run(application)
