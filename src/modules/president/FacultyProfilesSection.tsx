import { useEffect, useState } from 'react'
import { ApiError, presidentApi } from '../../api'
import Icon from './DashboardIcon'
import type { FacultyProfilePage } from './faculty'

const PAGE_SIZE = 50

function Education({ label, record }: { label: string; record: { degree: string; institution: string; specialization: string; status: string } }) {
  if (!record.degree && !record.institution && !record.specialization && !record.status) return null
  const details = [record.institution, record.specialization].filter(Boolean).join(' · ')
  return <div className="pd-faculty-education-item"><span>{label}</span><strong>{record.degree || record.status || 'Education recorded'}</strong>{details && <small>{details}</small>}</div>
}

export default function FacultyProfilesSection({ onSessionExpired }: { onSessionExpired?: () => void }) {
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [revision, setRevision] = useState(0)
  const [page, setPage] = useState<FacultyProfilePage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      presidentApi.facultyProfiles(search.trim(), offset).then(result => {
        if (active) setPage(result)
      }).catch((failure: unknown) => {
        if (!active) return
        if (failure instanceof ApiError && failure.status === 401) { onSessionExpired?.(); return }
        setError(failure instanceof Error ? failure.message : 'Faculty profiles are unavailable. Please try again.')
      }).finally(() => { if (active) setLoading(false) })
    }, search ? 220 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [search, offset, revision, onSessionExpired])

  const records = page?.facultyProfiles ?? []
  const total = page?.pagination.total ?? 0
  const end = Math.min(offset + records.length, total)
  const start = total === 0 ? 0 : offset + 1
  const unavailable = page?.status === 'disabled'
  const configurationRequired = page?.status === 'configuration_required'
  const awaiting = page?.status === 'awaiting_sync'

  return <section className="pd-faculty-section" id="faculty-profiles" tabIndex={-1} aria-labelledby="faculty-profiles-title">
    <div className="pd-section-heading">
      <div><p className="pd-kicker">{page?.mode === 'local_test' ? 'LOCAL TEST · LOOPBACK ONLY' : 'READ-ONLY SOURCE: SYNK'}</p><h2 id="faculty-profiles-title">Faculty profiles</h2><p>Faculty records synchronized from Synk for viewing in PULSE.</p></div>
      <button className="pd-faculty-refresh" type="button" onClick={() => setRevision(value => value + 1)} disabled={loading} aria-label="Refresh faculty profiles"><Icon name="refresh" size={16} />Refresh</button>
    </div>
    {error && <div className="pd-faculty-message is-error" role="alert"><Icon name="info" size={17} /><span>{error}</span></div>}
    {!error && unavailable && <div className="pd-faculty-message" role="status"><Icon name="info" size={17} /><span>Synk faculty profile sync is not enabled on the PULSE API.</span></div>}
    {!error && configurationRequired && <div className="pd-faculty-message is-error" role="status"><Icon name="info" size={17} /><span>The selected Synk source configuration is incomplete or unavailable in this environment.</span></div>}
    {!error && awaiting && <div className="pd-faculty-message" role="status"><Icon name="info" size={17} /><span>Faculty profiles will appear after an operator completes the first Synk sync.</span></div>}
    <div className="pd-faculty-toolbar">
      <label className="pd-search"><Icon name="search" size={16} /><input type="search" placeholder="Search name, campus, college, or rank" aria-label="Search faculty profiles" value={search} onChange={event => { setSearch(event.target.value); setOffset(0) }} /></label>
      <span className="pd-faculty-count" aria-live="polite">{loading ? 'Loading faculty profiles…' : `${start.toLocaleString('en-PH')}–${end.toLocaleString('en-PH')} of ${total.toLocaleString('en-PH')}`}</span>
    </div>
    {loading && records.length === 0 ? <div className="pd-faculty-empty" role="status">Loading faculty profiles…</div>
      : !loading && records.length === 0 ? <div className="pd-faculty-empty">{search.trim() ? 'No faculty profiles match your search.' : 'No faculty profiles are available yet.'}</div>
        : <div className="pd-faculty-grid">{records.map(profile => <article className="pd-faculty-card" key={profile.id}>
          <div className="pd-faculty-card-heading"><span className="pd-faculty-monogram" aria-hidden="true">{profile.fullName.trim().slice(0, 1).toUpperCase()}</span><div><h3>{profile.fullName}</h3><p>{profile.rank || 'Rank not recorded'}</p></div></div>
          <dl className="pd-faculty-meta"><div><dt>Campus</dt><dd>{profile.campus || 'Not recorded'}</dd></div><div><dt>College</dt><dd>{profile.college || 'Not recorded'}</dd></div></dl>
          <div className="pd-faculty-education"><h4>Education</h4><Education label="Doctoral" record={profile.education.doctoral} /><Education label="Master’s" record={profile.education.master} /><Education label="Bachelor’s" record={profile.education.bachelor} />
            {!Object.values(profile.education).some(item => item.degree || item.institution || item.specialization || item.status) && <p className="pd-faculty-no-education">No education details recorded.</p>}
          </div>
        </article>)}</div>}
    <div className="pd-faculty-pagination"><button type="button" onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={loading || offset === 0}>Previous</button><span>{total ? `Showing ${start.toLocaleString('en-PH')}–${end.toLocaleString('en-PH')}` : 'No records'}</span><button type="button" onClick={() => setOffset(offset + PAGE_SIZE)} disabled={loading || end >= total}>Next</button></div>
    {page?.observedAt && <p className="pd-faculty-updated">Synk data last synchronized {new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(page.observedAt))}.</p>}
  </section>
}
