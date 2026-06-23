import { BarChart, GraphChart, LineChart } from 'echarts/charts'
import {
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts/types/dist/shared'
import { Array, Match as M, Option, String, pipe } from 'effect'

import {
  type ChartMode,
  type PackageId,
  type PackageSnapshot,
  type Period,
  type Telemetry,
  type WeeklyTelemetry,
  findPackageSnapshot,
  packageIdToSpec,
  visibleWeeks,
} from './domain'

const MIN_NODE_SIZE = 34
const MAX_NODE_SIZE = 82
const NODE_SCALE = 2.8
const DEFAULT_SYMBOL_SIZE = 8
const SELECTED_SYMBOL_SIZE = 11

export type ChartOptionArgs = Readonly<{
  telemetry: Telemetry
  chartMode: ChartMode
  selectedPackageId: PackageId
  period: Period
  maybeSelectedDatumId: Option.Option<string>
}>

type DatumLabel = Readonly<{
  id: string
  label: string
}>

export const registerEcharts = () => {
  echarts.use([
    AriaComponent,
    BarChart,
    CanvasRenderer,
    DataZoomComponent,
    GraphChart,
    GridComponent,
    LabelLayout,
    LegendComponent,
    LineChart,
    MarkLineComponent,
    TitleComponent,
    ToolboxComponent,
    TooltipComponent,
    UniversalTransition,
  ])

  return echarts
}

const datumId = (
  chartMode: ChartMode,
  segment: string,
  weekStart: string,
): string => `${chartMode}:${segment}:${weekStart}`

const isSelected = (
  maybeSelectedDatumId: Option.Option<string>,
  id: string,
): boolean =>
  Option.exists(maybeSelectedDatumId, selectedId => selectedId === id)

const weekLabel = (weekStart: string): string => String.slice(5)(weekStart)

const downloadForWeek = (
  snapshot: PackageSnapshot,
  weekStart: string,
): number =>
  pipe(
    snapshot.downloadsByWeek,
    Array.findFirst(downloads => downloads.weekStart === weekStart),
    Option.match({
      onNone: () => 0,
      onSome: ({ downloads }) => downloads,
    }),
  )

const baseOption = (title: string, subtitle: string): EChartsOption => ({
  animation: false,
  backgroundColor: 'transparent',
  title: {
    text: title,
    subtext: subtitle,
    left: 18,
    top: 12,
    textStyle: {
      color: '#18181b',
      fontSize: 16,
      fontWeight: 700,
    },
    subtextStyle: {
      color: '#71717a',
      fontSize: 12,
    },
  },
  tooltip: {
    trigger: 'axis',
    confine: true,
  },
  legend: {
    top: 16,
    right: 16,
    textStyle: {
      color: '#52525b',
    },
  },
  grid: {
    left: 56,
    right: 58,
    top: 92,
    bottom: 58,
  },
  aria: {
    enabled: true,
  },
})

const adoptionOption = (args: ChartOptionArgs): EChartsOption =>
  Option.match(findPackageSnapshot(args.telemetry, args.selectedPackageId), {
    onNone: () =>
      baseOption(
        'Adoption',
        `${packageIdToSpec(args.selectedPackageId).displayName} telemetry`,
      ),
    onSome: snapshot => {
      const weeks = visibleWeeks(args.telemetry, args.period)
      const weekLabels = Array.map(weeks, ({ weekStart }) =>
        weekLabel(weekStart),
      )

      return {
        ...baseOption(
          'Adoption',
          `${snapshot.displayName} downloads and GitHub stars`,
        ),
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: weekLabels,
        },
        yAxis: [
          {
            type: 'value',
            name: 'downloads',
            min: 0,
            splitLine: { lineStyle: { color: '#e4e4e7' } },
          },
          {
            type: 'value',
            name: 'stars',
            min: 0,
            splitLine: { show: false },
          },
        ],
        dataZoom: [
          {
            type: 'inside',
          },
        ],
        series: [
          {
            name: 'npm downloads',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: DEFAULT_SYMBOL_SIZE,
            lineStyle: { width: 3, color: '#0891b2' },
            itemStyle: { color: '#0891b2' },
            areaStyle: { color: 'rgba(8, 145, 178, 0.12)' },
            data: Array.map(weeks, week => {
              const id = datumId('Adoption', snapshot.id, week.weekStart)
              return {
                id,
                name: weekLabel(week.weekStart),
                symbolSize: isSelected(args.maybeSelectedDatumId, id)
                  ? SELECTED_SYMBOL_SIZE
                  : DEFAULT_SYMBOL_SIZE,
                value: downloadForWeek(snapshot, week.weekStart),
              }
            }),
          },
          {
            name: 'GitHub stars',
            type: 'line',
            smooth: true,
            yAxisIndex: 1,
            symbol: 'diamond',
            symbolSize: DEFAULT_SYMBOL_SIZE,
            lineStyle: { width: 3, color: '#7c3aed' },
            itemStyle: { color: '#7c3aed' },
            data: Array.map(weeks, week => {
              const id = datumId('Adoption', 'Stars', week.weekStart)
              return {
                id,
                name: weekLabel(week.weekStart),
                symbolSize: isSelected(args.maybeSelectedDatumId, id)
                  ? SELECTED_SYMBOL_SIZE
                  : DEFAULT_SYMBOL_SIZE,
                value: week.cumulativeStars,
              }
            }),
          },
        ],
      }
    },
  })

