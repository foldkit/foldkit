import { Application, Runtime } from 'foldkit'

import { ChangedUrl, ClickedLink, Model, init, update, view } from './main'

const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
})

Runtime.run(application)
