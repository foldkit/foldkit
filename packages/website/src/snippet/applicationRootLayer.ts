import { Layer } from 'effect'

import { Navigate } from './command'
import {
  BrowserHttpLayer,
  HttpTestLayer,
  RpcLayer,
  RpcTestLayer,
} from './environment'
import { Home, Products } from './page'
import {
  LocalStorageLayer,
  LocalStorageTestLayer,
  SessionStorageLayer,
  SessionStorageTestLayer,
} from './storage'

export const EffectsLayer = Layer.mergeAll(
  Navigate.layer,
  Home.EffectsLayer,
  Products.EffectsLayer,
)
export const ServicesLayer = Layer.mergeAll(
  BrowserHttpLayer,
  LocalStorageLayer,
  SessionStorageLayer,
  RpcLayer,
)
const ServicesTestLayer = Layer.mergeAll(
  HttpTestLayer,
  LocalStorageTestLayer,
  SessionStorageTestLayer,
  RpcTestLayer,
)

export const AppLayer = Layer.provide(EffectsLayer, ServicesLayer)
export const AppTestLayer = Layer.provide(EffectsLayer, ServicesTestLayer)
