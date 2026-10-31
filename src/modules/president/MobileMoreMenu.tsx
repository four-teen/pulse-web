import { useEffect, useRef } from 'react'
import type { President } from '../../api'
import Icon, { type DashboardIconName } from './DashboardIcon'
import type { FunctionId } from './FourfoldSnapshot'

type Props = {
  user: President
  activeFunction: FunctionId
  onFunctionSelect: (id: FunctionId) => void
  onClose: () => void
  onLogout: () => Promise<void>
  signingOut: boolean
  error: string
}

export default function MobileMoreMenu({ user, activeFunction, onFunctionSelect, onClose, onLogout, signingOut, error }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const shortcuts: { id: FunctionId; label: string; description: string; icon: DashboardIconName }[] = [
    { id: 'instruction', label: 'Instruction', description: 'Students & teaching', icon: 'students' },
    { id: 'research', label: 'Research', description: 'Studies & discovery', icon: 'research' },
    { id: 'extension', label: 'Extension', description: 'Community impact', icon: 'extension' },
    { id: 'production', label: 'Production', description: 'Enterprises & income', icon: 'production' },
  ]

  useEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  return <dialog ref={dialog} id="workspace-more-menu" className="pd-more-sheet"
    aria-labelledby="workspace-more-title" onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
    <div className="pd-sheet-handle" aria-hidden="true" />
    <div className="pd-more-heading"><div><p className="pd-kicker">YOUR PRESIDENTIAL WORKSPACE</p><h2 id="workspace-more-title">More at your fingertips.</h2></div><button type="button" className="pd-icon-button" aria-label="Close more menu" onClick={() => dialog.current?.close()}><Icon name="close" /></button></div>
    <p className="pd-more-description">Jump straight to a university function.</p>
    <div className="pd-more-shortcuts">{shortcuts.map(shortcut => <button key={shortcut.id} type="button"
      aria-label={`View ${shortcut.label.toLowerCase()} overview`} aria-pressed={activeFunction === shortcut.id}
      onClick={() => { dialog.current?.close(); onFunctionSelect(shortcut.id) }}>
      <span className="pd-shortcut-icon"><Icon name={shortcut.icon} size={22} /></span><strong>{shortcut.label}</strong><span>{shortcut.description}</span>
    </button>)}</div>
    <div className="pd-more-profile"><span className="pd-avatar">P</span><div><strong>{user.name || 'Office of the President'}</strong><span>Presidential access</span></div><Icon name="shield" size={20} /></div>
    {error && <p className="pd-error" role="alert">{error}</p>}
    <button type="button" className="pd-more-logout" disabled={signingOut} onClick={() => void onLogout()}><Icon name="logout" size={18} /><span>{signingOut ? 'Signing out...' : 'Sign out securely'}</span><Icon name="chevron" size={16} /></button>
  </dialog>
}
