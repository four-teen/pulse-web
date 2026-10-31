import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/modules/president/academics.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
const { parseAcademicCounts } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const ids = ['access', 'isulan', 'tacurong', 'kalamansig', 'lutayan', 'palimbang', 'bagumbayan']
function counts() {
  return {
    status: 'connected', term: { academicYearId: 2, academicYear: '2026-2027', semester: 1, semesterLabel: '1st Semester', key: '2026-2027:1' },
    retrievedAt: '2026-11-01T00:00:00Z', studentBasis: 'active_class_lists',
    faculty: { total: 1, byCampus: Object.fromEntries(ids.map(id => [id, ['access', 'isulan'].includes(id) ? 1 : 0])) },
    students: { total: 2, byCampus: Object.fromEntries(ids.map(id => [id, id === 'isulan' ? 2 : 0])) },
    colleges: [{ id: 1, name: 'College', code: 'C', campusId: 'isulan', faculty: 1, students: 2 },
      { id: 2, name: 'Other College', code: 'O', campusId: 'access', faculty: 1, students: 0 }],
    programs: [{ id: 10, name: 'Program', code: 'P', major: '', collegeId: 1, campusId: 'isulan', students: 2 }],
    quality: { facultyWithMultipleColleges: 1, studentNamesWithMultipleIds: 0 },
  }
}
test('academic boundary accepts distinct counts with cross-campus overlap', () => {
  const data = parseAcademicCounts(counts())
  assert.equal(data.faculty.total, 1)
  assert.equal(data.faculty.byCampus.access + data.faculty.byCampus.isulan, 2)
})
test('academic boundary rejects mismatched terms, wrong enrollment source, and invalid hierarchy', () => {
  for (const mutate of [
    data => { data.term.semester = 2 },
    data => { data.term.academicYear = '2026-2028' },
    data => { data.studentBasis = 'approved_enrollments' },
    data => { data.students.total = -1 },
    data => { delete data.faculty.byCampus.access },
    data => { data.colleges.push(data.colleges[0]) },
    data => { data.programs[0].campusId = 'access' },
    data => { data.programs[0].collegeId = 999 },
    data => { data.programs[0].students = 3 },
    data => { data.faculty.byCampus.isulan = 2 },
  ]) {
    const data = counts()
    mutate(data)
    assert.throws(() => parseAcademicCounts(data), /Invalid/)
  }
})
test('unavailable academic counts cannot masquerade as confirmed zero or retain a stale term', () => {
  const data = { ...counts(), status: 'unavailable', term: null, retrievedAt: null, colleges: [], programs: [],
    faculty: { total: null, byCampus: Object.fromEntries(ids.map(id => [id, null])) },
    students: { total: null, byCampus: Object.fromEntries(ids.map(id => [id, null])) } }
  assert.equal(parseAcademicCounts(data).students.total, null)
  data.students.total = 0
  assert.throws(() => parseAcademicCounts(data), /Invalid/)
})
