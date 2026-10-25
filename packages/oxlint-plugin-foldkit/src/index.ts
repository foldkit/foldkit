import { Plugin } from 'effect-oxlint'

import { acquireReleaseConstructsInAcquireBody } from './rules/acquire-release-constructs-in-acquire-body.ts'
import { blockNameMatchesVariable } from './rules/block-name-matches-variable.ts'
import { commandDefinePascalConst } from './rules/command-define-pascal-const.ts'
import { keyedRequiredForMappedRows } from './rules/keyed-required-for-mapped-rows.ts'
import { lazyViewStableReferences } from './rules/lazy-view-stable-references.ts'
import { mountFactoryMustUseElement } from './rules/mount-factory-must-use-element.ts'
import { noArrayIndexViewKeys } from './rules/no-array-index-view-keys.ts'
import { noBindingWriteCoordination } from './rules/no-binding-write-coordination.ts'
import { noChildMessageConstructionInRoot } from './rules/no-child-message-construction-in-root.ts'
import { noCompletedBlockModelInSchema } from './rules/no-completed-block-model-in-schema.ts'
import { noDirectBlockStateUpdate } from './rules/no-direct-block-state-update.ts'
import { noDisablingDevGuardrails } from './rules/no-disabling-dev-guardrails.ts'
import { noDuplicateOnmountPerElement } from './rules/no-duplicate-onmount-per-element.ts'
import { noEmptyChildrenArray } from './rules/no-empty-children-array.ts'
import { noEmptyCommandsArray } from './rules/no-empty-commands-array.ts'
import { noEmptyObjectTaggedCall } from './rules/no-empty-object-tagged-call.ts'
import { noEmptyToParentOutMessage } from './rules/no-empty-to-parent-out-message.ts'
import { noHandRolledCommandStruct } from './rules/no-hand-rolled-command-struct.ts'
import { noHardcodedRouteStrings } from './rules/no-hardcoded-route-strings.ts'
import { noImpureCallAtDecisionTime } from './rules/no-impure-call-at-decision-time.ts'
import { noManualCompositionRouting } from './rules/no-manual-composition-routing.ts'
import { noModuleLevelMutableState } from './rules/no-module-level-mutable-state.ts'
import { noNonportableServerGlobals } from './rules/no-nonportable-server-globals.ts'
import { noNoopMessage } from './rules/no-noop-message.ts'
import { noPreventDefaultInStreamOperator } from './rules/no-prevent-default-in-stream-operator.ts'
import { noRawDomEventAttributes } from './rules/no-raw-dom-event-attributes.ts'
import { noRouteQueryConstructorDefault } from './rules/no-route-query-constructor-default.ts'
import { noSpreadInModifyFields } from './rules/no-spread-in-modify-fields.ts'
import { noSwitchOnMessageTag } from './rules/no-switch-on-message-tag.ts'
import { preferCallableMessageConstructor } from './rules/prefer-callable-message-constructor.ts'
import { preferCommandMapmessage } from './rules/prefer-command-mapmessage.ts'
import { preferEffectModuleNames } from './rules/prefer-effect-module-names.ts'
import { preferOptionOverNullableInModel } from './rules/prefer-option-over-nullable-in-model.ts'
import { requireRelForExternalLink } from './rules/require-rel-for-external-link.ts'
import { selectionBlockFactoryAtModuleScope } from './rules/selection-block-factory-at-module-scope.ts'

