import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import Icon, { type DashboardIconName } from './DashboardIcon'
import { add, difference, millions, number, percent, percentage, summarizeCampuses, type Campus, type MetricValue } from './data'

export type FunctionId = 'overview' | 'instruction' | 'research' | 'extension' | 'production'
type Metric = { label: string; value: string; icon: DashboardIconName; footer: string; tint: string }
type FunctionView = {
  label: string
  description: string
  icon: DashboardIconName
  metrics: Metric[]
  measures: [string, string]
  compare: (campus: Campus, measure: number) => MetricValue
  money: boolean
  progress: { title: string; label: string; value: MetricValue; description: string; achieved: string; remaining: string }
}

const functionOrder: FunctionId[] = ['overview', 'instruction', 'research', 'extension', 'production']

function functionViews(items: Campus[], facultyCount?: MetricValue, studentCount?: MetricValue): Record<FunctionId, FunctionView> {
  const summary = summarizeCampuses(items)
  if (facultyCount !== undefined) summary.faculty = facultyCount
  if (studentCount !== undefined) summary.students = studentCount
  const researchTotal = add(summary.research.active, summary.research.completed)
  const extensionTotal = add(summary.extension.active, summary.extension.completed)
  const productionIncome = difference(summary.production.revenue, summary.production.expenses)
  const facultyRatio = summary.students !== null && summary.faculty !== null && summary.faculty > 0 ? Math.round(summary.students / summary.faculty) : null
  return {
    overview: {
      label: 'Overview', icon: 'overview', description: 'People, research, and university enterprises.', money: false,
      metrics: [
        { label: 'Faculty members', value: number(summary.faculty), icon: 'faculty', footer: 'Distinct faculty in current-term college lists', tint: 'green' },
        { label: 'Enrolled students', value: number(summary.students), icon: 'students', footer: 'Unique names in active class lists', tint: 'gold' },
        { label: 'Research count', value: number(researchTotal), icon: 'research', footer: 'Active and completed studies', tint: 'blue' },
        { label: 'IGP', value: number(summary.production.enterprises), icon: 'production', footer: 'Income-generating projects', tint: 'sage' },
      ],
      measures: ['Students', 'Faculty'], compare: (campus, measure) => measure === 0 ? campus.students : campus.faculty,
      progress: { title: 'University overview', label: 'OVERVIEW', value: null, description: '', achieved: '', remaining: '' },
    },
    instruction: {
      label: 'Instruction', icon: 'students', description: 'Learning, teaching, and student success.', money: false,
      metrics: [
        { label: 'Enrolled students', value: number(summary.students), icon: 'students', footer: 'Unique names in active class lists', tint: 'green' },
        { label: 'Faculty members', value: number(summary.faculty), icon: 'faculty', footer: facultyRatio === null ? 'Faculty records' : `${facultyRatio}:1 student–faculty ratio`, tint: 'gold' },
        { label: 'Program offerings', value: number(summary.programs), icon: 'programs', footer: 'Across the selected campuses', tint: 'blue' },
        { label: 'Student retention', value: percent(summary.retention), icon: 'trend', footer: 'Weighted by enrolled students', tint: 'sage' },
      ],
      measures: ['Students', 'Faculty'], compare: (campus, measure) => measure === 0 ? campus.students : campus.faculty,
      progress: { title: 'Academic pulse', label: 'STUDENT RETENTION', value: summary.retention, description: 'Keeping students moving forward.', achieved: 'Retained students', remaining: 'Remaining share' },
    },
    research: {
      label: 'Research', icon: 'research', description: 'Knowledge creation, publications, and discovery.', money: false,
      metrics: [
        { label: 'Active studies', value: number(summary.research.active), icon: 'research', footer: 'Ongoing research projects', tint: 'green' },
        { label: 'Completed studies', value: number(summary.research.completed), icon: 'check', footer: 'Completed in the reporting period', tint: 'gold' },
        { label: 'Publications', value: number(summary.research.publications), icon: 'programs', footer: 'Published research outputs', tint: 'blue' },
        { label: 'Research funding', value: millions(summary.research.funding), icon: 'budget', footer: 'Research allocation', tint: 'sage' },
      ],
      measures: ['Studies', 'Publications'], compare: (campus, measure) => measure === 0 ? campus.research.active : campus.research.publications,
      progress: { title: 'Research progress', label: 'STUDY COMPLETION', value: percentage(summary.research.completed, researchTotal), description: researchTotal === null ? 'Research outcomes across the university.' : `${number(summary.research.completed)} completed of ${number(researchTotal)} studies.`, achieved: 'Completed studies', remaining: 'Active studies' },
    },
    extension: {
      label: 'Extension', icon: 'extension', description: 'Community partnerships and shared impact.', money: false,
      metrics: [
        { label: 'Active projects', value: number(summary.extension.active), icon: 'extension', footer: 'Ongoing community initiatives', tint: 'green' },
        { label: 'Community partnerships', value: number(summary.extension.communities), icon: 'campus', footer: 'Campus partnership records', tint: 'gold' },
        { label: 'Beneficiaries', value: number(summary.extension.beneficiaries), icon: 'faculty', footer: 'Recorded beneficiary reach', tint: 'blue' },
        { label: 'Training sessions', value: number(summary.extension.sessions), icon: 'programs', footer: 'Delivered in the reporting period', tint: 'sage' },
      ],
      measures: ['Beneficiaries', 'Projects'], compare: (campus, measure) => measure === 0 ? campus.extension.beneficiaries : campus.extension.active,
      progress: { title: 'Community impact', label: 'PROJECT COMPLETION', value: percentage(summary.extension.completed, extensionTotal), description: extensionTotal === null ? 'Progress in community engagement.' : `${number(summary.extension.completed)} completed of ${number(extensionTotal)} projects.`, achieved: 'Completed projects', remaining: 'Active projects' },
    },
    production: {
      label: 'Production', icon: 'production', description: 'University enterprises and resource generation.', money: true,
      metrics: [
        { label: 'Operating enterprises', value: number(summary.production.enterprises), icon: 'production', footer: 'Income-generating ventures', tint: 'green' },
        { label: 'Gross revenue', value: millions(summary.production.revenue), icon: 'budget', footer: 'Revenue in the reporting period', tint: 'gold' },
        { label: 'Net operating income', value: millions(productionIncome), icon: 'trend', footer: summary.production.expenses === null ? 'Revenue less operating costs' : `${millions(summary.production.expenses)} operating costs`, tint: 'blue' },
        { label: 'Revenue target', value: millions(summary.production.target), icon: 'overview', footer: percentage(summary.production.revenue, summary.production.target) === null ? 'Approved revenue target' : `${percent(percentage(summary.production.revenue, summary.production.target))} achieved`, tint: 'sage' },
      ],
      measures: ['Revenue', 'Net income'], compare: (campus, measure) => measure === 0 ? campus.production.revenue : difference(campus.production.revenue, campus.production.expenses),
      progress: { title: 'Enterprise performance', label: 'TARGET ATTAINMENT', value: percentage(summary.production.revenue, summary.production.target), description: summary.production.revenue === null || summary.production.target === null ? 'University enterprise performance.' : `${millions(summary.production.revenue)} toward a ${millions(summary.production.target)} target.`, achieved: 'Revenue achieved', remaining: 'Remaining target' },
    },
  }
}

