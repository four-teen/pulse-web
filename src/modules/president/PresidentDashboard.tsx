import { useEffect, useRef, useState } from 'react'
import type { President } from '../../api'
import PulseWordmark from '../../components/PulseWordmark'
import Icon, { type DashboardIconName } from './DashboardIcon'
import { number, sourceStatusLabel, type Source } from './data'
import useDashboard from './useDashboard'
import FourfoldSnapshot, { BuildingAssetsSnapshot, OperationsSnapshot, type FunctionId } from './FourfoldSnapshot'
import AcademicBreakdown from './AcademicBreakdown'
import CampusLogo from './CampusLogo'
import CampusPage from './CampusPage'
import './dashboard.css'
import './dashboard-theme.css'
import './campus-page.css'

type Props = { user: President; onLogout: () => Promise<void>; signingOut: boolean; error: string; onSessionExpired?: () => void }
type Section = 'overview' | 'campus-network' | 'building-assets' | 'data-connections'
type SystemCard = Omit<Source, 'id' | 'website'> & { id: string; website: string | null }

// Display entries only; API connections and website links are configured separately.
const additionalSystems: SystemCard[] = [
  { id: 'accreditify', name: 'Accreditify', website: null, status: 'not_connected', updatedAt: null },
  { id: 'rrms', name: 'Registrar Request Management System (RRMS)', website: null, status: 'not_connected', updatedAt: null },
  { id: 'interview', name: 'Interview', website: null, status: 'not_connected', updatedAt: null },
]

function campusIdFromLocation() {
  return /^#\/campuses\/([a-z-]+)$/.exec(window.location.hash)?.[1] ?? null
}

