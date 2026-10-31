import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { President } from '../../api'
import PulseWordmark from '../../components/PulseWordmark'
import Icon, { type DashboardIconName } from './DashboardIcon'
import { number, sourceStatusLabel, type Campus } from './data'
import useDashboard from './useDashboard'
import FourfoldSnapshot, { BuildingAssetsSnapshot, type FunctionId } from './FourfoldSnapshot'
import AcademicBreakdown from './AcademicBreakdown'
import './dashboard.css'

type Props = { user: President; onLogout: () => Promise<void>; signingOut: boolean; error: string; onSessionExpired?: () => void }
type Section = 'overview' | 'campus-network' | 'building-assets' | 'data-connections'

function CampusLogo({ campus, large = false }: { campus: Campus; large?: boolean }) {
  return <span className={'pd-campus-logo' + (large ? ' is-large' : '')}
    style={{ '--campus-color': campus.color, '--campus-tint': campus.tint } as CSSProperties}
    role="img" aria-label={`${campus.name} campus symbol`}>
    <span className="pd-logo-stars" aria-hidden="true">✦</span>
    <span className="pd-logo-letters" aria-hidden="true">{campus.mark}</span>
    <span className="pd-logo-school" aria-hidden="true">SKSU</span>
  </span>
}

function CampusDetails({ campus, onClose, onOverview, periodLabel }: { campus: Campus; onClose: () => void; onOverview: (id: string) => void; periodLabel: string | null }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])
  return <dialog ref={dialog} className="pd-dialog" aria-labelledby="campus-detail-title" onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
    <div className="pd-dialog-content">
      <button className="pd-icon-button pd-dialog-close" aria-label="Close campus details" onClick={() => dialog.current?.close()}><Icon name="close" /></button>
      <CampusLogo campus={campus} large />
      <p className="pd-kicker">CAMPUS SNAPSHOT</p>
      <h2 id="campus-detail-title">{campus.name} Campus</h2>
      {periodLabel && <p className="pd-dialog-period">{periodLabel}</p>}
      <FourfoldSnapshot items={[campus]} scopeLabel={campus.name + ' Campus'} idPrefix={'campus-' + campus.id} compact />
      <div className="pd-campus-inventory-heading"><Icon name="buildings" size={18} /><h3>Building inventory & assets</h3></div>
      <BuildingAssetsSnapshot items={[campus]} compact />
      <p className="pd-detail-note">Campus figures for the selected reporting period.</p>
      <button className="pd-primary-button" onClick={() => { dialog.current?.close(); onOverview(campus.id) }}>View this campus in overview<Icon name="arrow" size={17} /></button>
    </div>
  </dialog>
}

