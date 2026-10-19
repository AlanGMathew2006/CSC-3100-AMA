export type AppTab = "home" | "explore";

interface BottomNavProps {
  active: AppTab;
  onNavigate: (tab: AppTab) => void;
  onSignOut: () => void;
}

export function BottomNav({
  active,
  onNavigate,
  onSignOut
}: BottomNavProps) {
  const item = (tab: AppTab, label: string) => (
    <button
      type="button"
      className={`nav-item${active === tab ? " nav-item--active" : ""}`}
      aria-current={active === tab ? "page" : undefined}
      onClick={() => onNavigate(tab)}>
      {label}
    </button>
  );

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {item("home", "Home")}
      {item("explore", "Explore")}
      <button type="button" className="nav-item">
        Saved
      </button>
      <button
        type="button"
        className="nav-item"
        onClick={onSignOut}>
        Log out
      </button>
    </nav>
  );
}
