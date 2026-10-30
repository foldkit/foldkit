import { Effect, Layer, Match, Schema } from 'effect'
import { Block, Calendar, Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import { Meter, Progress } from '@foldkit/ui'

import { Navigation, NavigationLive } from './navigation'
import { AnimationPage, AnimationPageLive } from './page/animationPage'
import { ButtonPage, ButtonPageLive } from './page/buttonPage'
import { CalendarPage, CalendarPageLive } from './page/calendarPage'
import { CheckboxPage, CheckboxPageLive } from './page/checkboxPage'
import { ComboboxPage, ComboboxPageLive } from './page/comboboxPage'
import { DatePickerPage, DatePickerPageLive } from './page/datePickerPage'
import { DialogPage, DialogPageLive } from './page/dialogPage'
import { DisclosurePage, DisclosurePageLive } from './page/disclosurePage'
import { DragAndDropPage, DragAndDropPageLive } from './page/dragAndDropPage'
import { FieldsetPage, FieldsetPageLive } from './page/fieldsetPage'
import { FileDropPage, FileDropPageLive } from './page/fileDropPage'
import { HoverIntentPage, HoverIntentPageLive } from './page/hoverIntentPage'
import { InputPage, InputPageLive } from './page/inputPage'
import { ListboxPage, ListboxPageLive } from './page/listboxPage'
import { MenuPage, MenuPageLive } from './page/menuPage'
import { PopoverPage, PopoverPageLive } from './page/popoverPage'
import { RadioGroupPage, RadioGroupPageLive } from './page/radioGroupPage'
import { SelectPage, SelectPageLive } from './page/selectPage'
import { SliderPage, SliderPageLive } from './page/sliderPage'
import { SwitchPage, SwitchPageLive } from './page/switchPage'
import { TabsPage, TabsPageLive } from './page/tabsPage'
import { TextareaPage, TextareaPageLive } from './page/textareaPage'
import { ToastPage, ToastPageLive } from './page/toastPage'
import { TooltipPage, TooltipPageLive } from './page/tooltipPage'
import { VirtualListPage, VirtualListPageLive } from './page/virtualListPage'
import { ApplicationRoute, homeRouter, urlToApplicationRoute } from './route'

export const Flags = Schema.Struct({
  today: Calendar.CalendarDate,
})
export type Flags = typeof Flags.Type

export const flags = Effect.gen(function* () {
  const today = yield* Calendar.today.local

  return { today }
})

const Model = Schema.Struct({
  route: ApplicationRoute,
  navigation: Navigation,
  animationPage: AnimationPage,
  buttonPage: ButtonPage,
  calendarPage: CalendarPage,
  checkboxPage: CheckboxPage,
  comboboxPage: ComboboxPage,
  datePickerPage: DatePickerPage,
  dialogPage: DialogPage,
  disclosurePage: DisclosurePage,
  dragAndDropPage: DragAndDropPage,
  fieldsetPage: FieldsetPage,
  fileDropPage: FileDropPage,
  hoverIntentPage: HoverIntentPage,
  inputPage: InputPage,
  listboxPage: ListboxPage,
  menuPage: MenuPage,
  popoverPage: PopoverPage,
  radioGroupPage: RadioGroupPage,
  selectPage: SelectPage,
  sliderPage: SliderPage,
  switchPage: SwitchPage,
  tabsPage: TabsPage,
  textareaPage: TextareaPage,
  toastPage: ToastPage,
  tooltipPage: TooltipPage,
  virtualListPage: VirtualListPage,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
})
type Message = typeof Message.Type

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
})

export class Application extends Block<
  Application,
  Readonly<{ flags: Flags; url: Url }>
>()('Application', {
  Model,
  Message,
  Command: [NavigateInternal, LoadExternal],
}) {}

const rowClassName = 'flex flex-col gap-2 w-full max-w-sm'
const headerClassName = 'flex items-center justify-between text-sm'
const labelClassName = 'font-medium text-gray-900'
const valueClassName = 'tabular-nums text-gray-600'
const trackClassName = 'h-3 w-full overflow-hidden rounded-full bg-gray-200'
const fillClassName = 'h-full rounded-full bg-emerald-600'
const indicatorClassName = 'h-full rounded-full bg-accent-600'