export default function PresidentDashboard({ user, onLogout, signingOut, error, onSessionExpired }: Props) {
  const [activeSection, setActiveSection] = useState<Section>('overview')
  const [activeFunction, setActiveFunction] = useState<FunctionId>('overview')
  const [campusFilter, setCampusFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<Campus | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const { data, loading, error: recordsError, refresh } = useDashboard(onSessionExpired)
  const campuses = data?.campuses ?? []
  const dataStatus = loading ? 'Refreshing' : recordsError ? 'Service unavailable' : data?.dataState === 'stale' ? 'Update overdue' : 'Presidential dashboard'
  const currentCampus = campuses.find(campus => campus.id === campusFilter)
  const selectedCampuses = currentCampus ? [currentCampus] : campuses
  const academicCounts = data?.academicCounts
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
  }, [])

  function navigate(section: Section) {
    setActiveSection(section)
    const target = document.getElementById(section)
    target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
    target?.focus({ preventScroll: true })
  }


  return <div className="pd-shell">
    <a className="pd-skip-link" href="#overview">Skip to dashboard</a>
    <aside className="pd-sidebar" aria-label="Desktop presidential navigation">
      <div className="pd-sidebar-brand"><PulseWordmark className="pd-wordmark" /><span className="pd-brand-caption">PRESIDENTIAL WORKSPACE</span>
      </div>
      <div className="pd-university"><img src="/sksu-seal.webp" width="36" height="36" alt="SKSU seal" /><p>Sultan Kudarat<br /><strong>State University</strong></p></div>
      <p className="pd-navigation-label">WORKSPACE</p>
      <nav>{navItems.map(item => <button key={item.id} className={'pd-nav-item' + (activeSection === item.id ? ' is-active' : '')}
        aria-current={activeSection === item.id ? 'location' : undefined} onClick={() => { if (item.id === 'overview') setActiveFunction('overview'); navigate(item.id) }}><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.id === 'campus-network' && <span className="pd-nav-count">7</span>}</button>)}</nav>
      <div className="pd-sidebar-bottom">
        <div className="pd-president-profile"><span className="pd-avatar">P</span><div><strong>Office of the President</strong><span>Presidential access</span></div><Icon name="shield" size={17} /></div>
        <button className="pd-logout" onClick={() => void onLogout()} disabled={signingOut}><Icon name="logout" size={16} />{signingOut ? 'Signing out...' : 'Sign out securely'}</button>
      </div>
    </aside>

    <div className="pd-workspace">
      <header className="pd-topbar">
        <div className="pd-topbar-left"><span className="pd-breadcrumb">Workspace <Icon name="chevron" size={13} /><strong>{navItems.find(item => item.id === activeSection)?.label}</strong></span><PulseWordmark className="pd-mobile-wordmark pd-wordmark" /></div>
        <div className="pd-topbar-right"><span className="pd-data-status" role="status"><span />{dataStatus}</span><button className="pd-icon-button" type="button" aria-label="Refresh university records" onClick={refresh} disabled={loading}><Icon name="refresh" size={17} /></button><span className="pd-topbar-divider" /><span className="pd-topbar-profile" title={user.name}><span className="pd-avatar">P</span><span>President</span></span><button className="pd-icon-button pd-mobile-logout" type="button" aria-label="Sign out securely" disabled={signingOut} onClick={() => void onLogout()}><Icon name="logout" size={18} /></button></div>
      </header>

      <main className="pd-main">
        <section className="pd-overview" id="overview" tabIndex={-1} aria-labelledby="president-dashboard-heading">
          <div className="pd-heading-row"><div><p className="pd-kicker">THE PRESIDENT’S VIEW</p><h1 ref={heading} tabIndex={-1} id="president-dashboard-heading">Your university, at a glance<span>.</span></h1><p className="pd-heading-description">A clearer perspective on the people, programs, and progress of SKSU.</p></div><span className="pd-date"><Icon name="calendar" size={15} />{date}</span></div>
          {recordsError ? <div className="pd-records-alert" role="alert"><Icon name="info" size={18} /><p>{recordsError}</p><button type="button" onClick={refresh} disabled={loading}>Try again</button></div>
            : !loading && data?.dataState === 'stale' && <div className="pd-records-notice" role="status"><Icon name="info" size={17} /><p>Showing the latest retrieved figures. A source update is overdue.</p></div>}
          {error && <p className="pd-error" role="alert">{error}</p>}

          <div className="pd-snapshot-toolbar"><div>{data?.periodLabel && <span>{data.periodLabel}</span>}</div><label className="pd-campus-select"><Icon name="campus" size={16} /><span className="sr-only">Filter overview by campus</span><select value={campusFilter} onChange={event => setCampusFilter(event.target.value)}><option value="all">All 7 campuses</option>{campuses.map(campus => <option key={campus.id} value={campus.id}>{campus.name} Campus</option>)}</select></label></div>

          <FourfoldSnapshot items={selectedCampuses} comparisonItems={campuses}
            scopeLabel={currentCampus ? currentCampus.name + ' Campus' : 'University-wide'}
            idPrefix="university" selectedCampusId={currentCampus?.id} onCampusSelect={setCampusFilter}
            selectedFunction={activeFunction} onFunctionChange={setActiveFunction} facultyCount={facultyCount} studentCount={studentCount} />
          {academicCounts?.status === 'unavailable' && <p className="pd-records-alert" role="status"><Icon name="info" size={17} />Current-term academic counts are unavailable. Refresh to try again.</p>}
          {(activeFunction === 'overview' || activeFunction === 'instruction') && academicCounts?.retrievedAt && <p className="pd-overview-updated">Synk academic counts checked {new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(academicCounts.retrievedAt))}.</p>}
          {(activeFunction === 'overview' || activeFunction === 'instruction') && academicCounts && <AcademicBreakdown data={academicCounts} campuses={campuses} campusId={currentCampus?.id} />}

        </section>

        <section className="pd-assets-section" id="building-assets" tabIndex={-1} aria-labelledby="building-assets-title">
          <div className="pd-section-heading"><div><p className="pd-kicker">THE SPACES AND RESOURCES BEHIND OUR WORK</p><h2 id="building-assets-title">Building inventory & assets</h2><p>{currentCampus ? currentCampus.name + ' Campus' : 'University-wide'} · Physical resources supporting instruction, research, extension, and production.</p></div><span className="pd-connection-count">{currentCampus ? currentCampus.name + ' Campus' : 'All campuses'}</span></div>
          <BuildingAssetsSnapshot items={selectedCampuses} />
        </section>

        <section className="pd-campus-section" id="campus-network" tabIndex={-1} aria-labelledby="campus-network-title"><div className="pd-section-heading"><div><p className="pd-kicker">CONNECTED BY A SHARED PURPOSE</p><h2 id="campus-network-title">Seven campuses. One university.</h2><p>Explore enrollment and key figures across SKSU campuses.</p></div><label className="pd-search"><Icon name="search" size={16} /><input type="search" placeholder="Find a campus" aria-label="Find a campus" value={query} onChange={event => setQuery(event.target.value)} /></label></div><div className="pd-directory-caption"><span><Icon name="campus" size={13} />{visibleCampuses.length} of 7 campuses</span><span>{loading ? 'Loading records...' : 'Campus directory'}</span></div>
          {visibleCampuses.length ? <div className={'pd-campus-grid' + (query.trim() ? ' is-filtered' : '')}>{visibleCampuses.map((campus, index) => <button key={campus.id} className={'pd-campus-card' + (campus.id === 'access' && !query.trim() ? ' is-featured' : '')} onClick={() => setDetail(campus)} aria-label={`View ${campus.name} Campus details`}><div className="pd-campus-card-top"><CampusLogo campus={campus} /><span className="pd-campus-index">{String(campuses.indexOf(campus) + 1).padStart(2, '0')}</span></div><div className="pd-campus-card-name"><h3>{campus.name}<span>Campus</span></h3>{index === 0 && !query.trim() && <p>A connected view of our<br />university community.</p>}</div><div className="pd-campus-card-stat"><strong>{number(campus.students)}</strong><span>enrolled students</span></div><div className="pd-campus-card-footer"><span>{campus.programs === null ? 'Program offerings · —' : number(campus.programs) + ' program offerings'}</span><span className="pd-campus-open"><Icon name="arrow" size={16} /></span></div></button>)}</div> : <div className="pd-empty-state"><Icon name={query ? 'search' : 'campus'} size={25} /><h3>{loading ? 'Loading campus records...' : recordsError ? 'Campus records are unavailable.' : query ? `No campus matches “${query}”.` : 'Campus directory'}</h3><p>{query ? 'Try another campus name.' : 'No campus records match this view.'}</p>{query && <button onClick={() => setQuery('')}>Show all campuses</button>}</div>}
        </section>

        <section className="pd-connections-section" id="data-connections" tabIndex={-1} aria-labelledby="connections-title">
          <div className="pd-section-heading"><div><p className="pd-kicker">UNIVERSITY DATA</p><h2 id="connections-title">Connected systems</h2><p>Source availability and reporting dates.</p></div>{data && <span className="pd-connection-count">{data.sources.filter(source => source.status === 'connected').length} of {data.sources.length} summary sources connected</span>}</div>
          <div className="pd-connection-grid">{data?.sources.map(source => <article key={source.id} className="pd-source-card"><span className={`pd-source-mark ${source.id}`}>{source.name[0]}</span><div><h3><a href={source.website} target="_blank" rel="noopener noreferrer" aria-label={`Open ${source.name} website`}>{source.name}</a></h3><span className={'pd-source-state ' + source.status}><i />{sourceStatusLabel[source.status]}</span>{source.updatedAt && <time dateTime={source.updatedAt}>{new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }).format(new Date(source.updatedAt))}</time>}</div><Icon name="connections" size={18} /></article>)}</div>
          <p className="pd-connection-footnote">{data?.updatedAt ? 'Reporting data updated ' + new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(data.updatedAt)) : 'Figures reflect the selected reporting period. A dash indicates a value that has not been reported.'}</p>
        </section>

        <footer className="pd-footer"><span><span className="pd-footer-dot" /><PulseWordmark className="pd-footer-brand" /><span>· Office of the President</span></span><span>Sultan Kudarat State University</span></footer>
      </main>
    </div>
    <nav className="pd-bottom-nav" aria-label="Mobile dashboard navigation">
      {([
        { id: 'overview', label: 'Overview', icon: 'overview' },
        { id: 'instruction', label: 'Instruction', icon: 'students' },
        { id: 'research', label: 'Research', icon: 'research' },
        { id: 'extension', label: 'Extension', icon: 'extension' },
        { id: 'production', label: 'Production', icon: 'production' },
      ] as { id: FunctionId; label: string; icon: DashboardIconName }[]).map(item => <button key={item.id} type="button"
        aria-current={activeFunction === item.id ? 'page' : undefined} aria-controls={`university-panel-${item.id}`}
        onClick={() => { setActiveFunction(item.id); navigate('overview') }}><span><Icon name={item.icon} size={20} /></span>{item.label}</button>)}
    </nav>
    {detail && <CampusDetails campus={detail} periodLabel={data?.periodLabel ?? null} onClose={() => setDetail(null)} onOverview={id => { setCampusFilter(id); setActiveFunction('overview'); navigate('overview') }} />}
  </div>
}
