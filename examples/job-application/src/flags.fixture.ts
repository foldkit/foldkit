import { Calendar } from 'foldkit'

import type { Flags } from './application'

export const flags: Flags = {
  today: Calendar.make(2026, 4, 16),
  initialWorkHistoryEntryId: 'work-history-entry-1',
  initialEducationEntryId: 'education-entry-1',
  initialSkillsEntryId: 'skills-entry-1',
}

export const args = { flags }