export default function FourfoldSnapshot({ items, scopeLabel, idPrefix, compact = false, comparisonItems = items, selectedCampusId, onCampusSelect, selectedFunction, onFunctionChange, facultyCount, studentCount }: {
  items: Campus[]
  scopeLabel: string
  idPrefix: string
  compact?: boolean
  comparisonItems?: Campus[]
  selectedCampusId?: string
  onCampusSelect?: (id: string) => void
  selectedFunction?: FunctionId
  onFunctionChange?: (id: FunctionId) => void
  facultyCount?: MetricValue
  studentCount?: MetricValue
}) {
  const [localFunction, setLocalFunction] = useState<FunctionId>(compact ? 'instruction' : 'overview')
  const tabs = functionOrder.filter(id => id !== 'overview')
  const activeFunction = selectedFunction ?? localFunction
  const [measure, setMeasure] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const views = functionViews(items, facultyCount, studentCount)
  const view = views[activeFunction]
  const chartValues = comparisonItems.map(campus => view.compare(campus, measure)).filter((value): value is number => value !== null)
  const largestValue = Math.max(1, ...chartValues.map(Math.abs))
  const scaleUnit = 10 ** Math.floor(Math.log10(largestValue))
  const maximum = Math.ceil(largestValue / scaleUnit) * scaleUnit
  const hasNegative = chartValues.some(value => value < 0)
  const formatChart = (value: MetricValue) => view.money ? millions(value) : number(value)

  useEffect(() => { setMeasure(0) }, [activeFunction])

  function selectFunction(id: FunctionId) { setLocalFunction(id); onFunctionChange?.(id); setMeasure(0) }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    else return
    event.preventDefault()
    selectFunction(tabs[next])
    tabRefs.current[next]?.focus()
  }

  return <div className={'pd-fourfold' + (compact ? ' is-compact' : '')}>
    <div className="pd-function-tabs" role="tablist" aria-label={`${scopeLabel} dashboard views`}>
      {tabs.map((id, index) => <button key={id} ref={element => { tabRefs.current[index] = element }} type="button" role="tab"
        id={`${idPrefix}-tab-${id}`} aria-controls={`${idPrefix}-panel-${id}`} aria-selected={activeFunction === id}
        tabIndex={activeFunction === id || activeFunction === 'overview' && index === 0 ? 0 : -1} onClick={() => selectFunction(id)} onKeyDown={event => handleTabKey(event, index)}>
        <Icon name={views[id].icon} size={18} /><span>{views[id].label}</span><span className="pd-function-number" aria-hidden="true">0{index + 1}</span>
      </button>)}
    </div>

    {functionOrder.map(id => <div key={id} role={id === 'overview' ? 'region' : 'tabpanel'} id={`${idPrefix}-panel-${id}`} aria-label={id === 'overview' ? scopeLabel === 'University-wide' ? 'University overview' : `${scopeLabel} overview` : undefined} aria-labelledby={id === 'overview' ? undefined : `${idPrefix}-tab-${id}`} tabIndex={0} hidden={activeFunction !== id}>
      {activeFunction === id && <>
        <div className="pd-function-context"><span>{view.label}</span><p>{view.description}</p></div>
        <div className="pd-metric-grid">{view.metrics.map(metric => <article key={metric.label} className="pd-metric-card"><div className="pd-metric-top"><span>{metric.label}</span><span className={`pd-metric-icon ${metric.tint}`}><Icon name={metric.icon} size={19} /></span></div><strong className={'pd-metric-number' + (metric.value === '—' ? ' is-missing' : '')}>{metric.value}</strong><div className="pd-metric-footer"><span>{metric.footer}</span></div></article>)}</div>

        {!compact && activeFunction !== 'overview' && <div className="pd-chart-grid">
          <section className="pd-panel pd-enrollment-panel" aria-labelledby={`${idPrefix}-distribution-title`}>
            <div className="pd-panel-heading"><div><h2 id={`${idPrefix}-distribution-title`}>{view.label} by campus</h2><p>{view.description}</p></div><div className="pd-segmented" aria-label={`Compare ${view.label.toLowerCase()} statistics`}>{view.measures.map((label, index) => <button key={label} type="button" aria-pressed={measure === index} onClick={() => setMeasure(index)}>{label}</button>)}</div></div>
            {chartValues.length > 0 ? <>
              <div className="pd-chart-scale" aria-hidden="true"><span>{hasNegative ? formatChart(-maximum) : '0'}</span><span>{formatChart(hasNegative ? 0 : maximum / 2)}</span><span>{formatChart(maximum)}</span></div>
              <div className="pd-bar-chart" aria-label={`${view.label}: ${view.measures[measure].toLowerCase()} by campus`}>{comparisonItems.map(campus => {
                const value = view.compare(campus, measure)
                const width = value === null ? 0 : Math.abs(value) / maximum * (hasNegative ? 50 : 100)
                return <button key={campus.id} type="button" className={'pd-chart-row' + (selectedCampusId === campus.id ? ' is-selected' : '') + (selectedCampusId && selectedCampusId !== campus.id ? ' is-muted' : '')}
                  aria-label={`${campus.name}: ${value === null ? 'not reported' : formatChart(value) + ' ' + view.measures[measure].toLowerCase()}. Filter overview.`}
                  aria-pressed={selectedCampusId === campus.id} onClick={() => onCampusSelect?.(selectedCampusId === campus.id ? 'all' : campus.id)}>
                  <span className="pd-bar-label">{campus.name}</span><span className="pd-bar-track" style={{ '--zero-position': hasNegative ? '50%' : '0%' } as CSSProperties}>
                    {value !== null && value !== 0 && <span className="pd-bar-fill" style={{ position: 'absolute', left: `${(hasNegative ? 50 : 0) - (value < 0 ? width : 0)}%`, width: `${width}%`, background: value < 0 ? '#a8654c' : selectedCampusId === campus.id ? 'var(--pd-chart-highlight, #c86626)' : campus.color }} />}
                  </span><strong>{formatChart(value)}</strong>
                </button>
              })}</div>
              <div className="pd-chart-footer"><span><i />{view.measures[measure]} · {scopeLabel}</span><span>Select a campus to focus</span></div>
            </> : <div className="pd-records-empty"><span><Icon name={view.icon} size={27} /></span><h3>{view.label} by campus</h3><p>No figures reported for this view.</p></div>}
          </section>

          <section className="pd-panel pd-retention-panel" aria-labelledby={`${idPrefix}-progress-title`}>
            <div className="pd-panel-heading"><div><h2 id={`${idPrefix}-progress-title`}>{view.progress.title}</h2><p>{view.progress.description}</p></div><span className="pd-panel-small-icon"><Icon name={view.icon} size={20} /></span></div>
            <div className={'pd-retention-ring' + (view.progress.value === null ? ' is-empty' : '')} role="img" aria-label={`${view.progress.label.toLowerCase()}: ${view.progress.value === null ? 'not reported' : percent(view.progress.value)}`} style={{ '--retention': `${Math.min(100, Math.max(0, view.progress.value ?? 0))}%` } as CSSProperties}><div><span>{view.progress.label}</span><strong>{view.progress.value === null ? '—' : <>{view.progress.value.toFixed(1)}<small>%</small></>}</strong><span>{view.progress.value === null ? 'Not reported' : scopeLabel}</span></div></div>
            {view.progress.value !== null && <div className="pd-retention-legend"><span><i />{view.progress.achieved}</span><span><i />{view.progress.remaining}</span></div>}
            <div className="pd-retention-note"><Icon name="info" size={14} /><p>{view.progress.value === null ? 'No performance figure reported for this period.' : `${view.label} performance for the selected campus view.`}</p></div>
          </section>
        </div>}
      </>}
    </div>)}
  </div>
}

