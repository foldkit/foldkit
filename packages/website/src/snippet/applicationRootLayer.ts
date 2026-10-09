import { Layer } from 'effect'

import { NavigationLayer } from './command'
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

export const HandlersLayer = Layer.mergeAll(
  NavigationLayer,
  Home.layer,
  Products.layer,
)
const ServicesLayer = Layer.mergeAll(
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

export const layer = Layer.provideMerge(HandlersLayer, ServicesLayer)
export const TestLayer = Layer.provideMerge(HandlersLayer, ServicesTestLayer)
