import { Runtime } from 'foldkit'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  routing: {
    onUrlChange: url => ChangedUrl({ url }),
  },
  viewTransition: ({ message }) => message._tag === 'ChangedUrl',
})

Runtime.run(application)