export function OperationsSnapshot() {
  // These sources are not connected yet; an unknown total must not be shown as zero.
  const metrics: Metric[] = [
    { label: 'Travel', value: number(null), icon: 'travel', footer: 'TO tracking', tint: 'green' },
    { label: 'Vehicle', value: number(null), icon: 'vehicle', footer: 'University vehicle routing', tint: 'gold' },
    { label: 'Employee', value: number(null), icon: 'employee', footer: 'Track employee On/Off Campus', tint: 'blue' },
    { label: 'Document', value: number(null), icon: 'document', footer: 'Total document transactions', tint: 'sage' },
  ]
  return <div className="pd-operations-snapshot pd-metric-grid" role="group" aria-label="University operations">
    {metrics.map(metric => <article key={metric.label} className="pd-metric-card">
      <div className="pd-metric-top"><span>{metric.label}</span><span className={`pd-metric-icon ${metric.tint}`}><Icon name={metric.icon} size={19} /></span></div>
      <strong className="pd-metric-number is-missing" aria-label="Not reported">{metric.value}</strong>
      <div className="pd-metric-footer"><span>{metric.footer}</span></div>
    </article>)}
  </div>
}

export function BuildingAssetsSnapshot({ items, compact = false }: { items: Campus[]; compact?: boolean }) {
  const summary = summarizeCampuses(items)
  const inventory = summary.inventory
  const metrics: Metric[] = [
    { label: 'Buildings', value: number(inventory.buildings), icon: 'buildings', footer: 'Buildings in the inventory', tint: 'green' },
    { label: 'Classrooms', value: number(inventory.classrooms), icon: 'campus', footer: inventory.laboratories === null ? 'Teaching and learning spaces' : `${number(inventory.laboratories)} laboratories also recorded`, tint: 'gold' },
    { label: 'Recorded assets', value: number(inventory.assets), icon: 'assets', footer: inventory.serviceable === null ? 'University asset records' : `${number(inventory.serviceable)} serviceable assets`, tint: 'blue' },
    { label: 'Asset book value', value: millions(inventory.value), icon: 'budget', footer: 'Recorded asset value', tint: 'sage' },
  ]
  return <div className={'pd-inventory-snapshot' + (compact ? ' is-compact' : '')}>
    <div className="pd-metric-grid">{metrics.map(metric => <article className="pd-metric-card" key={metric.label}><div className="pd-metric-top"><span>{metric.label}</span><span className={`pd-metric-icon ${metric.tint}`}><Icon name={metric.icon} size={19} /></span></div><strong className={'pd-metric-number' + (metric.value === '—' ? ' is-missing' : '')}>{metric.value}</strong><div className="pd-metric-footer">{metric.footer}</div></article>)}</div>
    {!compact && <div className="pd-inventory-footnote"><span><Icon name="shield" size={15} />Shared resources for all four functions</span>{summary.utilization !== null && <span>Budget use: <strong>{percent(summary.utilization)}</strong> · {millions(summary.usedBudget)} of {millions(summary.budget)}</span>}</div>}
  </div>
}
