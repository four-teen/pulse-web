export type MetricValue = number | null
export type Campus = {
  id: string
  name: string
  mark: string
  color: string
  tint: string
  students: MetricValue
  previousStudents: MetricValue
  faculty: MetricValue
  programs: MetricValue
  retention: MetricValue
  budget: MetricValue
  utilization: MetricValue
  research: { active: MetricValue; completed: MetricValue; publications: MetricValue; funding: MetricValue }
  extension: { active: MetricValue; completed: MetricValue; communities: MetricValue; beneficiaries: MetricValue; sessions: MetricValue }
  production: { enterprises: MetricValue; revenue: MetricValue; expenses: MetricValue; target: MetricValue }
  inventory: { buildings: MetricValue; classrooms: MetricValue; laboratories: MetricValue; assets: MetricValue; serviceable: MetricValue; value: MetricValue }
}

export type SourceStatus = 'not_connected' | 'configuration_required' | 'awaiting_sync' | 'connected' | 'stale' | 'invalid_data' | 'period_mismatch'
export type Source = { id: 'sinq' | 'oracle' | 'pad'; name: string; website: string; status: SourceStatus; updatedAt: string | null }
export type DashboardData = {
  schemaVersion: 1
  generatedAt: string
  updatedAt: string | null
  dataState: 'awaiting_data' | 'partial' | 'stale' | 'ready'
  periodLabel: string | null
  periodKey: string | null
  coverage: { availableMetrics: number; totalMetrics: number }
  categorySources: Record<string, Source['id'] | null>
  campuses: Campus[]
  sources: Source[]
}

export const sourceStatusLabel: Record<SourceStatus, string> = {
  not_connected: 'Not connected', configuration_required: 'Setup required', awaiting_sync: 'Awaiting first sync',
  connected: 'Connected', stale: 'Update overdue', invalid_data: 'Records unavailable', period_mismatch: 'Different reporting period',
}

/** Missing values remain unknown. A partial campus set is never presented as a full total. */
function total(items: Campus[], select: (campus: Campus) => MetricValue): MetricValue {
  if (!items.length) return null
  const values = items.map(select)
  return values.some(value => value === null) ? null : (values as number[]).reduce((sum, value) => sum + value, 0)
}

export function add(a: MetricValue, b: MetricValue): MetricValue { return a === null || b === null ? null : a + b }
export function difference(a: MetricValue, b: MetricValue): MetricValue { return a === null || b === null ? null : a - b }
export function percentage(value: MetricValue, denominator: MetricValue): MetricValue { return value === null || denominator === null || denominator <= 0 ? null : value / denominator * 100 }
export function percent(value: MetricValue): string { return value === null ? '—' : `${value.toFixed(1)}%` }
export const number = (value: MetricValue) => value === null ? '—' : new Intl.NumberFormat('en-PH').format(value)
export const millions = (value: MetricValue) => value === null ? '—' : `₱${(value / (Math.abs(value) >= 1000000000 ? 1000000000 : 1000000)).toFixed(1)}${Math.abs(value) >= 1000000000 ? 'B' : 'M'}`

export function summarizeCampuses(items: Campus[]) {
  const students = total(items, campus => campus.students)
  const previousStudents = total(items, campus => campus.previousStudents)
  const budget = total(items, campus => campus.budget)
  const usedBudget = total(items, campus => campus.budget === null || campus.utilization === null ? null : campus.budget * campus.utilization / 100)
  const weightedRetained = total(items, campus => campus.students === null || campus.retention === null ? null : campus.students * campus.retention / 100)
  return {
    students, faculty: total(items, campus => campus.faculty), programs: total(items, campus => campus.programs),
    growth: percentage(difference(students, previousStudents), previousStudents),
    retention: percentage(weightedRetained, students), budget, usedBudget, utilization: percentage(usedBudget, budget),
    research: {
      active: total(items, campus => campus.research.active), completed: total(items, campus => campus.research.completed),
      publications: total(items, campus => campus.research.publications), funding: total(items, campus => campus.research.funding),
    },
    extension: {
      active: total(items, campus => campus.extension.active), completed: total(items, campus => campus.extension.completed),
      communities: total(items, campus => campus.extension.communities), beneficiaries: total(items, campus => campus.extension.beneficiaries), sessions: total(items, campus => campus.extension.sessions),
    },
    production: {
      enterprises: total(items, campus => campus.production.enterprises), revenue: total(items, campus => campus.production.revenue),
      expenses: total(items, campus => campus.production.expenses), target: total(items, campus => campus.production.target),
    },
    inventory: {
      buildings: total(items, campus => campus.inventory.buildings), classrooms: total(items, campus => campus.inventory.classrooms), laboratories: total(items, campus => campus.inventory.laboratories),
      assets: total(items, campus => campus.inventory.assets), serviceable: total(items, campus => campus.inventory.serviceable), value: total(items, campus => campus.inventory.value),
    },
  }
}

