import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { ApiError, auth, type President } from './api'
import PulseWordmark from './components/PulseWordmark'

const PresidentDashboard = lazy(() => import('./modules/president/PresidentDashboard'))

type IconName = 'arrow' | 'lock' | 'eye' | 'eye-off' | 'logout'

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths = {
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    'eye-off': <><path d="m3 3 18 18M10.6 5.1 12 5c6.5 0 10 7 10 7a22 22 0 0 1-3.1 4M6.3 6.3A23 23 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.7-1.6M10 10a3 3 0 0 0 4 4" /></>,
    logout: <><path d="M9 4H5v16h4M12 12h9m-4-4 4 4-4 4" /></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

export default function App() {
  const [user, setUser] = useState<President | null>(null)
  const [checking, setChecking] = useState(true)
  const [opened, setOpened] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [entryHeight, setEntryHeight] = useState<number | null>(null)
  const sealButton = useRef<HTMLButtonElement>(null)
  const passcodeInput = useRef<HTMLInputElement>(null)

  const handleSessionExpired = useCallback(() => {
    setUser(null)
    setPasscode('')
    setOpened(false)
    setVisible(false)
    setBusy(false)
    setError('')
    setNotice('Your session has expired. Enter your presidential passcode to continue.')
  }, [])

  useEffect(() => {
    let active = true
    auth.session()
      .then(({ user }) => { if (active) setUser(user) })
      .catch((error: unknown) => {
        if (active && (!(error instanceof ApiError) || error.status !== 401)) {
          setNotice('The presidential service is temporarily unavailable. Please try again shortly.')
        }
      })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (user) return
    const viewport = window.visualViewport
    const updateHeight = () => {
      // Phone keyboards can resize only the visible viewport, leaving svh unchanged.
      // Leave pinch zoom to the browser rather than rearranging a zoomed page.
      if (viewport && Math.abs(viewport.scale - 1) > .01) return
      setEntryHeight(Math.round(viewport?.height ?? window.innerHeight))
    }
    updateHeight()
    viewport?.addEventListener('resize', updateHeight)
    window.addEventListener('resize', updateHeight)
    return () => {
      viewport?.removeEventListener('resize', updateHeight)
      window.removeEventListener('resize', updateHeight)
    }
  }, [user])

  useEffect(() => {
    if (!opened || user) return
    // Wait for the compact layout before bringing the field and its actions into view.
    const frame = requestAnimationFrame(() => {
      passcodeInput.current?.closest('form')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [opened, user, entryHeight, error, notice])

  function closePasscode() {
    if (busy) return
    setOpened(false)
    setPasscode('')
    setVisible(false)
    setError('')
    sealButton.current?.focus({ preventScroll: true })
  }

  function handleSealClick() {
    if (opened) {
      closePasscode()
      return
    }
    // Mount and focus within the tap event so phone keyboards open immediately.
    flushSync(() => setOpened(true))
    passcodeInput.current?.focus()
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || checking || passcode.length === 0) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await auth.login(passcode)
      setUser(result.user)
      setPasscode('')
      setVisible(false)
      setOpened(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to unlock PULSE. Please try again.')
      passcodeInput.current?.focus()
      passcodeInput.current?.select()
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await auth.logout()
      setUser(null)
      setOpened(false)
      setPasscode('')
      setVisible(false)
      setNotice('')
      setAnnouncement('You have been securely signed out.')
      requestAnimationFrame(() => sealButton.current?.focus({ preventScroll: true }))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to sign out. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (user) {
    return <Suspense fallback={<main className="presidential-entry" style={{ display: 'grid', placeItems: 'center' }}><p role="status">Opening your presidential workspace...</p></main>}>
      <PresidentDashboard user={user} onLogout={handleLogout} signingOut={busy} error={error} onSessionExpired={handleSessionExpired} />
    </Suspense>
  }

  return (
    <main className="presidential-entry" aria-label="PULSE presidential portal"
      style={entryHeight === null ? undefined : { '--entry-height': `${entryHeight}px` } as CSSProperties}>
      <div className={'gateway' + (opened ? ' is-open' : '')
        + (entryHeight !== null && entryHeight < 600 ? ' is-compact' : '')
        + (entryHeight !== null && entryHeight < 360 ? ' is-short' : '')}>
        <div className="identity">
          <h1 title="Presidential Unified Leadership, Statistics, and Evaluation"><PulseWordmark /></h1>
          <p className="identity-description">Presidential Unified Leadership, Statistics, and Evaluation</p>
          <p className="identity-tagline">one university. one vision. real-time insights.</p>
        </div>

        <div className="seal-stage">
          <div className="seal-aura" aria-hidden="true" />
            <button ref={sealButton} className="seal-button" type="button"
              onClick={handleSealClick} disabled={busy}
              aria-label={opened ? 'Close passcode entry' : 'Enter presidential passcode'}
              aria-expanded={opened} aria-controls="presidential-access"
              aria-describedby={!opened ? 'seal-hint' : undefined}>
              <img className="university-seal" src="/sksu-seal.webp"
                alt="Sultan Kudarat State University seal" width="216" height="216" />
            </button>
        </div>

        <div className="access-stage" id="presidential-access">
          {opened ? (
            <form className={'passcode-reveal' + (error ? ' has-error' : '')}
              onSubmit={handleLogin} aria-busy={busy}
              onKeyDown={event => { if (event.key === 'Escape') closePasscode() }}>
              <label className="passcode-label" htmlFor="passcode">Presidential passcode</label>
              <div className="passcode-field">
                <span className="field-lock"><Icon name="lock" size={18} /></span>
                <input ref={passcodeInput} id="passcode" name="passcode"
                  type={visible ? 'text' : 'password'} autoComplete="current-password"
                  autoCapitalize="none" spellCheck={false} placeholder="Enter your passcode"
                  value={passcode} onChange={event => { setPasscode(event.target.value); if (error) setError('') }}
                  required maxLength={1024} readOnly={busy}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'passcode-error' : notice ? 'passcode-notice' : undefined} />
                <button className="visibility-button" type="button"
                  aria-label={visible ? 'Hide passcode' : 'Show passcode'} aria-pressed={visible}
                  onClick={() => setVisible(!visible)} disabled={busy}>
                  <Icon name={visible ? 'eye-off' : 'eye'} size={18} />
                </button>
                <button className="unlock-button" type="submit" disabled={busy || checking}
                  aria-label={checking ? 'Checking your session' : busy ? 'Verifying passcode' : 'Unlock PULSE'}>
                  {busy || checking ? <span className="button-spinner" /> : <Icon name="arrow" size={20} />}
                </button>
              </div>
              {notice && <p className="access-message" id="passcode-notice" role="status">{notice}</p>}
              {error && <p className="access-message is-error" id="passcode-error" role="alert">{error}</p>}
              <div className="passcode-actions">
                <span><Icon name="lock" size={11} />Private presidential access</span>
                <button className="quiet-button" type="button" onClick={closePasscode} disabled={busy}>Cancel</button>
              </div>
            </form>
          ) : (
            <p className="entry-hint" id="seal-hint">select the seal to enter</p>
          )}
        </div>
      </div>
      <span className="sr-only" role="status">{announcement}</span>
    </main>
  )
}
