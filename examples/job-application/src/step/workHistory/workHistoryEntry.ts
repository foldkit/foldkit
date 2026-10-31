import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import {
  type CalendarDate,
  CalendarDate as CalendarDateSchema,
} from 'foldkit/calendar'
import {
  Field,
  NotValidated,
  allValid,
  anyInvalid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button, DatePicker } from '@foldkit/ui'
import type { AnchorConfig } from '@foldkit/ui/popover'

import * as DatePickerView from '../../domain/datePicker'
import * as FieldView from '../../domain/field'
import { revealFieldErrors } from '../../domain/validation'

const Model = Schema.Struct({
  id: Schema.String,
  company: Field(Schema.String),
  title: Field(Schema.String),
  startDate: DatePicker.DatePicker,
  maybeStartDate: Schema.Option(CalendarDateSchema),
  endDate: DatePicker.DatePicker,
  maybeEndDate: Schema.Option(CalendarDateSchema),
  isCurrentlyEmployed: Schema.Boolean,
  description: Schema.String,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  UpdatedCompany: { value: Schema.String },
  UpdatedTitle: { value: Schema.String },
  ToggledCurrentlyEmployed: { isChecked: Schema.Boolean },
  UpdatedDescription: { value: Schema.String },
  RequestedRevealErrors: {},
  ClickedRemoveSelf: {},
})

const OutMessage = defineMessageUnion({
  Removed: {},
})

type WorkHistoryEntryArgs = Readonly<{ today: CalendarDate }>

export class WorkHistoryEntry extends Block<
  WorkHistoryEntry,
  WorkHistoryEntryArgs
>()('WorkHistoryEntry', { Model, Message, OutMessage }) {}

