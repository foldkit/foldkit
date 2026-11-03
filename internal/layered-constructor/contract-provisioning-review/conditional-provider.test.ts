import { expect, test } from 'vitest'

import { erasedMissingImplementation } from './conditional-provider'

test('a conditionally absent implementation still requires its contract provider', async () => {
  await expect(erasedMissingImplementation()).rejects.toThrow(
    /Service not found: foldkit\/ContractedBlock\/\d+\/ContractProof/,
  )
})
