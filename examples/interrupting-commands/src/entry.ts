import { Application, Runtime } from 'foldkit'

import { Message, Model, UploadFileLive, init, update, view } from './main'

const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(Application.provide(application, UploadFileLive))
