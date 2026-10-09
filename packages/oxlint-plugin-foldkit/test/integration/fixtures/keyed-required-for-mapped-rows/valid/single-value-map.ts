import { Cause, Result } from 'effect'
import * as Config from 'effect/Config'
import { AsyncResult } from 'effect/reactivity'
import * as Atom from 'effect/reactivity/Atom'
import { AsyncData } from 'foldkit'
import * as AsyncDataModule from 'foldkit/asyncData'
import { map } from 'foldkit/asyncData'
import type { Html, HtmlBuilder } from 'foldkit/html'

type Task = Readonly<{ id: string }>

export const asyncDataRow = (
  taskData: AsyncData.AsyncData<Task, string>,
  h: HtmlBuilder<never>,
): AsyncData.AsyncData<Html, string> =>
  AsyncData.map(taskData, task => h.div([], [task.id]))

export const asyncDataSubpathRow = (
  taskData: AsyncData.AsyncData<Task, string>,
  h: HtmlBuilder<never>,
): AsyncData.AsyncData<Html, string> =>
  AsyncDataModule.map(taskData, task => h.div([], [task.id]))

export const asyncDataNamedMapRow = (
  taskData: AsyncData.AsyncData<Task, string>,
  h: HtmlBuilder<never>,
): AsyncData.AsyncData<Html, string> =>
  map(taskData, task => h.div([], [task.id]))

export const resultRow = (
  taskResult: Result.Result<Task, string>,
  h: HtmlBuilder<never>,
): Result.Result<Html, string> =>
  Result.map(taskResult, task => h.div([], [task.id]))

export const causeRow = (
  taskCause: Cause.Cause<Task>,
  h: HtmlBuilder<never>,
): Cause.Cause<Html> => Cause.map(taskCause, task => h.div([], [task.id]))

export const configRow = (
  taskConfig: Config.Config<Task>,
  h: HtmlBuilder<never>,
): Config.Config<Html> => Config.map(taskConfig, task => h.div([], [task.id]))

export const asyncResultRow = (
  taskResult: AsyncResult.AsyncResult<Task, string>,
  h: HtmlBuilder<never>,
): AsyncResult.AsyncResult<Html, string> =>
  AsyncResult.map(taskResult, task => h.div([], [task.id]))

export const atomRow = (taskAtom: Atom.Atom<Task>, h: HtmlBuilder<never>) =>
  Atom.map(taskAtom, task => h.div([], [task.id]))
