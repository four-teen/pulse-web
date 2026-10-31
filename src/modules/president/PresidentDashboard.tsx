import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { President } from '../../api'
import PulseWordmark from '../../components/PulseWordmark'
import MobileMoreMenu from './MobileMoreMenu'
import Icon, { type DashboardIconName } from './DashboardIcon'
import { number, sourceStatusLabel, type Campus } from './data'
import useDashboard from './useDashboard'
import FourfoldSnapshot, { BuildingAssetsSnapshot, type FunctionId } from './FourfoldSnapshot'
import FacultyProfilesSection from './FacultyProfilesSection'
import './dashboard.css'

type Props = { user: President; onLogout: () => Promise<void>; signingOut: boolean; error: string; onSessionExpired?: () => void }
type Section = 'overview' | 'campus-network' | 'building-assets' | 'faculty-profiles' | 'data-connections'

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
      <p className="pd-detail-note">Records are shown as they become available from the university’s connected systems.</p>
      <button className="pd-primary-button" onClick={() => { dialog.current?.close(); onOverview(campus.id) }}>View this campus in overview<Icon name="arrow" size={17} /></button>
    </div>
  </dialog>
}

export default function PresidentDashboard({ user, onLogout, signingOut, error, onSessionExpired }: Props) {
  const [activeSection, setActiveSection] = useState<Section>('overview')
  const [moreOpen, setMoreOpen] = useState(false)
  const [activeFunction, setActiveFunction] = useState<FunctionId>('instruction')
  const [campusFilter, setCampusFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<Campus | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const { data, loading, error: recordsError, refresh } = useDashboard(onSessionExpired)
  const campuses = data?.campuses ?? []
  const dataStatus = loading ? 'Loading records' : recordsError ? 'Records unavailable' : data?.dataState === 'ready' ? 'Records available' : data?.dataState === 'partial' ? 'Partial records' : data?.dataState === 'stale' ? 'Update overdue' : 'Awaiting data'
  const currentCampus = campuses.find(campus => campus.id === campusFilter)
  const selectedCampuses = currentCampus ? [currentCampus] : campuses
  const visibleCampuses = campuses.filter(campus => campus.name.toLowerCase().includes(query.trim().toLowerCase()))
  const date = new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date())
  const navItems: { id: Section; label: string; icon: DashboardIconName }[] = [
    { id: 'overview', label: 'University overview', icon: 'overview' },
    { id: 'campus-network', label: 'Campus directory', icon: 'campus' },
    { id: 'building-assets', label: 'Buildings & assets', icon: 'buildings' },
    { id: 'faculty-profiles', label: 'Faculty profiles', icon: 'faculty' },
    { id: 'data-connections', label: 'Data connections', icon: 'connections' },
  ]

  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 1279px)')
    const handleResize = () => { if (!mobile.matches) setMoreOpen(false) }
    mobile.addEventListener('change', handleResize)
    return () => mobile.removeEventListener('change', handleResize)
  }, [])

  useEffect(() => {
    let frame = 0
    const sections: Section[] = ['overview', 'building-assets', 'campus-network', 'faculty-profiles', 'data-connections']
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
    setMoreOpen(false)
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
        aria-current={activeSection === item.id ? 'location' : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.id === 'campus-network' && <span className="pd-nav-count">7</span>}</button>)}</nav>
      <div className="pd-sidebar-bottom">
        <div className="pd-sidebar-note"><span className="pd-note-mark">✦</span><p>One university.<br /><em>A shared direction.</em></p><span>Seven campuses, brought into focus.</span></div>
        <div className="pd-president-profile"><span className="pd-avatar">P</span><div><strong>Office of the President</strong><span>Presidential access</span></div><Icon name="shield" size={17} /></div>
        <button className="pd-logout" onClick={() => void onLogout()} disabled={signingOut}><Icon name="logout" size={16} />{signingOut ? 'Signing out...' : 'Sign out securely'}</button>
      </div>
    </aside>

    <div className="pd-workspace">
      <header className="pd-topbar">
        <div className="pd-topbar-left"><span className="pd-breadcrumb">Workspace <Icon name="chevron" size={13} /><strong>{navItems.find(item => item.id === activeSection)?.label}</strong></span><PulseWordmark className="pd-mobile-wordmark pd-wordmark" /></div>
        <div className="pd-topbar-right"><span className="pd-data-status" role="status"><span />{dataStatus}</span><button className="pd-icon-button" type="button" aria-label="Refresh university records" onClick={refresh} disabled={loading}><Icon name="refresh" size={17} /></button><span className="pd-topbar-divider" /><span className="pd-topbar-profile" title={user.name}><span className="pd-avatar">P</span><span>President</span></span></div>
      </header>

      <main className="pd-main">
        <section className="pd-overview" id="overview" tabIndex={-1} aria-labelledby="president-dashboard-heading">
          <div className="pd-heading-row"><div><p className="pd-kicker">THE PRESIDENT’S VIEW</p><h1 ref={heading} tabIndex={-1} id="president-dashboard-heading">Your university, at a glance<span>.</span></h1><p className="pd-heading-description">A clearer perspective on the people, programs, and progress of SKSU.</p></div><span className="pd-date"><Icon name="calendar" size={15} />{date}</span></div>
          {recordsError ? <div className="pd-records-alert" role="alert"><Icon name="info" size={18} /><p>{recordsError}</p><button type="button" onClick={refresh} disabled={loading}>Try again</button></div>
            : !loading && data?.dataState !== 'ready' && <div className="pd-records-notice" role="status"><Icon name="info" size={17} /><p>{data?.dataState === 'stale' ? 'Some source records are overdue for an update. Last available records are shown.' : data?.dataState === 'partial' ? 'Some records are not yet available. University totals appear once all selected campuses have reported.' : 'Awaiting university records. Statistics will appear as the connected systems provide updates.'}</p></div>}
          {error && <p className="pd-error" role="alert">{error}</p>}

          <div className="pd-snapshot-toolbar"><div><h2>{currentCampus ? `${currentCampus.name} Campus` : 'University snapshot'}</h2>{data?.periodLabel && <span>{data.periodLabel}</span>}</div><label className="pd-campus-select"><Icon name="campus" size={16} /><span className="sr-only">Filter overview by campus</span><select value={campusFilter} onChange={event => setCampusFilter(event.target.value)}><option value="all">All 7 campuses</option>{campuses.map(campus => <option key={campus.id} value={campus.id}>{campus.name} Campus</option>)}</select></label></div>

          <FourfoldSnapshot items={selectedCampuses} comparisonItems={campuses}
            scopeLabel={currentCampus ? currentCampus.name + ' Campus' : 'University-wide'}
            idPrefix="university" selectedCampusId={currentCampus?.id} onCampusSelect={setCampusFilter}
            selectedFunction={activeFunction} onFunctionChange={setActiveFunction} />

        </section>

        <section className="pd-assets-section" id="building-assets" tabIndex={-1} aria-labelledby="building-assets-title">
          <div className="pd-section-heading"><div><p className="pd-kicker">THE SPACES AND RESOURCES BEHIND OUR WORK</p><h2 id="building-assets-title">Building inventory & assets</h2><p>{currentCampus ? currentCampus.name + ' Campus' : 'University-wide'} · Physical resources supporting instruction, research, extension, and production.</p></div><span className="pd-connection-count">{currentCampus ? currentCampus.name + ' Campus' : 'All campuses'}</span></div>
          <BuildingAssetsSnapshot items={selectedCampuses} />
        </section>

        <section className="pd-campus-section" id="campus-network" tabIndex={-1} aria-labelledby="campus-network-title"><div className="pd-section-heading"><div><p className="pd-kicker">CONNECTED BY A SHARED PURPOSE</p><h2 id="campus-network-title">Seven campuses. One university.</h2><p>Explore a snapshot of each campus in the SKSU community.</p></div><label className="pd-search"><Icon name="search" size={16} /><input type="search" placeholder="Find a campus" aria-label="Find a campus" value={query} onChange={event => setQuery(event.target.value)} /></label></div><div className="pd-directory-caption"><span><Icon name="campus" size={13} />{visibleCampuses.length} of 7 campuses</span><span>{loading ? 'Loading records...' : 'Campus directory'}</span></div>
          {visibleCampuses.length ? <div className={'pd-campus-grid' + (query.trim() ? ' is-filtered' : '')}>{visibleCampuses.map((campus, index) => <button key={campus.id} className={'pd-campus-card' + (campus.id === 'access' && !query.trim() ? ' is-featured' : '')} onClick={() => setDetail(campus)} aria-label={`View ${campus.name} Campus details`}><div className="pd-campus-card-top"><CampusLogo campus={campus} /><span className="pd-campus-index">{String(campuses.indexOf(campus) + 1).padStart(2, '0')}</span></div><div className="pd-campus-card-name"><h3>{campus.name}<span>Campus</span></h3>{index === 0 && !query.trim() && <p>A connected view of our<br />university community.</p>}</div><div className="pd-campus-card-stat"><strong>{number(campus.students)}</strong><span>enrolled students</span></div><div className="pd-campus-card-footer"><span>{campus.programs === null ? 'Programs awaiting data' : number(campus.programs) + ' program offerings'}</span><span className="pd-campus-open"><Icon name="arrow" size={16} /></span></div></button>)}</div> : <div className="pd-empty-state"><Icon name={query ? 'search' : 'campus'} size={25} /><h3>{loading ? 'Loading campus records...' : recordsError ? 'Campus records are unavailable.' : query ? `No campus matches “${query}”.` : 'Awaiting campus records.'}</h3><p>{query ? 'Try another campus name.' : 'The campus directory will appear when records are available.'}</p>{query && <button onClick={() => setQuery('')}>Show all campuses</button>}</div>}
        </section>

        <FacultyProfilesSection onSessionExpired={onSessionExpired} />

        <section className="pd-connections-section" id="data-connections" tabIndex={-1} aria-labelledby="connections-title">
          <div className="pd-section-heading"><div><p className="pd-kicker">THE FOUNDATION FOR REAL-TIME INSIGHTS</p><h2 id="connections-title">One view. Connected systems.</h2><p>Source availability and the latest university records.</p></div>{data && <span className="pd-connection-count">{data.sources.filter(source => source.status === 'connected').length} of {data.sources.length} sources connected</span>}</div>
          <div className="pd-connection-grid">{data?.sources.map(source => <article key={source.id} className="pd-source-card"><span className={`pd-source-mark ${source.id}`}>{source.name[0]}</span><div><h3><a href={source.website} target="_blank" rel="noopener noreferrer" aria-label={`Open ${source.name} website`}>{source.name}</a></h3><span className={'pd-source-state ' + source.status}><i />{sourceStatusLabel[source.status]}</span>{source.updatedAt && <time dateTime={source.updatedAt}>{new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }).format(new Date(source.updatedAt))}</time>}</div><Icon name="connections" size={18} /></article>)}</div>
          <p className="pd-connection-footnote">{data?.updatedAt ? 'Oldest contributing record: ' + new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(data.updatedAt)) : 'No university records have been received yet.'}</p>
        </section>

        <footer className="pd-footer"><span><span className="pd-footer-dot" /><PulseWordmark className="pd-footer-brand" /><span>· Office of the President</span></span><span>Sultan Kudarat State University</span></footer>
      </main>
    </div>
    <nav className="pd-bottom-nav" aria-label="Mobile dashboard navigation">
      {([
        { id: 'overview', label: 'Overview', icon: 'overview' },
        { id: 'campus-network', label: 'Campuses', icon: 'campus' },
        { id: 'building-assets', label: 'Assets', icon: 'buildings' },
        { id: 'data-connections', label: 'Sources', icon: 'connections' },
      ] as { id: Section; label: string; icon: DashboardIconName }[]).map(item => <button key={item.id} type="button"
        aria-current={activeSection === item.id && !moreOpen ? 'location' : undefined}
        onClick={() => navigate(item.id)}><span><Icon name={item.icon} size={20} /></span>{item.label}</button>)}
      <button type="button" aria-label="More workspace options" aria-haspopup="dialog" aria-controls="workspace-more-menu" aria-expanded={moreOpen}
        className={moreOpen ? 'is-menu-open' : ''} onClick={() => setMoreOpen(true)}><span><Icon name="menu" size={22} /></span>More</button>
    </nav>
    {moreOpen && <MobileMoreMenu user={user} activeFunction={activeFunction} onFunctionSelect={id => { setActiveFunction(id); navigate('overview') }}
      onFacultyProfiles={() => navigate('faculty-profiles')} onClose={() => setMoreOpen(false)} onLogout={onLogout} signingOut={signingOut} error={error} />}
    {detail && <CampusDetails campus={detail} periodLabel={data?.periodLabel ?? null} onClose={() => setDetail(null)} onOverview={id => { setCampusFilter(id); navigate('overview') }} />}
  </div>
}
