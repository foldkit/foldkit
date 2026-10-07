import { Runtime } from 'foldkit'

import { Message, Model, init, update, view } from './main'
import './styles.css'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: (url, urlChangeType) =>
      Message.ChangedUrl({ url, urlChangeType }),
  },
  devTools: {
    Message,
  },
})

Runtime.hydrate(application)
