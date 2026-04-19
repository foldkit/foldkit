import { generateKeyBetween } from 'fractional-indexing'

export const STORAGE_KEY = 'kanban-board'
export const ADD_CARD_INPUT_ID = 'add-card-input'

const key1 = generateKeyBetween(null, null)
const key2 = generateKeyBetween(key1, null)
const key3 = generateKeyBetween(key2, null)
const key4 = generateKeyBetween(key3, null)
const key5 = generateKeyBetween(key4, null)
const key6 = generateKeyBetween(key5, null)

export const DEFAULT_COLUMNS = [
  {
    id: 'todo',
    name: 'To Do',
    cards: [
      {
        id: 'card-1',
        title: 'Research drag-and-drop patterns',
        description:
          'Review dnd-kit, elm-draggable, and annaghi/dnd-list for inspiration.',
        sortKey: key1,
      },
      {
        id: 'card-2',
        title: 'Design the data model',
        description:
          'Card, Column, and Board schemas with fractional indexing for sort order.',
        sortKey: key2,
      },
      {
        id: 'card-3',
        title: 'Write collision detection',
        description:
          'elementsFromPoint + getBoundingClientRect for drop target resolution.',
        sortKey: key3,
      },
      {
        id: 'card-4',
        title: 'Add keyboard accessibility',
        description:
          'Space to pick up, arrow keys to move, Space to drop, Escape to cancel.',
        sortKey: key4,
      },
      {
        id: 'card-5',
        title: 'Handle touch vs pointer',
        description:
          'Activation threshold distinguishes taps from drags on mobile devices.',
        sortKey: key5,
      },
      {
        id: 'card-6',
        title: 'Add ARIA attributes',
        description:
          'role=option on draggables, role=listbox on containers, aria-roledescription=sortable.',
        sortKey: key6,
      },
    ],
  },
  {
    id: 'in-progress',
    name: 'In Progress',
    cards: [
      {
        id: 'card-7',
        title: 'Build the DragAndDrop component',
        description:
          'Three-state state machine with collision detection and OutMessage support.',
        sortKey: key1,
      },
      {
        id: 'card-8',
        title: 'Create kanban example',
        description:
          'Responsive grid layout with fractional indexing and localStorage persistence.',
        sortKey: key2,
      },
      {
        id: 'card-9',
        title: 'Live reorder preview',
        description:
          'Cards shift to make room for the dragged item. Blue placeholder for pointer, actual card for keyboard.',
        sortKey: key3,
      },
      {
        id: 'card-10',
        title: 'Cross-container movement',
        description:
          'Drag cards between columns. Collision detection finds any droppable container.',
        sortKey: key4,
      },
      {
        id: 'card-11',
        title: 'Ghost element positioning',
        description:
          'position: fixed + translate3d with clientX/clientY for viewport-relative placement.',
        sortKey: key5,
      },
    ],
  },
  {
    id: 'done',
    name: 'Done',
    cards: [
      {
        id: 'card-12',
        title: 'Set up the monorepo',
        description: 'Turborepo with foldkit core, website, and examples.',
        sortKey: key1,
      },
      {
        id: 'card-13',
        title: 'Write the pixel art example',
        description:
          'Undo/redo, UI components, subscriptions, and localStorage persistence.',
        sortKey: key2,
      },
      {
        id: 'card-14',
        title: 'Publish to npm',
        description: 'Changesets, CI/CD pipeline, and automated releases.',
        sortKey: key3,
      },
      {
        id: 'card-15',
        title: 'Build the subscription system',
        description:
          'modelToDependencies + dependenciesToStream with Stream.when gating.',
        sortKey: key4,
      },
      {
        id: 'card-16',
        title: 'Ship DevTools',
        description:
          'Message inspector, Model viewer, time-travel debugging overlay.',
        sortKey: key5,
      },
      {
        id: 'card-17',
        title: 'Write the auth example',
        description:
          'Login/signup with OutMessage pattern, session persistence, route protection.',
        sortKey: key6,
      },
    ],
  },
]
