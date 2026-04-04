---
'foldkit': minor
---

Add Scene for feature-level testing through the view. Scene complements Story — where Story tests the update function by sending Messages directly, Scene tests features by clicking buttons, typing into inputs, and pressing keys. Includes a CSS selector query engine (find, findAll, text, attr), accessible locators (getByRole, getByText, getByPlaceholder, getByLabel), a callable Locator type for interaction targeting (role, placeholder, label, selector), inline assertion steps (Scene.expect(locator).toExist(), .toHaveText(), .toContainText(), .toHaveAttr(), etc.), interaction steps (click, submit, type, keydown), and custom Vitest matchers (toHaveText, toContainText, toHaveClass, toHaveAttr, toHaveStyle, toHaveValue, toBeDisabled, toBeEnabled, toBeChecked, toHaveHook, toHaveHandler, toExist, toBeAbsent).
