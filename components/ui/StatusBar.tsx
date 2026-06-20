// The app runs as an installed PWA inside the phone shell, which already shows
// the real clock and battery in the OS status bar. Rendering our own would just
// duplicate it, so this is now only a small top spacer that respects the safe area.
export function StatusBar() {
  return <div className="pt-[env(safe-area-inset-top)]" aria-hidden />;
}
