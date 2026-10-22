export type AppTab = "home" | "explore" | "saved" | "profile";

interface BottomNavProps {
  active: AppTab;
  onNavigate: (tab: AppTab) => void;
}

export function BottomNav({
  active,
  onNavigate,
}: BottomNavProps) {
  const item = (tab: AppTab, label: string, icon: string) => (
    <button
      type="button"
      className={`nav-item${active === tab ? " nav-item--active" : ""}`}
      aria-current={active === tab ? "page" : undefined}
      onClick={() => onNavigate(tab)}
    >
      <img src={icon} alt="" aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {item("home", "Home", "/assets/figma/nav-home.svg")}
      {item("explore", "Explore", "/assets/figma/nav-explore.svg")}
      {item("saved", "Saved", "/assets/figma/nav-saved.svg")}
      {item("profile", "Profile", "/assets/figma/nav-profile.svg")}
    </nav>
  );
}
