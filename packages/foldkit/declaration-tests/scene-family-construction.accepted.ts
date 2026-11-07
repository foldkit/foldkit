import { Array, Context, Data, Effect, Layer, Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { makeFamilyDeclaration, resolveFamily } from 'foldkit/internal/block'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { Url } from 'foldkit/url'

export class CatalogSettings extends Context.Service<
  CatalogSettings,
  Readonly<{ isUnavailable: boolean; prefix: string }>
>()('SceneFamilyConstruction/CatalogSettings') {}

export class CatalogConstructionError extends Data.TaggedError(
  'CatalogConstructionError',
)<{}> {}

type ItemSchema<Item extends string> = Schema.Codec<Item, Item> &
  Readonly<{ '~type.make': Item }>

const CatalogNamespace = Block.makeNamespace('SceneFamilyCatalog')
export const CatalogKey = Symbol('SceneFamilyCatalog')

const defineCatalog = <Item extends string>(Item: ItemSchema<Item>) => {
  const Model = Schema.Struct({
    title: Schema.String,
    path: Schema.String,
    maybeSelected: Schema.Option(Item),
  })
  const Message = defineMessageUnion({
    ClickedItem: { item: Item },
    ChangedUrl: { url: Url },
  })
  const OutMessage = defineMessageUnion({ Selected: { item: Item } })
  const CatalogDefinition = makeFamilyDeclaration(CatalogNamespace, {
    key: CatalogKey,
    Model,
    Message,
    OutMessage,
    InitArgs: Schema.Tuple([Schema.String]),
    view: {
      kind: 'Element',
      Inputs:
        Block.makeInputContract<Readonly<{ items: ReadonlyArray<Item> }>>(),
    },
  })
  const CatalogComposition = CatalogDefinition.makeComposition()
  const init = (prefix: string) =>
    CatalogComposition.makeInit(title => ({
      model: Model.make({
        title: `${prefix}${title}`,
        path: '/',
        maybeSelected: Option.none(),
      }),
    }))
  const update = CatalogComposition.makeUpdate({
    ClickedItem: (model, { item }) => ({
      model: modifyFields(model, { maybeSelected: () => Option.some(item) }),
      outMessage: OutMessage.Selected({ item }),
    }),
    ChangedUrl: (model, { url }) => ({
      model: modifyFields(model, { path: () => url.pathname }),
    }),
  })
  const view = CatalogComposition.makeView.withInputs((model, { items }, h) =>
    h.section(
      [],
      [
        h.h2([], [model.title]),
        h.p([], [model.path]),
        ...Array.map(items, item =>
          h.keyed('button')(
            item,
            [h.OnClick(Message.ClickedItem({ item }))],
            [item],
          ),
        ),
      ],
    ),
  )

  return { CatalogDefinition, init, update, view }
}

type CatalogAuthoring<Item extends string> = ReturnType<
  typeof defineCatalog<Item>
>

const constructCatalog = <Item extends string>({
  CatalogDefinition,
  init,
  update,
  view,
}: CatalogAuthoring<Item>) =>
  CatalogDefinition.makeLayer(
    Effect.gen(function* () {
      const settings = yield* CatalogSettings

      if (settings.isUnavailable) {
        return yield* Effect.fail(new CatalogConstructionError())
      }

      return {
        children: [],
        init: init(settings.prefix),
        update,
        view,
      }
    }),
  )

interface CatalogImplementation extends Block.FamilyLifetime {
  readonly construct: typeof constructCatalog
}

export class CatalogFamily extends Context.Service<
  CatalogFamily,
  CatalogImplementation
>()('SceneFamilyConstruction/CatalogFamily') {}

export const CatalogLayer = Layer.effect(CatalogFamily)(
  Effect.gen(function* () {
    const lifetime = yield* Block.familyLifetime

    return { ...lifetime, construct: constructCatalog }
  }),
)

export const makeCatalog = <Item extends string>(Item: ItemSchema<Item>) => {
  const authoring = defineCatalog(Item)

  return resolveFamily(authoring.CatalogDefinition, CatalogFamily, family =>
    family.construct(authoring),
  )
}

export const Fruit = Schema.Literals(['Apple', 'Pear'])
export type Fruit = typeof Fruit.Type
export const FruitCatalogBlock = makeCatalog(Fruit)

export const unroutedScene = Scene.scene(
  {
    block: FruitCatalogBlock,
    layer: CatalogLayer,
    viewInputs: { items: ['Apple', 'Pear'] },
  },
  Scene.init('Fruit'),
  Scene.click(Scene.role('button', { name: 'Apple' })),
  Scene.expectOutMessage(
    FruitCatalogBlock.OutMessage.Selected({ item: 'Apple' }),
  ),
)

export const routedScene = Scene.scene(
  {
    block: FruitCatalogBlock,
    layer: CatalogLayer,
    viewInputs: { items: ['Apple', 'Pear'] },
    routing: {
      onUrlChange: url => FruitCatalogBlock.Message.ChangedUrl({ url }),
    },
  },
  Scene.init('Fruit'),
  Scene.Navigation.changedUrl('/fruit'),
  Scene.expect(Scene.text('/fruit')).toExist(),
)

export const catalogStory = Story.story(
  { block: FruitCatalogBlock, layer: CatalogLayer },
  Story.init('Fruit'),
  Story.message(FruitCatalogBlock.Message.ClickedItem({ item: 'Pear' })),
  Story.expectOutMessage(
    FruitCatalogBlock.OutMessage.Selected({ item: 'Pear' }),
  ),
)

export const catalogFixture = Story.withBlock(
  { block: FruitCatalogBlock, layer: CatalogLayer },
  catalog => catalog.init('Fruit').model,
)

export const CatalogSettingsLayer = Layer.succeed(CatalogSettings, {
  isUnavailable: false,
  prefix: 'Available ',
})

export const providedUnroutedScene = unroutedScene.pipe(
  Effect.provide(CatalogSettingsLayer),
)
export const providedRoutedScene = routedScene.pipe(
  Effect.provide(CatalogSettingsLayer),
)
