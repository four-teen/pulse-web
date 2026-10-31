import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const academicSource = await readFile(new URL('../src/modules/president/academics.ts', import.meta.url), 'utf8')
const academicCompiled = ts.transpileModule(academicSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
const academicModule = `data:text/javascript;base64,${Buffer.from(academicCompiled).toString('base64')}`
const source = (await readFile(new URL('../src/modules/president/data.ts', import.meta.url), 'utf8')).replace("'./academics'", JSON.stringify(academicModule))
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText
const { summarizeCampuses, number, millions, percent, percentage, difference, parseDashboard } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

const ids = ['access', 'isulan', 'tacurong', 'kalamansig', 'lutayan', 'palimbang', 'bagumbayan']
function campus(id) {
  return { id, name: id, mark: id.slice(0, 2), color: '#496e46', tint: '#eaf0e2', students: null, previousStudents: null, faculty: null, programs: null, retention: null, budget: null, utilization: null,
    research: { active: null, completed: null, publications: null, funding: null },
    extension: { active: null, completed: null, communities: null, beneficiaries: null, sessions: null },
    production: { enterprises: null, revenue: null, expenses: null, target: null },
    inventory: { buildings: null, classrooms: null, laboratories: null, assets: null, serviceable: null, value: null } }
}
function payload() {
  return { schemaVersion: 1, generatedAt: '2026-10-30T00:00:00Z', updatedAt: null, dataState: 'awaiting_data', periodLabel: null, periodKey: null, coverage: { availableMetrics: 0, totalMetrics: 182 }, categorySources: { instruction: null, research: null, extension: null, production: null, inventory: null, finance: null }, campuses: ids.map(campus), sources: [
    { id: 'sinq', name: 'SINQ', website: 'https://sinq.sksu-orms.net/', status: 'not_connected', updatedAt: null },
    { id: 'oracle', name: 'Oracle', website: 'https://sksu-oracle.com/', status: 'not_connected', updatedAt: null },
    { id: 'pad', name: 'PAD', website: 'https://pad-web-coral.vercel.app/', status: 'not_connected', updatedAt: null },
  ] }
}

test('faculty summary accepts unknown campus totals and rejects misleading or malformed counts', () => {
  const data = payload()
  data.facultyDirectory = { total: 469, byCampus: Object.fromEntries(ids.map(id => [id, null])), retrievedAt: '2026-11-01T00:00:00Z' }
  assert.equal(parseDashboard(data).facultyDirectory.total, 469)
  data.facultyDirectory.byCampus = Object.fromEntries(ids.map(id => [id, 0]))
  assert.throws(() => parseDashboard(data), /faculty totals/)
  data.facultyDirectory.total = 0
  assert.equal(parseDashboard(data).facultyDirectory.total, 0)
  data.facultyDirectory.total = -1
  assert.throws(() => parseDashboard(data), /faculty totals/)
  data.facultyDirectory.total = 0
  delete data.facultyDirectory.byCampus.access
  assert.throws(() => parseDashboard(data), /faculty totals/)
})

test('distinct faculty totals allow people serving in multiple campuses without double-counting the university', () => {
  const data = payload()
  data.facultyDirectory = { total: 2, byCampus: Object.fromEntries(ids.map(id => [id, id === 'access' || id === 'isulan' ? 2 : 0])), retrievedAt: '2026-11-01T00:00:00Z' }
  assert.equal(parseDashboard(data).facultyDirectory.total, 2)
  data.facultyDirectory.byCampus.access = 3
  assert.throws(() => parseDashboard(data), /faculty totals/)
})

test('unavailable records remain unknown while reported zero remains zero', () => {
  const record = campus('access')
  assert.equal(summarizeCampuses([record]).students, null)
  assert.equal(summarizeCampuses([]).production.revenue, null)
  assert.equal(number(null), '—')
  assert.equal(millions(null), '—')
  assert.equal(percent(null), '—')
  record.students = 0
  record.production.revenue = 0
  assert.equal(summarizeCampuses([record]).students, 0)
  assert.equal(number(0), '0')
  assert.equal(millions(0), '₱0.0M')
})

test('partial totals do not masquerade as complete university statistics', () => {
  const first = campus('access'), second = campus('isulan')
  first.students = 100
  first.research.active = 5
  assert.equal(summarizeCampuses([first, second]).students, null)
  assert.equal(summarizeCampuses([first, second]).research.active, null)
  assert.equal(summarizeCampuses([first]).students, 100)
  second.students = 200
  first.retention = 90
  second.retention = 60
  assert.equal(summarizeCampuses([first, second]).students, 300)
  assert.equal(summarizeCampuses([first, second]).retention, 70)
})

test('financial calculations handle losses, unknown values and zero denominators', () => {
  assert.equal(difference(100, 200), -100)
  assert.equal(difference(100, null), null)
  assert.equal(percentage(0, 0), null)
  assert.equal(percentage(null, 100), null)
  assert.equal(percentage(0, 100), 0)
})

test('the versioned API contract accepts null metrics and rejects malformed records', () => {
  assert.equal(parseDashboard(payload()).campuses.length, 7)
  for (const mutate of [
    data => { data.schemaVersion = 2 },
    data => { data.campuses[0].students = '100' },
    data => { data.campuses[0].students = NaN },
    data => { data.campuses[0].retention = 101 },
    data => { data.campuses[0].inventory.assets = -1 },
    data => { data.campuses[0].id = 'unknown' },
    data => { data.campuses[1].id = data.campuses[0].id },
    data => { delete data.campuses[0].research.active },
    data => { data.campuses[0].color = 'url(https://untrusted.example)' },
    data => { data.sources[0].website = 'javascript:alert(1)' },
    data => { data.sources[0].status = 'pretend-connected' },
    data => { data.updatedAt = 'not-a-date' },
  ]) {
    const data = payload()
    mutate(data)
    assert.throws(() => parseDashboard(data))
  }
})