export default function PresidentDashboard({ user, onLogout, signingOut, error, onSessionExpired }: Props) {
  const [activeSection, setActiveSection] = useState<Section>('overview')
  const [activeFunction, setActiveFunction] = useState<FunctionId>('overview')
  const [campusFilter, setCampusFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [campusPageId, setCampusPageId] = useState(campusIdFromLocation)
  const [campusFunction, setCampusFunction] = useState<FunctionId>('overview')
  const previousCampusPage = useRef(campusPageId)
  const heading = useRef<HTMLHeadingElement>(null)
  const { data, loading, error: recordsError, refresh } = useDashboard(onSessionExpired)
  const campuses = data?.campuses ?? []
  const pageCampus = campuses.find(campus => campus.id === campusPageId)
  const selectedSection = campusPageId ? 'campus-network' : activeSection
  const selectedFunction = campusPageId ? campusFunction : activeFunction
  const dataStatus = loading ? 'Refreshing' : recordsError ? 'Service unavailable' : data?.dataState === 'stale' ? 'Update overdue' : 'Presidential dashboard'
  const currentCampus = campuses.find(campus => campus.id === campusFilter)
  const selectedCampuses = currentCampus ? [currentCampus] : campuses
  const academicCounts = data?.academicCounts
  const connectedSystems: SystemCard[] = data ? [...data.sources, ...additionalSystems] : []
  const facultyCount = academicCounts ? currentCampus ? academicCounts.faculty.byCampus[currentCampus.id] ?? null : academicCounts.faculty.total : null
  const studentCount = academicCounts ? currentCampus ? academicCounts.students.byCampus[currentCampus.id] ?? null : academicCounts.students.total : null
  const visibleCampuses = campuses.filter(campus => campus.name.toLowerCase().includes(query.trim().toLowerCase()))
  const date = new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date())
  const navItems: { id: Section; label: string; icon: DashboardIconName }[] = [
    { id: 'overview', label: 'University overview', icon: 'overview' },
    { id: 'campus-network', label: 'Campus directory', icon: 'campus' },
    { id: 'building-assets', label: 'Buildings & assets', icon: 'buildings' },
    { id: 'data-connections', label: 'Data connections', icon: 'connections' },
  ]

  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])

  useEffect(() => {
    const updatePage = () => setCampusPageId(campusIdFromLocation())
    window.addEventListener('hashchange', updatePage)
    return () => window.removeEventListener('hashchange', updatePage)
  }, [])

  useEffect(() => {
    const previous = previousCampusPage.current
    previousCampusPage.current = campusPageId
    if (campusPageId) { setCampusFunction('overview'); return }
    if (!previous) return
    const frame = requestAnimationFrame(() => {
      const sectionId = window.location.hash.slice(1)
      const destination = ['overview', 'campus-network', 'building-assets', 'data-connections'].includes(sectionId) ? sectionId : 'campus-network'
      const section = document.getElementById(destination)
      const card = destination === 'campus-network' ? document.querySelector<HTMLAnchorElement>(`[data-campus-id="${previous}"]`) : null
      const target = card ?? section
      target?.scrollIntoView({ block: card ? 'center' : 'start', behavior: 'instant' })
      target?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [campusPageId])

  useEffect(() => {
    if (campusPageId) return
    let frame = 0
    const sections: Section[] = ['overview', 'building-assets', 'campus-network', 'data-connections']
    function updateSection() {
      frame = 0
      let current: Section = 'overview'
      for (const id of sections) {
        if ((document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= 145) current = id
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = 'data-connections'
      setActiveSection(current)
    }
    function onScroll() { if (!frame) frame = requestAnimationFrame(updateSection) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll) }
  }, [campusPageId])

  function navigate(section: Section) {
    setActiveSection(section)
    if (campusPageId) { window.location.hash = section; return }
    const target = document.getElementById(section)
    target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
    target?.focus({ preventScroll: true })
  }


  return <div className="pd-shell">
    <a className="pd-skip-link" href={campusPageId ? `#/campuses/${campusPageId}` : '#overview'} onClick={event => {
      if (!campusPageId) return
      event.preventDefault()
      document.getElementById('campus-page')?.focus()
    }}>{campusPageId ? 'Skip to campus content' : 'Skip to dashboard'}</a>
    <aside className="pd-sidebar" aria-label="Desktop presidential navigation">
      <div className="pd-sidebar-brand"><PulseWordmark className="pd-wordmark" /><span className="pd-brand-caption">PRESIDENTIAL WORKSPACE</span>
      </div>
      <div className="pd-university"><img src="/sksu-seal.webp" width="36" height="36" alt="SKSU seal" /><p>Sultan Kudarat<br /><strong>State University</strong></p></div>
      <p className="pd-navigation-label">WORKSPACE</p>
      <nav>{navItems.map(item => <button key={item.id} className={'pd-nav-item' + (selectedSection === item.id ? ' is-active' : '')}
        aria-current={selectedSection === item.id ? 'location' : undefined} onClick={() => { if (item.id === 'overview') setActiveFunction('overview'); navigate(item.id) }}><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.id === 'campus-network' && <span className="pd-nav-count">7</span>}</button>)}</nav>
      <div className="pd-sidebar-bottom">
        <div className="pd-president-profile"><span className="pd-avatar">P</span><div><strong>Office of the President</strong><span>Presidential access</span></div><Icon name="shield" size={17} /></div>
        <button className="pd-logout" onClick={() => void onLogout()} disabled={signingOut}><Icon name="logout" size={16} />{signingOut ? 'Signing out...' : 'Sign out securely'}</button>
      </div>
    </aside>

    <div className="pd-workspace">
      <header className="pd-topbar">
        <div className="pd-topbar-left"><span className="pd-breadcrumb">Workspace <Icon name="chevron" size={13} />{pageCampus
          ? <button className="pd-campus-breadcrumb" type="button" aria-label={`Show ${pageCampus.name} Campus overview`} onClick={() => {
            setCampusFunction('overview')
            document.getElementById('campus-page')?.scrollIntoView({ block: 'start', behavior: 'instant' })
          }}>{pageCampus.name} Campus</button>
          : <strong>{navItems.find(item => item.id === selectedSection)?.label}</strong>}</span><PulseWordmark className="pd-mobile-wordmark pd-wordmark" /></div>
        <div className="pd-topbar-right"><span className="pd-data-status" role="status"><span />{dataStatus}</span><button className="pd-icon-button" type="button" aria-label="Refresh university records" onClick={refresh} disabled={loading}><Icon name="refresh" size={17} /></button><span className="pd-topbar-divider" /><span className="pd-topbar-profile" title={user.name}><span className="pd-avatar">P</span><span>President</span></span><button className="pd-icon-button pd-mobile-logout" type="button" aria-label="Sign out securely" disabled={signingOut} onClick={() => void onLogout()}><Icon name="logout" size={18} /></button></div>
      </header>

      <main className="pd-main">
        {campusPageId ? <CampusPage campus={pageCampus} data={data} loading={loading} error={recordsError || error}
          selectedFunction={campusFunction} onFunctionChange={setCampusFunction} /> : <>
        <section className="pd-overview" id="overview" tabIndex={-1} aria-labelledby="president-dashboard-heading">
          <div className="pd-heading-row"><div><p className="pd-kicker">THE PRESIDENT’S VIEW</p><h1 ref={heading} tabIndex={-1} id="president-dashboard-heading">University at a Glance<span>.</span></h1><p className="pd-heading-description pd-wide-only">A clearer perspective on the people, programs, and progress of SKSU.</p></div><span className="pd-date"><Icon name="calendar" size={15} />{date}</span></div>
          {recordsError ? <div className="pd-records-alert" role="alert"><Icon name="info" size={18} /><p>{recordsError}</p><button type="button" onClick={refresh} disabled={loading}>Try again</button></div>
            : !loading && data?.dataState === 'stale' && <div className="pd-records-notice" role="status"><Icon name="info" size={17} /><p>Showing the latest retrieved figures. A source update is overdue.</p></div>}
          {error && <p className="pd-error" role="alert">{error}</p>}

          <div className="pd-snapshot-toolbar"><div>{data?.periodLabel && <span>{data.periodLabel}</span>}</div><label className="pd-campus-select"><Icon name="campus" size={16} /><span className="sr-only">Filter overview by campus</span><select value={campusFilter} onChange={event => setCampusFilter(event.target.value)}><option value="all">All 7 campuses</option>{campuses.map(campus => <option key={campus.id} value={campus.id}>{campus.name} Campus</option>)}</select></label></div>

          <FourfoldSnapshot items={selectedCampuses} comparisonItems={campuses}
            scopeLabel={currentCampus ? currentCampus.name + ' Campus' : 'University-wide'}
            idPrefix="university" selectedCampusId={currentCampus?.id} onCampusSelect={setCampusFilter}
            selectedFunction={activeFunction} onFunctionChange={setActiveFunction} facultyCount={facultyCount} studentCount={studentCount} />
          {activeFunction === 'overview' && <OperationsSnapshot />}
          {academicCounts?.status === 'unavailable' && <p className="pd-records-alert" role="status"><Icon name="info" size={17} />Current-term academic counts are unavailable. Refresh to try again.</p>}
          {(activeFunction === 'overview' || activeFunction === 'instruction') && academicCounts?.retrievedAt && <p className="pd-overview-updated">Synk academic counts checked {new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(academicCounts.retrievedAt))}.</p>}
          {(activeFunction === 'overview' || activeFunction === 'instruction') && academicCounts && <AcademicBreakdown data={academicCounts} campuses={campuses} campusId={currentCampus?.id} />}

        </section>

        <section className="pd-assets-section" id="building-assets" tabIndex={-1} aria-labelledby="building-assets-title">
          <div className="pd-section-heading"><div><p className="pd-kicker pd-wide-only">THE SPACES AND RESOURCES BEHIND OUR WORK</p><h2 id="building-assets-title">Building inventory & assets</h2><p>{currentCampus ? currentCampus.name + ' Campus' : 'University-wide'} · Physical resources supporting instruction, research, extension, and production.</p></div><span className={'pd-connection-count' + (!currentCampus ? ' pd-wide-only' : '')}>{currentCampus ? currentCampus.name + ' Campus' : 'All campuses'}</span></div>
          <BuildingAssetsSnapshot items={selectedCampuses} />
        </section>

        <section className="pd-campus-section" id="campus-network" tabIndex={-1} aria-labelledby="campus-network-title"><div className="pd-section-heading"><div><p className="pd-kicker">CONNECTED BY A SHARED PURPOSE</p><h2 id="campus-network-title">One University</h2><p>Explore enrollment and key figures across SKSU campuses.</p></div><label className="pd-search"><Icon name="search" size={16} /><input type="search" placeholder="Find a campus" aria-label="Find a campus" value={query} onChange={event => setQuery(event.target.value)} /></label></div><div className="pd-directory-caption"><span><Icon name="campus" size={13} />{visibleCampuses.length} of 7 campuses</span><span>{loading ? 'Loading records...' : 'Campus directory'}</span></div>
          {visibleCampuses.length ? <div className={'pd-campus-grid' + (query.trim() ? ' is-filtered' : '')}>{visibleCampuses.map((campus, index) => <a key={campus.id} href={`#/campuses/${campus.id}`} data-campus-id={campus.id} className={'pd-campus-card' + (campus.id === 'access' && !query.trim() ? ' is-featured' : '')} aria-label={`View ${campus.name} Campus details`}><div className="pd-campus-card-top"><CampusLogo campus={campus} /><span className="pd-campus-index">{String(campuses.indexOf(campus) + 1).padStart(2, '0')}</span></div><div className="pd-campus-card-name"><h3>{campus.name}<span>Campus</span></h3>{index === 0 && !query.trim() && <p>A connected view of our<br />university community.</p>}</div><div className="pd-campus-card-stat"><strong>{number(campus.students)}</strong><span>enrolled students</span></div><div className="pd-campus-card-footer"><span>{campus.programs === null ? 'Program offerings · —' : number(campus.programs) + ' program offerings'}</span><span className="pd-campus-open"><Icon name="arrow" size={16} /></span></div></a>)}</div> : <div className="pd-empty-state"><Icon name={query ? 'search' : 'campus'} size={25} /><h3>{loading ? 'Loading campus records...' : recordsError ? 'Campus records are unavailable.' : query ? `No campus matches “${query}”.` : 'Campus directory'}</h3><p>{query ? 'Try another campus name.' : 'No campus records match this view.'}</p>{query && <button onClick={() => setQuery('')}>Show all campuses</button>}</div>}
        </section>

        <section className="pd-connections-section" id="data-connections" tabIndex={-1} aria-labelledby="connections-title">
          <div className="pd-section-heading"><div><p className="pd-kicker">UNIVERSITY DATA</p><h2 id="connections-title">Connected systems</h2><p>Source availability and reporting dates.</p></div>{data && <span className="pd-connection-count">{connectedSystems.filter(source => source.status === 'connected').length} of {connectedSystems.length} summary sources connected</span>}</div>
          <div className="pd-connection-grid">{connectedSystems.map(source => <article key={source.id} className="pd-source-card"><span className={`pd-source-mark ${source.id}`}>{source.name[0]}</span><div><h3>{source.website ? <a href={source.website} target="_blank" rel="noopener noreferrer" aria-label={`Open ${source.name} website`}>{source.name}</a> : source.name}</h3><span className={'pd-source-state ' + source.status}><i />{sourceStatusLabel[source.status]}</span>{source.updatedAt && <time dateTime={source.updatedAt}>{new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }).format(new Date(source.updatedAt))}</time>}</div><Icon name="connections" size={18} /></article>)}</div>
          <p className="pd-connection-footnote">{data?.updatedAt ? 'Reporting data updated ' + new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(data.updatedAt)) : 'Figures reflect the selected reporting period. A dash indicates a value that has not been reported.'}</p>
        </section>

        </>}
        <footer className="pd-footer"><span><span className="pd-footer-dot" /><PulseWordmark className="pd-footer-brand" /><span>· Office of the President</span></span><span>Sultan Kudarat State University</span></footer>
      </main>
    </div>
    {(!campusPageId || pageCampus) && <nav className="pd-bottom-nav" aria-label={campusPageId ? 'Mobile campus navigation' : 'Mobile dashboard navigation'}>
      {([
        { id: 'overview', label: 'Overview', icon: 'overview' },
        { id: 'instruction', label: 'Instruction', icon: 'students' },
        { id: 'research', label: 'Research', icon: 'research' },
        { id: 'extension', label: 'Extension', icon: 'extension' },
        { id: 'production', label: 'Production', icon: 'production' },
      ] as { id: FunctionId; label: string; icon: DashboardIconName }[]).map(item => <button key={item.id} type="button"
        aria-current={selectedFunction === item.id ? 'page' : undefined} aria-controls={`${campusPageId ? `campus-${campusPageId}` : 'university'}-panel-${item.id}`}
        onClick={() => {
          if (campusPageId) {
            setCampusFunction(item.id)
            document.getElementById('campus-page')?.scrollIntoView({ block: 'start', behavior: 'instant' })
          } else { setActiveFunction(item.id); navigate('overview') }
        }}><span><Icon name={item.icon} size={20} /></span>{item.label}</button>)}
    </nav>}
  </div>
}
