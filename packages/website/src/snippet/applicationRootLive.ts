import { Layer } from 'effect'

import { NavigationLive } from './command'
import {
  BrowserHttpLive,
  RpcLive,
  TestHttpLive,
  TestRpcLive,
} from './environment'
import { Home, Products } from './page'
import {
  LocalStorageLive,
  SessionStorageLive,
  TestLocalStorageLive,
  TestSessionStorageLive,
} from './storage'

export const HandlersLive = Layer.mergeAll(
  NavigationLive,
  Home.Live,
  Products.Live,
)
const ServicesLive = Layer.mergeAll(
  BrowserHttpLive,
  LocalStorageLive,
  SessionStorageLive,
  RpcLive,
)
const TestServicesLive = Layer.mergeAll(
  TestHttpLive,
  TestLocalStorageLive,
  TestSessionStorageLive,
  TestRpcLive,
)

export const Live = Layer.provideMerge(HandlersLive, ServicesLive)
export const TestLive = Layer.provideMerge(HandlersLive, TestServicesLive)
