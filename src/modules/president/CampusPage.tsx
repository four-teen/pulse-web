import { useEffect, useRef } from 'react'
import type { Campus, DashboardData } from './data'
import CampusLogo from './CampusLogo'
import Icon from './DashboardIcon'
import FourfoldSnapshot, { BuildingAssetsSnapshot, type FunctionId } from './FourfoldSnapshot'
import AcademicBreakdown from './AcademicBreakdown'

type Props = {
  campus: Campus | undefined
  data: DashboardData | null
  loading: boolean
  error: string
  selectedFunction: FunctionId
  onFunctionChange: (id: FunctionId) => void
}

export default function CampusPage({ campus, data, loading, error, selectedFunction, onFunctionChange }: Props) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    heading.current?.focus({ preventScroll: true })
  }, [campus?.id])

  const academics = data?.academicCounts
  const showAcademics = selectedFunction === 'overview' || selectedFunction === 'instruction'
  return <section className="pd-campus-page" id="campus-page" tabIndex={-1}
    aria-labelledby="campus-page-title" aria-busy={loading}>
    <div className="pd-campus-page-toolbar">
      <a className="pd-campus-back" href="#campus-network"><Icon name="arrow" size={17} />Back to campuses</a>
      {campus && data && <label className="pd-campus-select pd-campus-page-select"><Icon name="campus" size={17} />
        <span className="sr-only">Choose campus</span>
        <select value={campus.id} onChange={event => { window.location.hash = `/campuses/${event.target.value}` }}>
          {data.campuses.map(item => <option key={item.id} value={item.id}>{item.name} Campus</option>)}
        </select>
      </label>}
    </div>

    {!campus || !data ? <div className="pd-panel pd-campus-page-empty">
      <h1 ref={heading} tabIndex={-1} id="campus-page-title">{loading ? 'Loading campus records…' : error ? 'Campus records unavailable' : 'Campus not found'}</h1>
      <p role={error ? 'alert' : 'status'}>{error || (loading ? 'Your campus view will open shortly.' : 'Return to the directory to choose a campus.')}</p>
    </div> : <>
      <div className="pd-heading-row pd-campus-page-heading">
        <div className="pd-campus-page-identity"><CampusLogo campus={campus} large /><div>
          <p className="pd-kicker">CAMPUS OVERVIEW</p>
          <h1 ref={heading} tabIndex={-1} id="campus-page-title">{campus.name} Campus<span>.</span></h1>
          <p className="pd-heading-description">Instruction, research, extension, and production.</p>
        </div></div>
        {data.periodLabel && <span className="pd-campus-period"><Icon name="calendar" size={15} />{data.periodLabel}</span>}
      </div>

      {error && <p className="pd-records-alert" role="alert"><Icon name="info" size={17} />{error}</p>}
      {!error && data.dataState === 'stale' && <p className="pd-records-notice" role="status"><Icon name="info" size={17} />Showing the latest retrieved figures. A source update is overdue.</p>}

      <FourfoldSnapshot items={[campus]} scopeLabel={`${campus.name} Campus`} idPrefix={`campus-${campus.id}`}
        compact selectedFunction={selectedFunction} onFunctionChange={onFunctionChange}
        facultyCount={academics?.faculty.byCampus[campus.id] ?? null}
        studentCount={academics?.students.byCampus[campus.id] ?? null} />

      {academics?.status === 'unavailable' && <p className="pd-records-alert" role="status"><Icon name="info" size={17} />Current-term academic counts are unavailable. Refresh to try again.</p>}
      {showAcademics && academics?.retrievedAt && <p className="pd-overview-updated">Synk academic counts checked {new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(academics.retrievedAt))}.</p>}
      {showAcademics && academics && <AcademicBreakdown data={academics} campuses={data.campuses} campusId={campus.id} />}

      <section className="pd-campus-page-assets" aria-labelledby="campus-assets-title">
        <div className="pd-section-heading"><div><p className="pd-kicker">CAMPUS RESOURCES</p><h2 id="campus-assets-title">Building inventory & assets</h2><p>Physical resources of {campus.name} Campus.</p></div></div>
        <BuildingAssetsSnapshot items={[campus]} />
      </section>
      <p className="pd-campus-page-note">Figures reflect this campus and the selected reporting period. A dash indicates a value that has not been reported.</p>
    </>}
  </section>
}
