import { useState } from 'react'
import type { AcademicCounts } from './academics'
import { number, type Campus } from './data'
import Icon from './DashboardIcon'

export default function AcademicBreakdown({ data, campuses, campusId }: { data: AcademicCounts; campuses: Campus[]; campusId?: string }) {
  const [level, setLevel] = useState<'campus' | 'college' | 'program'>('campus')
  const [showZero, setShowZero] = useState(false)
  if (data.status !== 'connected' || !data.term) return null
  const campusName = (id: string) => campuses.find(campus => campus.id === id)?.name ?? id
  const collegeName = (id: number) => data.colleges.find(college => college.id === id)?.code || data.colleges.find(college => college.id === id)?.name || '—'
  const rows = level === 'campus'
    ? campuses.filter(campus => !campusId || campus.id === campusId).map(campus => ({ key: campus.id, name: campus.name, campus: campus.name, college: '', faculty: data.faculty.byCampus[campus.id], students: data.students.byCampus[campus.id] }))
    : level === 'college'
      ? data.colleges.filter(college => !campusId || college.campusId === campusId).map(college => ({ key: String(college.id), name: college.name, campus: campusName(college.campusId), college: '', faculty: college.faculty, students: college.students }))
      : data.programs.filter(program => !campusId || program.campusId === campusId).map(program => ({ key: String(program.id), name: `${program.code ? program.code + ' · ' : ''}${program.name}${program.major ? ' — ' + program.major : ''}`, campus: campusName(program.campusId), college: collegeName(program.collegeId), faculty: null, students: program.students }))
  const visibleRows = rows.filter(row => showZero || (row.faculty ?? 0) > 0 || (row.students ?? 0) > 0)
  return <details className="pd-academic-breakdown">
    <summary><div><span className="pd-kicker">CURRENT ACADEMIC TERM</span><h2>Faculty & enrollment breakdown</h2><p>{data.term.academicYear} · {data.term.semesterLabel}</p></div><Icon name="chevron" size={20} /></summary>
    <div className="pd-academic-content">
      <div className="pd-academic-controls"><div className="pd-segmented" aria-label="Academic breakdown level">{(['campus', 'college', 'program'] as const).map(value => <button key={value} type="button" aria-pressed={level === value} onClick={() => setLevel(value)}>{value === 'campus' ? 'By campus' : value === 'college' ? 'By college' : 'By program'}</button>)}</div><label><input type="checkbox" checked={showZero} onChange={event => setShowZero(event.target.checked)} />Show units with zero counts</label></div>
      <div className="pd-academic-table-wrap" tabIndex={0} role="region" aria-label="Academic headcount table"><table className="pd-academic-table">
        <caption className="sr-only">{data.term.academicYear}, {data.term.semesterLabel}: distinct faculty and enrolled student names, by {level}.</caption>
        <thead><tr><th scope="col">{level === 'campus' ? 'Campus' : level === 'college' ? 'College' : 'Program'}</th>{level === 'program' && <th scope="col">College</th>}{level !== 'campus' && <th scope="col">Campus</th>}{level !== 'program' && <th scope="col">Faculty members</th>}<th scope="col">Enrolled students</th></tr></thead>
        <tbody>{visibleRows.length ? visibleRows.map(row => <tr key={row.key}><th scope="row">{row.name}</th>{level === 'program' && <td>{row.college}</td>}{level !== 'campus' && <td>{row.campus}</td>}{level !== 'program' && <td className="pd-count-cell">{number(row.faculty)}</td>}<td className="pd-count-cell">{number(row.students)}</td></tr>) : <tr><td colSpan={level === 'campus' ? 3 : 4}>No recorded headcounts in this view.</td></tr>}</tbody>
      </table></div>
      <p className="pd-academic-note">Faculty counts use active college roster entries; student counts use active imported class lists for the administrator’s current term. Each faculty ID and complete normalized student name is counted once per view. People listed in multiple units can appear in multiple rows, so row counts should not be added to calculate the university total.</p>
      {data.quality.studentNamesWithMultipleIds > 0 && <p className="pd-academic-note">{number(data.quality.studentNamesWithMultipleIds)} recorded names appear under multiple student IDs. They are counted once per view under the name-based counting rule.</p>}
    </div>
  </details>
}