/** Validate the server boundary before records reach charts or links. */
export function parseDashboard(input: unknown): DashboardData {
  function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid dashboard response.')
    return value as Record<string, unknown>
  }
  function metric(value: unknown, kind: 'count' | 'amount' | 'percent'): boolean {
    return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= (kind === 'percent' ? 100 : kind === 'count' ? 1000000000 : 1000000000000000) && (kind !== 'count' || Number.isInteger(value)))
  }
  function timestamp(value: unknown, nullable = true): boolean { return value === null ? nullable : typeof value === 'string' && Number.isFinite(Date.parse(value)) }
  const data = object(input)
  const ids = new Set(['access', 'isulan', 'tacurong', 'kalamansig', 'lutayan', 'palimbang', 'bagumbayan'])
  const sourceIds = new Set(['sinq', 'oracle', 'pad'])
  if (data.schemaVersion !== 1 || !timestamp(data.generatedAt, false) || !timestamp(data.updatedAt) || !['awaiting_data', 'partial', 'stale', 'ready'].includes(String(data.dataState)) || !(data.periodLabel === null || typeof data.periodLabel === 'string') || !(data.periodKey === null || typeof data.periodKey === 'string')) throw new Error('Invalid dashboard response.')
  if (!Array.isArray(data.campuses) || data.campuses.length !== 7 || !Array.isArray(data.sources) || data.sources.length !== 3) throw new Error('Invalid dashboard response.')
  const seen = new Set<string>()
  for (const value of data.campuses) {
    const campus = object(value)
    if (typeof campus.id !== 'string' || !ids.has(campus.id) || seen.has(campus.id)) throw new Error('Invalid campus records.')
    seen.add(campus.id)
    for (const field of ['name', 'mark']) if (typeof campus[field] !== 'string' || (campus[field] as string).length > 80) throw new Error('Invalid campus records.')
    for (const field of ['color', 'tint']) if (typeof campus[field] !== 'string' || !/^#[0-9a-f]{6}$/i.test(campus[field] as string)) throw new Error('Invalid campus colors.')
    for (const field of ['students', 'previousStudents', 'faculty', 'programs']) if (!metric(campus[field], 'count')) throw new Error('Invalid instruction records.')
    for (const field of ['retention', 'utilization']) if (!metric(campus[field], 'percent')) throw new Error('Invalid percentage records.')
    if (!metric(campus.budget, 'amount')) throw new Error('Invalid budget records.')
    const groups = {
      research: { active: 'count', completed: 'count', publications: 'count', funding: 'amount' },
      extension: { active: 'count', completed: 'count', communities: 'count', beneficiaries: 'count', sessions: 'count' },
      production: { enterprises: 'count', revenue: 'amount', expenses: 'amount', target: 'amount' },
      inventory: { buildings: 'count', classrooms: 'count', laboratories: 'count', assets: 'count', serviceable: 'count', value: 'amount' },
    } as const
    for (const [name, fields] of Object.entries(groups)) for (const [field, kind] of Object.entries(fields)) if (!metric(object(campus[name])[field], kind)) throw new Error('Invalid campus metrics.')
  }
  const seenSources = new Set<string>()
  for (const value of data.sources) {
    const source = object(value)
    if (typeof source.id !== 'string' || !sourceIds.has(source.id) || seenSources.has(source.id) || typeof source.name !== 'string' || typeof source.website !== 'string' || !Object.hasOwn(sourceStatusLabel, String(source.status)) || !timestamp(source.updatedAt)) throw new Error('Invalid source records.')
    seenSources.add(source.id)
    const url = new URL(source.website)
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid source website.')
  }
  const coverage = object(data.coverage)
  if (!metric(coverage.availableMetrics, 'count') || !metric(coverage.totalMetrics, 'count') || typeof coverage.availableMetrics !== 'number' || typeof coverage.totalMetrics !== 'number' || coverage.availableMetrics > coverage.totalMetrics) throw new Error('Invalid record coverage.')
  for (const owner of Object.values(object(data.categorySources))) if (owner !== null && (typeof owner !== 'string' || !sourceIds.has(owner))) throw new Error('Invalid source mapping.')
  return data as DashboardData
}
