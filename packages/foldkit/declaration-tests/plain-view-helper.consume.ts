import type { Block, Html } from 'foldkit'

import {
  ApplicationComposition,
  ChildModel,
  DeclarationViewHelperParentComposition,
  ParentModel,
  applicationArrayViewHelper,
  applicationBuilderViewHelper,
  applicationInputViewHelper,
  applicationModelViewHelper,
  parentArrayViewHelper,
  parentBuilderViewHelper,
  parentInputViewHelper,
  parentModelViewHelper,
  parentSharedViewHelper,
} from './plain-view-helper.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type ParentModelParameters = Expect<
  Equal<
    Parameters<typeof parentModelViewHelper>,
    [
      model: typeof ParentModel.Type,
      h: Block.ViewBuilderFor<typeof DeclarationViewHelperParentComposition>,
    ]
  >
>
export type ParentBuilderParameters = Expect<
  Equal<
    Parameters<typeof parentBuilderViewHelper>,
    [h: Block.ViewBuilderFor<typeof DeclarationViewHelperParentComposition>]
  >
>
export type ParentInputParameters = Expect<
  Equal<
    Parameters<typeof parentInputViewHelper>,
    [
      input: typeof ChildModel.Type,
      h: Block.ViewBuilderFor<typeof DeclarationViewHelperParentComposition>,
    ]
  >
>
export type ParentArrayOutput = Expect<
  ReturnType<typeof parentArrayViewHelper> extends ReadonlyArray<Html.Html>
    ? true
    : false
>
export type ParentSharedParameters = Expect<
  Equal<
    Parameters<typeof parentSharedViewHelper>,
    [h: Block.ViewBuilderFor<typeof DeclarationViewHelperParentComposition>]
  >
>
export type ApplicationModelParameters = Expect<
  Equal<
    Parameters<typeof applicationModelViewHelper>,
    [
      model: typeof ParentModel.Type,
      h: Block.ViewBuilderFor<typeof ApplicationComposition>,
    ]
  >
>
export type ApplicationBuilderParameters = Expect<
  Equal<
    Parameters<typeof applicationBuilderViewHelper>,
    [h: Block.ViewBuilderFor<typeof ApplicationComposition>]
  >
>
export type ApplicationInputParameters = Expect<
  Equal<
    Parameters<typeof applicationInputViewHelper>,
    [input: string, h: Block.ViewBuilderFor<typeof ApplicationComposition>]
  >
>
export type ApplicationArrayOutput = Expect<
  ReturnType<typeof applicationArrayViewHelper> extends ReadonlyArray<Html.Html>
    ? true
    : false
>