const velocityOption = (args: ChartOptionArgs): EChartsOption => {
  const weeks = visibleWeeks(args.telemetry, args.period)

  return {
    ...baseOption('Velocity', 'commits, code churn, and releases'),
    tooltip: {
      trigger: 'axis',
      confine: true,
    },
    xAxis: {
      type: 'category',
      data: Array.map(weeks, ({ weekStart }) => weekLabel(weekStart)),
    },
    yAxis: [
      {
        type: 'value',
        name: 'activity',
        min: 0,
        splitLine: { lineStyle: { color: '#e4e4e7' } },
      },
      {
        type: 'value',
        name: 'releases',
        min: 0,
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'commits',
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: { color: '#16a34a' },
        data: Array.map(weeks, week => {
          const id = datumId('Velocity', 'Commits', week.weekStart)
          return {
            id,
            name: weekLabel(week.weekStart),
            value: week.commits,
            itemStyle: {
              color: isSelected(args.maybeSelectedDatumId, id)
                ? '#14532d'
                : '#16a34a',
            },
          }
        }),
      },
      {
        name: 'releases',
        type: 'bar',
        yAxisIndex: 1,
        itemStyle: { color: '#2563eb' },
        data: Array.map(weeks, week => {
          const id = datumId('Velocity', 'Releases', week.weekStart)
          return {
            id,
            name: weekLabel(week.weekStart),
            value: week.releases,
          }
        }),
      },
    ],
  }
}

const nodeSize = (downloads: number): number =>
  Math.min(
    MAX_NODE_SIZE,
    Math.max(MIN_NODE_SIZE, Math.sqrt(downloads) * NODE_SCALE),
  )

const ecosystemOption = (args: ChartOptionArgs): EChartsOption => ({
  ...baseOption('Ecosystem', 'package relationships from npm metadata'),
  animation: false,
  tooltip: {
    trigger: 'item',
    confine: true,
  },
  legend: {
    show: false,
  },
  series: [
    {
      name: 'packages',
      type: 'graph',
      layout: 'force',
      roam: true,
      draggable: true,
      silent: true,
      force: {
        repulsion: 360,
        edgeLength: 120,
      },
      label: {
        show: true,
        color: '#18181b',
        fontWeight: 700,
      },
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: [0, 10],
      lineStyle: {
        color: '#a1a1aa',
        width: 2,
        curveness: 0.18,
      },
      data: Array.map(args.telemetry.packages, snapshot => ({
        id: snapshot.id,
        name: snapshot.displayName,
        value: snapshot.lastWeekDownloads,
        symbolSize: nodeSize(snapshot.lastWeekDownloads),
        itemStyle: {
          color: snapshot.id === args.selectedPackageId ? '#0f766e' : '#4f46e5',
        },
      })),
      links: Array.map(args.telemetry.dependencyEdges, edge => ({
        source: edge.source,
        target: edge.target,
        name: edge.kind,
        lineStyle: {
          color: edge.kind === 'PeerDependency' ? '#f59e0b' : '#0f766e',
        },
      })),
    },
  ],
})

const packageSnapshotToDownloadDatumLabel =
  (weekStart: string) =>
  (snapshot: PackageSnapshot): DatumLabel => ({
    id: datumId('Adoption', snapshot.id, weekStart),
    label: `${weekStart}: ${downloadForWeek(
      snapshot,
      weekStart,
    )} ${snapshot.displayName} downloads`,
  })

const weekToDatumLabels =
  (telemetry: Telemetry) =>
  (week: WeeklyTelemetry): ReadonlyArray<DatumLabel> => [
    ...Array.map(
      telemetry.packages,
      packageSnapshotToDownloadDatumLabel(week.weekStart),
    ),
    {
      id: datumId('Adoption', 'Stars', week.weekStart),
      label: `${week.weekStart}: ${week.cumulativeStars} stars`,
    },
    {
      id: datumId('Velocity', 'Commits', week.weekStart),
      label: `${week.weekStart}: ${week.commits} commits`,
    },
    {
      id: datumId('Velocity', 'Releases', week.weekStart),
      label: `${week.weekStart}: ${week.releases} releases`,
    },
  ]

export const makeChartOption = (args: ChartOptionArgs) =>
  M.value(args.chartMode).pipe(
    M.when('Adoption', () => adoptionOption(args)),
    M.when('Velocity', () => velocityOption(args)),
    M.when('Ecosystem', () => ecosystemOption(args)),
    M.exhaustive,
  )

const findDatumLabelById =
  (telemetry: Telemetry) =>
  (datumId: string): Option.Option<DatumLabel> =>
    Array.findFirst(
      Array.flatMap(telemetry.weeks, weekToDatumLabels(telemetry)),
      item => item.id === datumId,
    )

export const selectedDatumLabel = (
  telemetry: Telemetry,
  maybeSelectedDatumId: Option.Option<string>,
): Option.Option<string> =>
  pipe(
    maybeSelectedDatumId,
    Option.flatMap(findDatumLabelById(telemetry)),
    Option.map(({ label }) => label),
  )
