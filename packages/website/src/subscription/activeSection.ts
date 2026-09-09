import {
  Array,
  Effect,
  Function,
  HashSet,
  Match,
  MutableRef,
  Option,
  Queue,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { AsyncData, Render, Subscription } from 'foldkit'

import { Message } from '../message'
import { type Model } from '../model'
import {
  About,
  AiMcp,
  AiOverview,
  AiSkills,
  ApiReference,
  AsyncData as AsyncDataPage,
  BestPractices,
  ComingFromReact,
  ComingFromTanStackQuery,
  Contact,
  ContentApi,
  Core,
  EffectAtomComparison,
  ElmComparison,
  FieldValidation,
  GetStarted,
  Patterns,
  Performance,
  Privacy,
  ProjectOrganization,
  ReactComparison,
  Roadmap,
  Routing,
  Testing,
  TestingScene,
  TestingStory,
  ToolingLinting,
  TypingTerminal,
  Ui,
  WhyFoldkit,
} from '../page'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  activeSection: entry(
    {
      pageId: Schema.String,
      sections: Schema.Array(Schema.String),
    },
    {
      modelToDependencies: model => {
        const currentPageTableOfContents = Match.value(model.route).pipe(
          Match.tags({
            WhyFoldkit: () => WhyFoldkit.tableOfContents,
            Performance: () => Performance.tableOfContents,
            GetStarted: () => GetStarted.tableOfContents,
            Roadmap: () => Roadmap.tableOfContents,
            ComingFromReact: () => ComingFromReact.tableOfContents,
            ComingFromTanStackQuery: () =>
              ComingFromTanStackQuery.tableOfContents,
            ReactComparison: () => ReactComparison.tableOfContents,
            EffectAtomComparison: () => EffectAtomComparison.tableOfContents,
            ElmComparison: () => ElmComparison.tableOfContents,
            RoutingAndNavigation: () => Routing.tableOfContents,
            FieldValidation: () => FieldValidation.tableOfContents,
            Testing: () => Testing.tableOfContents,
            BestPracticesSideEffects: () =>
              BestPractices.SideEffectsAndPurity.tableOfContents,
            BestPracticesMessages: () => BestPractices.Messages.tableOfContents,
            BestPracticesKeying: () => BestPractices.Keying.tableOfContents,
            BestPracticesImmutability: () =>
              BestPractices.Immutability.tableOfContents,
            ProjectOrganization: () => ProjectOrganization.tableOfContents,
            ToolingLinting: () => ToolingLinting.tableOfContents,
            ApiModule: ({ moduleSlug }) =>
              Option.match(AsyncData.getData(model.apiReference.apiData), {
                onSome: data =>
                  pipe(
                    ApiReference.resolveModule(data.parsedApi, moduleSlug),
                    Option.match({
                      onNone: () => [],
                      onSome: ApiReference.toModuleTableOfContents,
                    }),
                  ),
                onNone: () => [],
              }),
            CoreArchitecture: () => Core.Architecture.tableOfContents,
            CoreCounterExample: () => Core.CounterExample.tableOfContents,
            CoreModel: () => Core.CoreModel.tableOfContents,
            CoreMessages: () => Core.Messages.tableOfContents,
            CoreUpdate: () => Core.CoreUpdate.tableOfContents,
            CoreView: () => Core.CoreView.tableOfContents,
            TestingStory: () => TestingStory.tableOfContents,
            TestingScene: () => TestingScene.tableOfContents,
            CoreCommands: () => Core.Commands.tableOfContents,
            CoreMount: () => Core.Mount.tableOfContents,
            CoreCustomElement: () => Core.CustomElement.tableOfContents,
            CoreSubscriptions: () => Core.Subscriptions.tableOfContents,
            CoreInitAndFlags: () => Core.InitAndFlags.tableOfContents,
            CoreDom: () => Core.CoreDom.tableOfContents,
            CoreRender: () => Core.CoreRender.tableOfContents,
            CoreFile: () => Core.CoreFile.tableOfContents,
            CoreHttp: () => Core.CoreHttp.tableOfContents,
            CoreCanvas: () => Core.CoreCanvas.tableOfContents,
            CoreRuntime: () => Core.Runtime.tableOfContents,
            CoreServerRendering: () => Core.CoreServerRendering.tableOfContents,
            CoreResources: () => Core.Resources.tableOfContents,
            CoreManagedResources: () => Core.ManagedResources.tableOfContents,
            CoreCrashView: () => Core.CrashView.tableOfContents,
            CoreViewTransitions: () => Core.ViewTransitions.tableOfContents,
            CoreSlowWarnings: () => Core.Slow.tableOfContents,
            CoreFreezeModel: () => Core.FreezeModel.tableOfContents,
            CorePreserveScroll: () => Core.PreserveScroll.tableOfContents,
            CoreDevTools: () => Core.DevTools.tableOfContents,
            CoreSubmodel: () => Core.SubmodelPage.tableOfContents,
            CoreMachine: () => Core.Machine.tableOfContents,
            AsyncData: () => AsyncDataPage.tableOfContents,
            PatternsInformingSubmodels: () =>
              Patterns.InformingSubmodels.tableOfContents,
            PatternsSubscriptionOrganization: () =>
              Patterns.SubscriptionOrganization.tableOfContents,
            CoreViewMemoization: () => Core.ViewMemoization.tableOfContents,
            CoreEmbedding: () => Core.Embedding.tableOfContents,
            UiButton: () => Ui.ButtonPage.tableOfContents,
            UiInput: () => Ui.InputPage.tableOfContents,
            UiTextarea: () => Ui.TextareaPage.tableOfContents,
            UiCalendar: () => Ui.CalendarPage.tableOfContents,
            UiDatePicker: () => Ui.DatePickerPage.tableOfContents,
            UiCheckbox: () => Ui.CheckboxPage.tableOfContents,
            UiRadioGroup: () => Ui.RadioGroupPage.tableOfContents,
            UiSlider: () => Ui.SliderPage.tableOfContents,
            UiSwitch: () => Ui.SwitchPage.tableOfContents,
            UiListbox: () => Ui.ListboxPage.tableOfContents,
            UiCombobox: () => Ui.ComboboxPage.tableOfContents,
            UiDialog: () => Ui.DialogPage.tableOfContents,
            UiMenu: () => Ui.MenuPage.tableOfContents,
            UiPopover: () => Ui.PopoverPage.tableOfContents,
            UiDisclosure: () => Ui.DisclosurePage.tableOfContents,
            UiTabs: () => Ui.TabsPage.tableOfContents,
            UiNav: () => Ui.NavPage.tableOfContents,
            UiFieldset: () => Ui.FieldsetPage.tableOfContents,
            UiSelect: () => Ui.SelectPage.tableOfContents,
            UiDragAndDrop: () => Ui.DragAndDropPage.tableOfContents,
            UiFileDrop: () => Ui.FileDropPage.tableOfContents,
            UiToast: () => Ui.ToastPage.tableOfContents,
            UiTooltip: () => Ui.TooltipPage.tableOfContents,
            UiAnimation: () => Ui.AnimationPage.tableOfContents,
            UiAnchor: () => Ui.AnchorPage.tableOfContents,
            UiHoverIntent: () => Ui.HoverIntentPage.tableOfContents,
            UiVirtualList: () => Ui.VirtualListPage.tableOfContents,
            UiOverview: () => Ui.OverviewPage.tableOfContents,
            UiSelectionSubmodels: () =>
              Ui.SelectionSubmodelsPage.tableOfContents,
            AiOverview: () => AiOverview.tableOfContents,
            AiSkills: () => AiSkills.tableOfContents,
            AiMcp: () => AiMcp.tableOfContents,
            ContentApi: () => ContentApi.tableOfContents,
            About: () => About.tableOfContents,
            Contact: () => Contact.tableOfContents,
            Privacy: () => Privacy.tableOfContents,
            TypingTerminal: () => TypingTerminal.tableOfContents,
          }),
          Match.tag(
            'Home',
            'Newsletter',
            'Blog',
            'BlogPost',
            'Playground',
            'NotFound',
            'Examples',
            'ExampleDetail',
            () => [],
          ),
          Match.exhaustive,
        )

        return {
          pageId: model.route._tag,
          sections: Array.map(currentPageTableOfContents, ({ id }) => id),
        }
      },
      dependenciesToStream: ({ sections }) =>
        Stream.callback<typeof Message.ChangedActiveSection.Type>(queue =>
          Effect.gen(function* () {
            if (!Array.isReadonlyArrayNonEmpty(sections)) {
              return yield* Effect.never
            }

            yield* Render.afterCommit

            yield* Effect.acquireRelease(
              Effect.sync(() => {
                const visibleSections = MutableRef.make(HashSet.empty<string>())
                const observer = new IntersectionObserver(
                  entries => {
                    Array.forEach(
                      entries,
                      ({ isIntersecting, target: { id } }) => {
                        if (isIntersecting) {
                          MutableRef.update(visibleSections, HashSet.add(id))
                        } else {
                          MutableRef.update(visibleSections, HashSet.remove(id))
                        }
                      },
                    )

                    const activeSectionId = Array.findFirst(
                      sections,
                      sectionId =>
                        HashSet.has(MutableRef.get(visibleSections), sectionId),
                    )

                    Option.match(activeSectionId, {
                      onNone: Function.constVoid,
                      onSome: sectionId => {
                        Queue.offerUnsafe(
                          queue,
                          Message.ChangedActiveSection({ sectionId }),
                        )
                      },
                    })
                  },
                  {
                    rootMargin: '-100px 0px -80% 0px',
                  },
                )

                Array.forEach(sections, sectionId => {
                  const element = document.getElementById(sectionId)
                  if (element) {
                    observer.observe(element)
                  }
                })

                return observer
              }),
              observer => Effect.sync(() => observer.disconnect()),
            )

            return yield* Effect.never
          }),
        ),
    },
  ),
}))
