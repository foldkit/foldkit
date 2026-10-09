import { Layer } from 'effect'
import { Http } from 'foldkit'

import { FetchCountLayer } from './counterHttpCommand'

export const AppLayer = Layer.provide(FetchCountLayer, Http.layer)
