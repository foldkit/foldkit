import { Application, Runtime } from 'foldkit'

import {
  ComputeLive,
  ManageEngineLive,
  Message,
  Model,
  init,
  managedResources,
  update,
  view,
} from './main'

const application = Application.make({
  Model,
  init,
  update,
  view,
  managedResources,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

const withCompute = Application.provide(application, ComputeLive)
const runnable = Application.provide(withCompute, ManageEngineLive)

Runtime.run(runnable)