const meterView = (h: HtmlBuilder<Message>): Html => {
  const healthMeterView = ({
    meter,
    label,
    fill,
  }: Meter.MeterAttributes<Message>): Html =>
    h.div(
      [h.Class(rowClassName)],
      [
        h.div(
          [h.Class(headerClassName)],
          [
            h.span([...label, h.Class(labelClassName)], ['Health']),
            h.span([h.Class(valueClassName)], ['75 / 100']),
          ],
        ),
        h.div(
          [...meter, h.Class(trackClassName)],
          [h.div([...fill, h.Class(fillClassName)])],
        ),
      ],
    )

  const storageMeterView = ({
    meter,
    label,
    fill,
  }: Meter.MeterAttributes<Message>): Html =>
    h.div(
      [h.Class(rowClassName)],
      [
        h.div(
          [h.Class(headerClassName)],
          [
            h.span([...label, h.Class(labelClassName)], ['Storage']),
            h.span([h.Class(valueClassName)], ['82%']),
          ],
        ),
        h.div(
          [...meter, h.Class(trackClassName)],
          [h.div([...fill, h.Class('h-full rounded-full bg-amber-500')])],
        ),
      ],
    )

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Meter']),
      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mb-4')],
        ['Scalar value'],
      ),
      Meter.view(
        {
          id: 'health-meter',
          value: 75,
          valueText: '75 of 100 health',
          toView: healthMeterView,
        },
        h,
      ),
      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Thresholds'],
      ),
      Meter.view(
        {
          id: 'storage-meter',
          value: 82,
          low: 30,
          high: 80,
          optimum: 20,
          valueText: '82 percent used',
          toView: storageMeterView,
        },
        h,
      ),
    ],
  )
}

const progressView = (h: HtmlBuilder<Message>): Html => {
  const uploadProgressView = ({
    progress,
    label,
    track,
    indicator,
  }: Progress.ProgressAttributes<Message>): Html =>
    h.div(
      [h.Class(rowClassName)],
      [
        h.div(
          [h.Class(headerClassName)],
          [
            h.span([...label, h.Class(labelClassName)], ['Upload']),
            h.span([h.Class(valueClassName)], ['42%']),
          ],
        ),
        h.div(
          [...progress, h.Class(trackClassName)],
          [
            h.div(
              [...track, h.Class('h-full w-full')],
              [h.div([...indicator, h.Class(indicatorClassName)])],
            ),
          ],
        ),
      ],
    )

  const syncingProgressView = ({
    progress,
    label,
    indicator,
  }: Progress.ProgressAttributes<Message>): Html =>
    h.div(
      [h.Class(rowClassName)],
      [
        h.span([...label, h.Class(labelClassName)], ['Syncing']),
        h.div(
          [...progress, h.Class(trackClassName)],
          [
            h.div([
              ...indicator,
              h.Class(`${indicatorClassName} w-1/3 animate-pulse`),
            ]),
          ],
        ),
      ],
    )

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Progress']),
      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mb-4')],
        ['Determinate'],
      ),
      Progress.view(
        {
          id: 'upload-progress',
          value: 42,
          valueText: '42 percent',
          toView: uploadProgressView,
        },
        h,
      ),
      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Indeterminate'],
      ),
      Progress.view(
        {
          id: 'sync-progress',
          valueText: 'Syncing files',
          toView: syncingProgressView,
        },
        h,
      ),
    ],
  )
}

const homeView = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('max-w-2xl')],
    [
      h.h1(
        [h.Class('text-2xl md:text-3xl font-bold text-gray-900 mb-4')],
        ['Foldkit UI Showcase'],
      ),
      h.p(
        [h.Class('text-gray-600 mb-4')],
        [
          'This is a showcase of every Foldkit UI component. Select a component from the menu to see it in action.',
        ],
      ),
      h.p(
        [h.Class('text-gray-600')],
        [
          'Each component is headless. You provide the markup and styling via a callback, and Foldkit handles accessibility, keyboard navigation, and state management.',
        ],
      ),
    ],
  )

const notFoundView = (path: string, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('max-w-2xl')],
    [
      h.h1(
        [h.Class('text-2xl md:text-3xl font-bold text-red-600 mb-4')],
        ['404 — Page Not Found'],
      ),
      h.p(
        [h.Class('text-gray-600 mb-4')],
        [`The path "${path}" was not found.`],
      ),
      h.a(
        [h.Href(homeRouter()), h.Class('text-accent-600 hover:underline')],
        ['Go Home'],
      ),
    ],
  )

const contentView = (model: Model, h: HtmlBuilder<Message>): Html =>
  ApplicationRoute.match(model.route, {
    Home: () => homeView(h),
    Button: () => model.buttonPage.view(),
    Calendar: () => model.calendarPage.view(),
    Checkbox: () => model.checkboxPage.view(),
    Combobox: () => model.comboboxPage.view(),
    DatePicker: () => model.datePickerPage.view(),
    Dialog: () => model.dialogPage.view(),
    Disclosure: () => model.disclosurePage.view(),
    DragAndDrop: () => model.dragAndDropPage.view(),
    Fieldset: () => model.fieldsetPage.view(),
    FileDrop: () => model.fileDropPage.view(),
    HoverIntent: () => model.hoverIntentPage.view(),
    Input: () => model.inputPage.view(),
    Listbox: () => model.listboxPage.view(),
    Menu: () => model.menuPage.view(),
    Meter: () => meterView(h),
    Popover: () => model.popoverPage.view(),
    Progress: () => progressView(h),
    RadioGroup: () => model.radioGroupPage.view(),
    Select: () => model.selectPage.view(),
    Slider: () => model.sliderPage.view(),
    Switch: () => model.switchPage.view(),
    Tabs: () => model.tabsPage.view(),
    Textarea: () => model.textareaPage.view(),
    Toast: () => model.toastPage.view(),
    Tooltip: () => model.tooltipPage.view(),
    Animation: () => model.animationPage.view(),
    VirtualList: () => model.virtualListPage.view(),
    NotFound: ({ path }) => notFoundView(path, h),
  })

