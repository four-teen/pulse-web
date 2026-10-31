/** Keep the system name consistent wherever it appears in the interface. */
export default function PulseWordmark({ className = '' }: { className?: string }) {
  return <span className={`pulse-wordmark ${className}`.trim()} role="img" aria-label="PULSE">
    <span aria-hidden="true">PULS<span className="pulse-wordmark-accent">E</span></span>
  </span>
}
