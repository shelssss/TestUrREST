/**
 * Chart colours and shared Recharts props.
 *
 * The colours are read from CSS variables at render time so a theme switch
 * re-themes the charts with the rest of the page, and both themes are
 * *selected* values (see index.css) rather than one flipped into the other.
 *
 * Role assignment was validated with the data-viz colour checker, not
 * chosen by eye. Notably `success`/`failure` is a blue/red polarity pair:
 * the intuitive green/red measures CVD deltaE 4.1 under deuteranopia --
 * indistinguishable for roughly 6% of men -- while blue/red measures 25.7.
 */

export interface ChartColors {
  success: string
  failure: string
  series1: string
  s2xx: string
  s3xx: string
  s4xx: string
  s5xx: string
  none: string
  grid: string
  axis: string
  surface: string
  text: string
  textMuted: string
  border: string
}

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return value || fallback
}

export function readChartColors(): ChartColors {
  return {
    success: cssVar('--chart-success', '#3987e5'),
    failure: cssVar('--chart-failure', '#d03b3b'),
    series1: cssVar('--chart-series-1', '#3987e5'),
    s2xx: cssVar('--chart-2xx', '#0ca30c'),
    s3xx: cssVar('--chart-3xx', '#3987e5'),
    s4xx: cssVar('--chart-4xx', '#fab219'),
    s5xx: cssVar('--chart-5xx', '#d03b3b'),
    none: cssVar('--chart-none', '#6b7280'),
    grid: cssVar('--chart-grid', '#23262d'),
    axis: cssVar('--chart-axis', '#6b7280'),
    surface: cssVar('--surface', '#131519'),
    text: cssVar('--text', '#e6e8ec'),
    textMuted: cssVar('--text-muted', '#6b7280'),
    border: cssVar('--border', '#262a32'),
  }
}

/** Recessive hairline axis styling shared by every chart. */
export const AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 11 },
} as const

/** Chart marks are thin by spec: 2px lines, >=8px end markers. */
export const LINE_WIDTH = 2
export const DOT_RADIUS = 4
/** Area fills are a ~10% wash, never a saturated block. */
export const AREA_OPACITY = 0.12
/** Bars are capped rather than filling their band, leaving air. */
export const MAX_BAR_SIZE = 22