const routeTitle = (route: ApplicationRoute): string =>
  Match.value(route).pipe(
    Match.tag('Home', () => 'Foldkit UI Showcase'),
    Match.orElse(({ _tag }) => `${_tag} | Foldkit UI Showcase`),
  )

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { flags: { today }, url }) {
    const navigation = yield* new Navigation('navigation')

    return {
      model: {
        route: urlToApplicationRoute(url),
        navigation,
        animationPage: yield* new AnimationPage('animationPage'),
        buttonPage: yield* new ButtonPage('buttonPage'),
        calendarPage: yield* new CalendarPage('calendarPage', { today }),
        checkboxPage: yield* new CheckboxPage('checkboxPage'),
        comboboxPage: yield* new ComboboxPage('comboboxPage'),
        datePickerPage: yield* new DatePickerPage('datePickerPage', { today }),
        dialogPage: yield* new DialogPage('dialogPage'),
        disclosurePage: yield* new DisclosurePage('disclosurePage'),
        dragAndDropPage: yield* new DragAndDropPage('dragAndDropPage'),
        fieldsetPage: yield* new FieldsetPage('fieldsetPage'),
        fileDropPage: yield* new FileDropPage('fileDropPage'),
        hoverIntentPage: yield* new HoverIntentPage('hoverIntentPage'),
        inputPage: yield* new InputPage('inputPage'),
        listboxPage: yield* new ListboxPage('listboxPage'),
        menuPage: yield* new MenuPage('menuPage'),
        popoverPage: yield* new PopoverPage('popoverPage'),
        radioGroupPage: yield* new RadioGroupPage('radioGroupPage'),
        selectPage: yield* new SelectPage('selectPage'),
        sliderPage: yield* new SliderPage('sliderPage'),
        switchPage: yield* new SwitchPage('switchPage'),
        tabsPage: yield* new TabsPage('tabsPage'),
        textareaPage: yield* new TextareaPage('textareaPage'),
        toastPage: yield* new ToastPage('toastPage'),
        tooltipPage: yield* new TooltipPage('tooltipPage'),
        virtualListPage: yield* new VirtualListPage('virtualListPage'),
      },

      update: {
        CompletedNavigateInternal: model => ({ model }),
        CompletedLoadExternal: model => ({ model }),

        ClickedLink: (model, { request }) =>
          UrlRequest.match(request, {
            Internal: ({ url }) => ({
              model,
              commands: [NavigateInternal({ url: urlToString(url) })],
            }),
            External: ({ href }) => ({
              model,
              commands: [LoadExternal({ href })],
            }),
          }),

        ChangedUrl: (model, { url }) => ({
          model: modifyFields(model, {
            route: () => urlToApplicationRoute(url),
          }),
          messages: [
            model.navigation.send(
              Navigation.Message.RequestedCloseMobileMenu(),
            ),
          ],
        }),
      },

      commands: {
        NavigateInternal: ({ url }) =>
          pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
        LoadExternal: ({ href }) =>
          load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
      },

      view: (model, h) => ({
        title: routeTitle(model.route),
        body: h.div(
          [h.Class('flex flex-col md:flex-row min-h-screen bg-white')],
          [
            model.navigation.view({ _tag: 'MobileHeader' }),
            model.navigation.view({
              _tag: 'MobileMenu',
              currentRoute: model.route,
            }),
            model.navigation.view({
              _tag: 'Sidebar',
              currentRoute: model.route,
            }),
            h.main(
              [h.Class('flex-1 p-4 md:p-8 overflow-auto')],
              [contentView(model, h)],
            ),
          ],
        ),
      }),
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      NavigationLive,
      AnimationPageLive,
      ButtonPageLive,
      CalendarPageLive,
      CheckboxPageLive,
      ComboboxPageLive,
      DatePickerPageLive,
      DialogPageLive,
      DisclosurePageLive,
      DragAndDropPageLive,
      FieldsetPageLive,
      FileDropPageLive,
      HoverIntentPageLive,
      InputPageLive,
      ListboxPageLive,
      MenuPageLive,
      PopoverPageLive,
      RadioGroupPageLive,
      SelectPageLive,
      SliderPageLive,
      SwitchPageLive,
      TabsPageLive,
      TextareaPageLive,
      ToastPageLive,
      TooltipPageLive,
      VirtualListPageLive,
    ),
  ),
)
