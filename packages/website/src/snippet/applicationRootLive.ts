import { Layer } from 'effect'

import { NavigationLive } from './command'
import { Home, Products } from './page'

export const Live = Layer.mergeAll(NavigationLive, Home.Live, Products.Live)
