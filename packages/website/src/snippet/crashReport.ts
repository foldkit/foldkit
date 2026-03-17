import { Runtime } from 'foldkit'

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  crash: {
    report: ({ error, model, message }) => {
      Sentry.captureException(error, {
        extra: { model, message },
      })
    },
  },
  container: document.getElementById('root')!,
})

Runtime.run(element)
