import { Plugin } from 'effect-oxlint'

import { commandBindingMatchesName } from './rules/command-binding-matches-name.ts'
import { commandDefinePascalConst } from './rules/command-define-pascal-const.ts'
import { gotPrefixRequiresSubmodelPayload } from './rules/got-prefix-requires-submodel-payload.ts'
import { gotSubmodelMessageName } from './rules/got-submodel-message-name.ts'
import { gotWrapperCarriesOnlyRouting } from './rules/got-wrapper-carries-only-routing.ts'
import { keyedRequiredForMappedRows } from './rules/keyed-required-for-mapped-rows.ts'
import { lazyViewStableReferences } from './rules/lazy-view-stable-references.ts'
import { messageBindingMatchesTag } from './rules/message-binding-matches-tag.ts'
import { mountFactoryMustUseElement } from './rules/mount-factory-must-use-element.ts'
import { noArrayIndexViewKeys } from './rules/no-array-index-view-keys.ts'
import { noChildMessageConstructionInRoot } from './rules/no-child-message-construction-in-root.ts'
import { noDisablingDevGuardrails } from './rules/no-disabling-dev-guardrails.ts'
import { noDuplicateOnmountPerElement } from './rules/no-duplicate-onmount-per-element.ts'
import { noEmptyObjectTaggedCall } from './rules/no-empty-object-tagged-call.ts'
import { noHandRolledCommandStruct } from './rules/no-hand-rolled-command-struct.ts'
import { noHardcodedRouteStrings } from './rules/no-hardcoded-route-strings.ts'
import { noModuleLevelMutableState } from './rules/no-module-level-mutable-state.ts'
import { noNoopMessage } from './rules/no-noop-message.ts'
import { noRawDomEventAttributes } from './rules/no-raw-dom-event-attributes.ts'
import { noSpreadInEvo } from './rules/no-spread-in-evo.ts'
import { preferCallableMessageConstructor } from './rules/prefer-callable-message-constructor.ts'
import { requireRelForExternalLink } from './rules/require-rel-for-external-link.ts'
import { selectionSubmodelFactoryAtModuleScope } from './rules/selection-submodel-factory-at-module-scope.ts'
import { wrapChildOutputInGotMessage } from './rules/wrap-child-output-in-got-message.ts'

export default Plugin.define({
  name: 'foldkit',
  specifier: '@foldkit/oxlint-plugin',
  rules: {
    'command-binding-matches-name': commandBindingMatchesName,
    'command-define-pascal-const': commandDefinePascalConst,
    'got-prefix-requires-submodel-payload': gotPrefixRequiresSubmodelPayload,
    'got-submodel-message-name': gotSubmodelMessageName,
    'got-wrapper-carries-only-routing': gotWrapperCarriesOnlyRouting,
    'keyed-required-for-mapped-rows': keyedRequiredForMappedRows,
    'lazy-view-stable-references': lazyViewStableReferences,
    'message-binding-matches-tag': messageBindingMatchesTag,
    'mount-factory-must-use-element': mountFactoryMustUseElement,
    'no-array-index-view-keys': noArrayIndexViewKeys,
    'no-child-message-construction-in-root': noChildMessageConstructionInRoot,
    'no-disabling-dev-guardrails': noDisablingDevGuardrails,
    'no-duplicate-onmount-per-element': noDuplicateOnmountPerElement,
    'no-empty-object-tagged-call': noEmptyObjectTaggedCall,
    'no-hand-rolled-command-struct': noHandRolledCommandStruct,
    'no-hardcoded-route-strings': noHardcodedRouteStrings,
    'no-module-level-mutable-state': noModuleLevelMutableState,
    'no-noop-message': noNoopMessage,
    'no-raw-dom-event-attributes': noRawDomEventAttributes,
    'no-spread-in-evo': noSpreadInEvo,
    'prefer-callable-message-constructor': preferCallableMessageConstructor,
    'require-rel-for-external-link': requireRelForExternalLink,
    'selection-submodel-factory-at-module-scope':
      selectionSubmodelFactoryAtModuleScope,
    'wrap-child-output-in-got-message': wrapChildOutputInGotMessage,
  },
})
