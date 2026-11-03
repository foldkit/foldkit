import { Effect, Layer } from 'effect'

import { layer as DialogLayer } from '@foldkit/ui/dialog'
import { layer as MenuLayer } from '@foldkit/ui/menu'

import {
  ApiReference,
  BlockPage,
  ComingFromReact,
  ExampleDetail,
  Home,
  Playground,
  Search,
  SnippetCopy,
  SnippetDisclosure,
  Ui,
} from './blocks'
import {
  ApiReferenceBinding,
  ComingFromReactBinding,
  CoreBlockPageBinding,
  ExampleDetailBinding,
  HomeBinding,
  MobileMenuDialogBinding,
  PlaygroundBinding,
  SearchBinding,
  SnippetCopyBinding,
  SnippetDisclosureBinding,
  ThemeMenuBinding,
  UiPagesBinding,
} from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view/view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const apiReference = yield* ApiReferenceBinding
    const comingFromReact = yield* ComingFromReactBinding
    const coreBlockPage = yield* CoreBlockPageBinding
    const exampleDetail = yield* ExampleDetailBinding
    const home = yield* HomeBinding
    const mobileMenuDialog = yield* MobileMenuDialogBinding
    const playground = yield* PlaygroundBinding
    const search = yield* SearchBinding
    const snippetCopy = yield* SnippetCopyBinding
    const snippetDisclosure = yield* SnippetDisclosureBinding
    const themeMenu = yield* ThemeMenuBinding
    const uiPages = yield* UiPagesBinding

    return {
      children: [
        apiReference,
        comingFromReact,
        coreBlockPage,
        exampleDetail,
        home,
        mobileMenuDialog,
        playground,
        search,
        snippetCopy,
        snippetDisclosure,
        themeMenu,
        uiPages,
      ],
      init,
      update,
      view,
      subscriptions,
      EffectsLayer,
    }
  }),
).provide(
  Layer.mergeAll(
    ApiReference.layer,
    ComingFromReact.layer,
    BlockPage.layer,
    ExampleDetail.layer,
    Home.layer,
    Playground.layer,
    Ui.layer,
    Search.layer,
    SnippetCopy.layer,
    SnippetDisclosure.layer,
    DialogLayer,
    MenuLayer,
  ),
)