const basePlugin = Plugin.define({
  name: 'foldkit',
  specifier: '@foldkit/oxlint-plugin',
  rules: {
    'acquire-release-constructs-in-acquire-body':
      acquireReleaseConstructsInAcquireBody,
    'block-name-matches-variable': blockNameMatchesVariable,
    'command-define-pascal-const': commandDefinePascalConst,
    'keyed-required-for-mapped-rows': keyedRequiredForMappedRows,
    'lazy-view-stable-references': lazyViewStableReferences,
    'mount-factory-must-use-element': mountFactoryMustUseElement,
    'no-array-index-view-keys': noArrayIndexViewKeys,
    'no-binding-write-coordination': noBindingWriteCoordination,
    'no-child-message-construction-in-root': noChildMessageConstructionInRoot,
    'no-completed-block-model-in-schema': noCompletedBlockModelInSchema,
    'no-direct-block-state-update': noDirectBlockStateUpdate,
    'no-disabling-dev-guardrails': noDisablingDevGuardrails,
    'no-duplicate-onmount-per-element': noDuplicateOnmountPerElement,
    'no-empty-children-array': noEmptyChildrenArray,
    'no-empty-commands-array': noEmptyCommandsArray,
    'no-empty-to-parent-out-message': noEmptyToParentOutMessage,
    'no-empty-object-tagged-call': noEmptyObjectTaggedCall,
    'no-hand-rolled-command-struct': noHandRolledCommandStruct,
    'no-hardcoded-route-strings': noHardcodedRouteStrings,
    'no-impure-call-at-decision-time': noImpureCallAtDecisionTime,
    'no-manual-composition-routing': noManualCompositionRouting,
    'no-module-level-mutable-state': noModuleLevelMutableState,
    'no-nonportable-server-globals': noNonportableServerGlobals,
    'no-noop-message': noNoopMessage,
    'no-prevent-default-in-stream-operator': noPreventDefaultInStreamOperator,
    'no-raw-dom-event-attributes': noRawDomEventAttributes,
    'no-route-query-constructor-default': noRouteQueryConstructorDefault,
    'no-spread-in-modify-fields': noSpreadInModifyFields,
    'no-switch-on-message-tag': noSwitchOnMessageTag,
    'prefer-callable-message-constructor': preferCallableMessageConstructor,
    'prefer-command-mapmessage': preferCommandMapmessage,
    'prefer-effect-module-names': preferEffectModuleNames,
    'prefer-option-over-nullable-in-model': preferOptionOverNullableInModel,
    'require-rel-for-external-link': requireRelForExternalLink,
    'selection-block-factory-at-module-scope':
      selectionBlockFactoryAtModuleScope,
  },
})

type Override = Readonly<{
  files: Array<string>
  excludeFiles?: Array<string>
  rules: Record<string, Plugin.RuleSeverity>
}>

type OverriddenConfig = Plugin.OxlintConfig & {
  overrides: Array<Override>
}

const testFilePatterns = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.fixture.ts',
  '**/*.fixture.tsx',
  '**/test.ts',
  '**/test.tsx',
  '**/test/**/*.ts',
  '**/test/**/*.tsx',
  '**/tests/**/*.ts',
  '**/tests/**/*.tsx',
  '**/fixtures/**/*.ts',
  '**/fixtures/**/*.tsx',
]

const serverFilePatterns = [
  '**/entry.server.ts',
  '**/entry.server.tsx',
  '**/server/**/*.ts',
  '**/server/**/*.tsx',
  '**/prerender.ts',
  '**/prerender.tsx',
]

const entryFilePatterns = [
  '**/entry.ts',
  '**/entry.tsx',
  '**/entry.client.ts',
  '**/entry.client.tsx',
  '**/entry.server.ts',
  '**/entry.server.tsx',
]

const decisionTimeRuleId = 'foldkit/no-impure-call-at-decision-time'

const serverOverride: Override = {
  files: serverFilePatterns,
  excludeFiles: testFilePatterns,
  rules: {
    'foldkit/no-nonportable-server-globals': 'error',
    [decisionTimeRuleId]: 'off',
  },
}

const entryOverride: Override = {
  files: entryFilePatterns,
  excludeFiles: testFilePatterns,
  rules: {
    [decisionTimeRuleId]: 'off',
  },
}

const rulesApplicableToTests = new Set([
  'foldkit/acquire-release-constructs-in-acquire-body',
  'foldkit/no-switch-on-message-tag',
  'foldkit/prefer-effect-module-names',
])

// Most Foldkit rules police application definitions. Tests exercise those
// definitions rather than write them, so those rules are inert at best and
// invert at worst (a test may legitimately hardcode a route or hand-roll a
// Command struct). Rules for syntax written directly in tests remain enabled.
const testOverride = (config: Plugin.OxlintConfig): Override => ({
  files: testFilePatterns,
  rules: Object.fromEntries(
    Object.keys(config.rules)
      .filter(id => !rulesApplicableToTests.has(id))
      .map((id): [string, Plugin.RuleSeverity] => [id, 'off']),
  ),
})

const withOverrides = (
  config: Plugin.OxlintConfig,
  additionalRules: Record<string, Plugin.RuleSeverity> = {},
): OverriddenConfig => {
  const rules: Record<string, Plugin.RuleSeverity> = {
    ...config.rules,
    ...additionalRules,
    'foldkit/no-nonportable-server-globals': 'off',
  }

  return {
    ...config,
    rules,
    overrides: [
      serverOverride,
      entryOverride,
      testOverride({ ...config, rules }),
    ],
  }
}

export default {
  ...basePlugin,
  configs: {
    recommended: withOverrides(basePlugin.configs.recommended, {
      'require-yield': 'off',
    }),
    all: withOverrides(basePlugin.configs.all),
  },
}
