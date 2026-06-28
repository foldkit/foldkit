import { expect, test, vi } from 'vitest'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

test('loading a user renders the profile', async () => {
  // userAtom runs an Effect that fetches the user, so the test stubs the
  // network boundary and renders the component tree in jsdom.
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    Response.json({ name: 'Ada Lovelace' }),
  )

  render(<UserCard />)

  await userEvent.click(screen.getByRole('button', { name: /load user/i }))
  expect(screen.getByText('Loading…')).toBeInTheDocument()

  // The atom resolves asynchronously, so findByText has to poll until the
  // Result transitions to Success and React re-renders.
  expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
})
