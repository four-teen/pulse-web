export type AcademicCounts = {
  status: 'connected' | 'disabled' | 'unavailable'
  term: { academicYearId: number; academicYear: string; semester: number; semesterLabel: string; key: string } | null
  retrievedAt: string | null
  studentBasis: 'active_class_lists'
  faculty: { total: number | null; byCampus: Record<string, number | null> }
  students: { total: number | null; byCampus: Record<string, number | null> }
  colleges: { id: number; name: string; code: string; campusId: string; faculty: number; students: number }[]
  programs: { id: number; name: string; code: string; major: string; collegeId: number; campusId: string; students: number }[]
  quality: { facultyWithMultipleColleges: number; studentNamesWithMultipleIds: number }
}

const campusIds = ['access', 'isulan', 'tacurong', 'kalamansig', 'lutayan', 'palimbang', 'bagumbayan']
const count = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1000000000
const text = (value: unknown): value is string => typeof value === 'string' && value.length <= 500
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid academic counts.')
  return value as Record<string, unknown>
}

export function parseAcademicCounts(input: unknown): AcademicCounts {
  const data = object(input)
  if (!['connected', 'disabled', 'unavailable'].includes(String(data.status))
    || data.studentBasis !== 'active_class_lists'
    || !(data.retrievedAt === null || typeof data.retrievedAt === 'string' && Number.isFinite(Date.parse(data.retrievedAt)))
    || !Array.isArray(data.colleges) || !Array.isArray(data.programs)) throw new Error('Invalid academic counts.')
  const connected = data.status === 'connected'
  if (connected) {
    const term = object(data.term)
    const match = typeof term.academicYear === 'string' ? /^(\d{4})-(\d{4})$/.exec(term.academicYear) : null
    if (!count(term.academicYearId) || term.academicYearId < 1 || !match || Number(match[2]) !== Number(match[1]) + 1
      || ![1, 2, 3].includes(Number(term.semester)) || typeof term.semester !== 'number'
      || term.key !== `${term.academicYear}:${term.semester}`
      || term.semesterLabel !== ({ 1: '1st Semester', 2: '2nd Semester', 3: 'Midyear' } as Record<number, string>)[term.semester]
      || data.retrievedAt === null) throw new Error('Invalid academic term.')
  } else if (data.term !== null || data.retrievedAt !== null || data.colleges.length || data.programs.length) throw new Error('Invalid unavailable academic counts.')
  for (const key of ['faculty', 'students']) {
    const group = object(data[key])
    const campuses = object(group.byCampus)
    if (Object.keys(campuses).length !== campusIds.length || Object.keys(campuses).some(id => !campusIds.includes(id))) throw new Error('Invalid campus academic counts.')
    if (connected) {
      if (!count(group.total) || Object.values(campuses).some(value => !count(value) || value > (group.total as number))
        || Object.values(campuses).reduce<number>((sum, value) => sum + (value as number), 0) < group.total) throw new Error('Invalid distinct academic totals.')
    } else if (group.total !== null || Object.values(campuses).some(value => value !== null)) throw new Error('Invalid unavailable academic totals.')
  }
  const colleges = new Map<number, Record<string, unknown>>()
  for (const value of data.colleges) {
    const row = object(value)
    if (!count(row.id) || row.id < 1 || colleges.has(row.id) || !text(row.name) || !row.name.trim() || !text(row.code)
      || !campusIds.includes(String(row.campusId)) || !count(row.faculty) || !count(row.students)
      || row.faculty > (object(data.faculty).total as number) || row.students > (object(data.students).total as number)) throw new Error('Invalid college academic counts.')
    colleges.set(row.id, row)
  }
  const programs = new Set<number>()
  for (const value of data.programs) {
    const row = object(value)
    const college = colleges.get(row.collegeId as number)
    if (!count(row.id) || row.id < 1 || programs.has(row.id) || !college || !text(row.name) || !row.name.trim()
      || !text(row.code) || !text(row.major) || row.campusId !== college.campusId || !count(row.students)
      || row.students > (college.students as number)) throw new Error('Invalid program academic counts.')
    programs.add(row.id)
  }
  const quality = object(data.quality)
  if (!count(quality.facultyWithMultipleColleges) || !count(quality.studentNamesWithMultipleIds)) throw new Error('Invalid academic count quality.')
  if (connected) {
    for (const group of ['faculty', 'students'] as const) {
      const totals = object(data[group])
      const campuses = object(totals.byCampus)
      for (const id of campusIds) {
        const rows = [...colleges.values()].filter(row => row.campusId === id)
        const values = rows.map(row => row[group] as number)
        const value = campuses[id] as number
        if (values.some(count => count > value) || values.reduce((sum, count) => sum + count, 0) < value) throw new Error('Inconsistent campus academic counts.')
      }
    }
    for (const college of colleges.values()) {
      const rows = data.programs.map(object).filter(program => program.collegeId === college.id)
      if (rows.reduce((sum, program) => sum + (program.students as number), 0) < (college.students as number)) throw new Error('Inconsistent college student counts.')
    }
  }
  return data as AcademicCounts
}