export const WorkHistoryEntryLive = WorkHistoryEntry.make(
  Effect.fn(function* (entryId, { today }) {
    const startDate = yield* new DatePicker.DatePicker('startDate', {
      id: `${entryId}-start`,
      today,
    })
    const endDate = yield* new DatePicker.DatePicker('endDate', {
      id: `${entryId}-end`,
      today,
    })

    return {
      model: {
        id: entryId,
        company: NotValidated({ value: '' }),
        title: NotValidated({ value: '' }),
        startDate,
        maybeStartDate: Option.none(),
        endDate,
        maybeEndDate: Option.none(),
        isCurrentlyEmployed: false,
        description: '',
      },

      update: {
        UpdatedCompany: (model, { value }) => ({
          model: modifyFields(model, { company: () => validateCompany(value) }),
        }),

        UpdatedTitle: (model, { value }) => ({
          model: modifyFields(model, { title: () => validateTitle(value) }),
        }),

        ToggledCurrentlyEmployed: (model, { isChecked }) => ({
          model: modifyFields(model, { isCurrentlyEmployed: () => isChecked }),
        }),

        UpdatedDescription: (model, { value }) => ({
          model: modifyFields(model, { description: () => value }),
        }),

        RequestedRevealErrors: model => ({
          model: modifyFields(model, {
            company: revealFieldErrors(companyRules),
            title: revealFieldErrors(titleRules),
          }),
        }),

        ClickedRemoveSelf: model => ({
          model,
          outMessage: OutMessage.Removed(),
        }),

        ...startDate.on({
          ChangedViewMonth: model => ({ model }),
          SelectedDate: (model, { date }) => ({
            model: modifyFields(model, {
              maybeStartDate: () => Option.some(date),
            }),
            messages: [
              model.endDate.send(
                DatePicker.DatePicker.Message.InformedOfMinDateChange({
                  maybeMinDate: Option.some(date),
                }),
              ),
            ],
          }),
          ClearedDate: model => ({
            model: modifyFields(model, { maybeStartDate: () => Option.none() }),
            messages: [
              model.endDate.send(
                DatePicker.DatePicker.Message.InformedOfMinDateChange({
                  maybeMinDate: Option.none(),
                }),
              ),
            ],
          }),
        }),

        ...endDate.on({
          ChangedViewMonth: model => ({ model }),
          SelectedDate: (model, { date }) => ({
            model: modifyFields(model, {
              maybeEndDate: () => Option.some(date),
            }),
            messages: [
              model.startDate.send(
                DatePicker.DatePicker.Message.InformedOfMaxDateChange({
                  maybeMaxDate: Option.some(date),
                }),
              ),
            ],
          }),
          ClearedDate: model => ({
            model: modifyFields(model, { maybeEndDate: () => Option.none() }),
            messages: [
              model.startDate.send(
                DatePicker.DatePicker.Message.InformedOfMaxDateChange({
                  maybeMaxDate: Option.none(),
                }),
              ),
            ],
          }),
        }),
      },

      view: (model, h) => {
        const showEndDate = !model.isCurrentlyEmployed

        const startDatePickerView = h.div(
          [h.Class('space-y-1')],
          [
            h.label(
              [h.Class('block text-sm font-medium text-gray-700')],
              ['Start Date'],
            ),
            model.startDate.view({
              anchor: DATE_PICKER_ANCHOR,
              maybeSelectedDate: model.maybeStartDate,
              triggerContent: maybeDate =>
                DatePickerView.triggerContent(maybeDate, 'Select start date'),
              toCalendarView: DatePickerView.calendarView,
              triggerClassName: DatePickerView.triggerClassName,
              panelClassName: DatePickerView.panelClassName,
              backdropClassName: DatePickerView.backdropClassName,
            }),
          ],
        )

        const endDatePickerView = h.keyed('div')(
          `${model.id}-end-date`,
          [h.Class('space-y-1')],
          [
            h.label(
              [h.Class('block text-sm font-medium text-gray-700')],
              ['End Date'],
            ),
            model.endDate.view({
              anchor: DATE_PICKER_ANCHOR,
              maybeSelectedDate: model.maybeEndDate,
              triggerContent: maybeDate =>
                DatePickerView.triggerContent(maybeDate, 'Select end date'),
              toCalendarView: DatePickerView.calendarView,
              triggerClassName: DatePickerView.triggerClassName,
              panelClassName: DatePickerView.panelClassName,
              backdropClassName: DatePickerView.backdropClassName,
            }),
          ],
        )

        return h.keyed('div')(
          model.id,
          [h.Class('py-6 space-y-4 first:pt-0')],
          [
            h.div(
              [h.Class('grid grid-cols-2 gap-3')],
              [
                FieldView.input(
                  {
                    id: `${model.id}-company`,
                    label: 'Company',
                    field: model.company,
                    onInput: value => Message.UpdatedCompany({ value }),
                    placeholder: 'e.g. Acme Corp',
                  },
                  h,
                ),
                FieldView.input(
                  {
                    id: `${model.id}-title`,
                    label: 'Job Title',
                    field: model.title,
                    onInput: value => Message.UpdatedTitle({ value }),
                    placeholder: 'e.g. Senior Engineer',
                  },
                  h,
                ),
              ],
            ),
            h.div(
              [h.Class('grid grid-cols-2 gap-3')],
              [
                startDatePickerView,
                ...(showEndDate ? [endDatePickerView] : []),
              ],
            ),
            FieldView.checkbox(
              {
                id: `${model.id}-current`,
                label: 'I currently work here',
                isChecked: model.isCurrentlyEmployed,
                onToggle: isChecked =>
                  Message.ToggledCurrentlyEmployed({ isChecked }),
              },
              h,
            ),
            FieldView.textarea(
              {
                id: `${model.id}-description`,
                label: 'Description',
                value: model.description,
                onInput: value => Message.UpdatedDescription({ value }),
                rows: 3,
                placeholder: 'Describe your role and key accomplishments...',
              },
              h,
            ),
            h.div(
              [h.Class('flex justify-end')],
              [
                Button.view(
                  {
                    onClick: Message.ClickedRemoveSelf(),
                    toView: attributes =>
                      h.button(
                        [
                          ...attributes.button,
                          h.Class(
                            'text-sm text-gray-400 hover:text-red-500 transition cursor-pointer',
                          ),
                        ],
                        ['Remove position'],
                      ),
                  },
                  h,
                ),
              ],
            ),
          ],
        )
      },
    }
  }),
).pipe(Layer.provide(DatePicker.DatePickerLive))

const companyRules = makeRules({
  required: 'Company is required',
})

const titleRules = makeRules({
  required: 'Job title is required',
})

const validateCompany = validate(companyRules)
const validateTitle = validate(titleRules)

export const workHistoryEntryHasErrors = (entry: Model): boolean =>
  anyInvalid([entry.company, entry.title])

export const isWorkHistoryEntryComplete = (entry: Model): boolean =>
  allValid([
    [entry.company, companyRules],
    [entry.title, titleRules],
  ])

const DATE_PICKER_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
  padding: 8,
}
