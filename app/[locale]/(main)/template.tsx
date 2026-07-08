// A template re-mounts on every navigation (unlike a layout), so this wrapper's
// CSS mount animation plays a quick fade-in on each route change — the kind of
// transition native apps use. Purely presentational; holds no state or data.
//
// Deliberately opacity-only: a `transform` here would make this element the
// containing block for `position: fixed` descendants (e.g. the games "+"
// button) and shift them mid-animation.
export default function MainTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-in">{children}</div>;
}
