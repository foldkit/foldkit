import { test } from 'vitest'

test('the Command migration resolves the original child Definition', async () => {
  await import('../../../packages/website/src/snippet/testingMigrationCommandAfter')
})

test('the owning implementation supplies its Subscription registry', async () => {
  await import('../../../packages/website/src/snippet/testingMigrationSubscriptionAfter')
})

test('the Dialog migration resolves its normal acquisition Mount', async () => {
  await import('../../../packages/website/src/snippet/testingMigrationUiAfter')
})

test('the Scene receives required view inputs', async () => {
  await import('../../../packages/website/src/snippet/sceneWithViewInputs')
})

test('Toast drains an entry through its registered Binding', async () => {
  await import('../../../packages/website/src/snippet/uiToastDrainEntry')
})
