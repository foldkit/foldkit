import { Layer } from 'effect'

import {
  BrowserHttpLayer,
  HttpTestLayer,
  RpcLayer,
  RpcTestLayer,
} from './environment'
import {
  LocalStorageLayer,
  LocalStorageTestLayer,
  SessionStorageLayer,
  SessionStorageTestLayer,
} from './storage'

export const ApplicationLayer = Layer.mergeAll(
  BrowserHttpLayer,
  LocalStorageLayer,
  SessionStorageLayer,
  RpcLayer,
)

export const ApplicationTestLayer = Layer.mergeAll(
  HttpTestLayer,
  LocalStorageTestLayer,
  SessionStorageTestLayer,
  RpcTestLayer,
)
