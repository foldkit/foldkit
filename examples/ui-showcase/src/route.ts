import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal } from 'foldkit/route'

export const ApplicationRoute = defineRouteUnion({
  Home: {},
  Button: {},
  Calendar: {},
  Checkbox: {},
  Combobox: {},
  DatePicker: {},
  Dialog: {},
  Disclosure: {},
  DragAndDrop: {},
  Fieldset: {},
  FileDrop: {},
  HoverIntent: {},
  Input: {},
  Listbox: {},
  Menu: {},
  Meter: {},
  Popover: {},
  Progress: {},
  RadioGroup: {},
  Select: {},
  Slider: {},
  Switch: {},
  Tabs: {},
  Textarea: {},
  Toast: {},
  Tooltip: {},
  Animation: {},
  VirtualList: {},
  NotFound: { path: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(ApplicationRoute.Home))

export const buttonRouter = pipe(
  literal('button'),
  Route.mapTo(ApplicationRoute.Button),
)

export const calendarRouter = pipe(
  literal('calendar'),
  Route.mapTo(ApplicationRoute.Calendar),
)

export const checkboxRouter = pipe(
  literal('checkbox'),
  Route.mapTo(ApplicationRoute.Checkbox),
)

export const comboboxRouter = pipe(
  literal('combobox'),
  Route.mapTo(ApplicationRoute.Combobox),
)

export const datePickerRouter = pipe(
  literal('date-picker'),
  Route.mapTo(ApplicationRoute.DatePicker),
)

export const dialogRouter = pipe(
  literal('dialog'),
  Route.mapTo(ApplicationRoute.Dialog),
)

export const disclosureRouter = pipe(
  literal('disclosure'),
  Route.mapTo(ApplicationRoute.Disclosure),
)

export const dragAndDropRouter = pipe(
  literal('drag-and-drop'),
  Route.mapTo(ApplicationRoute.DragAndDrop),
)

export const fieldsetRouter = pipe(
  literal('fieldset'),
  Route.mapTo(ApplicationRoute.Fieldset),
)

export const fileDropRouter = pipe(
  literal('file-drop'),
  Route.mapTo(ApplicationRoute.FileDrop),
)

export const hoverIntentRouter = pipe(
  literal('hover-intent'),
  Route.mapTo(ApplicationRoute.HoverIntent),
)

export const inputRouter = pipe(
  literal('input'),
  Route.mapTo(ApplicationRoute.Input),
)

export const listboxRouter = pipe(
  literal('listbox'),
  Route.mapTo(ApplicationRoute.Listbox),
)

export const menuRouter = pipe(
  literal('menu'),
  Route.mapTo(ApplicationRoute.Menu),
)

export const meterRouter = pipe(
  literal('meter'),
  Route.mapTo(ApplicationRoute.Meter),
)

export const popoverRouter = pipe(
  literal('popover'),
  Route.mapTo(ApplicationRoute.Popover),
)

export const progressRouter = pipe(
  literal('progress'),
  Route.mapTo(ApplicationRoute.Progress),
)

export const radioGroupRouter = pipe(
  literal('radio-group'),
  Route.mapTo(ApplicationRoute.RadioGroup),
)

export const selectRouter = pipe(
  literal('select'),
  Route.mapTo(ApplicationRoute.Select),
)

export const sliderRouter = pipe(
  literal('slider'),
  Route.mapTo(ApplicationRoute.Slider),
)

export const switchRouter = pipe(
  literal('switch'),
  Route.mapTo(ApplicationRoute.Switch),
)

export const tabsRouter = pipe(
  literal('tabs'),
  Route.mapTo(ApplicationRoute.Tabs),
)

export const textareaRouter = pipe(
  literal('textarea'),
  Route.mapTo(ApplicationRoute.Textarea),
)

export const toastRouter = pipe(
  literal('toast'),
  Route.mapTo(ApplicationRoute.Toast),
)

export const tooltipRouter = pipe(
  literal('tooltip'),
  Route.mapTo(ApplicationRoute.Tooltip),
)

export const animationRouter = pipe(
  literal('animation'),
  Route.mapTo(ApplicationRoute.Animation),
)

export const virtualListRouter = pipe(
  literal('virtual-list'),
  Route.mapTo(ApplicationRoute.VirtualList),
)

export const routeParser = Route.oneOf(
  buttonRouter,
  calendarRouter,
  checkboxRouter,
  comboboxRouter,
  datePickerRouter,
  dialogRouter,
  disclosureRouter,
  dragAndDropRouter,
  fieldsetRouter,
  fileDropRouter,
  hoverIntentRouter,
  inputRouter,
  listboxRouter,
  menuRouter,
  meterRouter,
  popoverRouter,
  progressRouter,
  radioGroupRouter,
  selectRouter,
  sliderRouter,
  switchRouter,
  tabsRouter,
  textareaRouter,
  toastRouter,
  tooltipRouter,
  animationRouter,
  virtualListRouter,
  homeRouter,
)

export const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)
