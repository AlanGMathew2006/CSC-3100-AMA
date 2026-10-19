import { useMemo, useState } from "react";
import type { MenuCombo, MenuItem } from "@csc-3100-ama/shared";
import { useAuth } from "../../auth";
import {
  BottomNav,
  type AppTab
} from "../../components/BottomNav";
import { BrandHeader } from "../../components/BrandHeader";
import { useMenu } from "../../hooks/useMenu";

const money = (amount: number) => `$${amount.toFixed(2)}`;

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );

// "Subway (Kennedy Library)" -> "Kennedy Library"
const areaOf = (
  locationName: string,
  campusArea: string | null
) => campusArea ?? locationName.replace(/^.*\((.*)\)$/, "$1");

function priceLabel(item: MenuItem): {
  text: string;
  muted: boolean;
} {
  if (item.offerings.length === 0) {
    return item.meal_component
      ? { text: "Combo only", muted: true }
      : { text: "Price unavailable", muted: true };
  }
  const prices = item.offerings.map((o) => o.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return {
    text:
      low === high
        ? money(low)
        : `${money(low)}–${money(high)}`,
    muted: false
  };
}

// Per-location prices, only worth showing when they differ between locations.
function locationPrices(item: MenuItem): string | null {
  if (new Set(item.offerings.map((o) => o.price)).size < 2)
    return null;
  return item.offerings
    .map(
      (o) =>
        `${areaOf(o.location_name, o.campus_area)} ${money(o.price)}`
    )
    .join(" · ");
}

function groupByCategory(
  items: MenuItem[]
): [string, MenuItem[]][] {
  const groups = new Map<string, MenuItem[]>();
  for (const item of items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }
  return [...groups.entries()];
}

function MenuItemCard({
  item,
  showRestaurant
}: {
  item: MenuItem;
  showRestaurant: boolean;
}) {
  const price = priceLabel(item);
  const byLocation = locationPrices(item);
  return (
    <li className="menu-item">
      <div className="menu-item-top">
        <div>
          {showRestaurant && (
            <span className="meal-label">
              {item.restaurant}
            </span>
          )}
          <h3>{item.name}</h3>
          {item.serving && (
            <span className="menu-serving">{item.serving}</span>
          )}
          {byLocation && (
            <span className="menu-serving">{byLocation}</span>
          )}
        </div>
        <span
          className={`menu-price${price.muted ? " menu-price--muted" : ""}`}>
          {price.text}
        </span>
      </div>
      <div className="meal-meta">
        <span>
          {item.calories == null
            ? "– kcal"
            : `${item.calories} kcal`}
        </span>
        <span>
          <span className="legend-dot legend-dot--protein" />{" "}
          {item.protein_g ?? "–"}g protein
        </span>
        <span>
          <span className="legend-dot legend-dot--carbs" />{" "}
          {item.carbs_g ?? "–"}g carbs
        </span>
        <span>
          <span className="legend-dot legend-dot--fat" />{" "}
          {item.fat_g ?? "–"}g fat
        </span>
      </div>
    </li>
  );
}

function ComboList({ combos }: { combos: MenuCombo[] }) {
  if (combos.length === 0) return null;
  return (
    <section className="menu-section">
      <div className="section-header">Combos & Meals</div>
      <ul className="menu-list">
        {combos.map((combo) => (
          <li className="menu-item" key={combo.id}>
            <div className="menu-item-top">
              <div>
                <h3>{combo.name}</h3>
                {combo.description && (
                  <span className="menu-serving">
                    {combo.description}
                  </span>
                )}
              </div>
              <span className="menu-price">
                {money(combo.price)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MenuPage({
  onNavigate
}: {
  onNavigate: (tab: AppTab) => void;
}) {
  const { signOut } = useAuth();
  const { menu, loading, error, reload } = useMenu();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [logoutError, setLogoutError] = useState("");

  const restaurants = useMemo(
    () =>
      [
        ...new Set(
          menu?.items.map((item) => item.restaurant) ?? []
        )
      ].sort(),
    [menu]
  );
  const restaurant = selected ?? restaurants[0] ?? null;
  const search = query.trim().toLowerCase();

  // Searching looks across every restaurant; otherwise show the selected one.
  const items = useMemo(() => {
    const all = menu?.items ?? [];
    if (search) {
      return all.filter((item) =>
        `${item.name} ${item.category} ${item.restaurant}`
          .toLowerCase()
          .includes(search)
      );
    }
    return all.filter((item) => item.restaurant === restaurant);
  }, [menu, search, restaurant]);

  const combos = search
    ? []
    : (menu?.combos ?? []).filter(
        (c) => c.restaurant === restaurant
      );
  const latestDate = menu?.items
    .flatMap((item) =>
      item.offerings.map((o) => o.service_date)
    )
    .sort()
    .at(-1);

  async function handleSignOut() {
    setLogoutError("");
    try {
      await signOut();
    } catch {
      setLogoutError("Couldn't log out. Please try again.");
    }
  }

  return (
    <div className="page-shell page-shell--dashboard">
      <BrandHeader />

      <section className="dashboard-shell">
        <header className="menu-header">
          <h1>Campus Menu</h1>
          {latestDate && (
            <p>Prices as of {formatDate(latestDate)}</p>
          )}
        </header>

        {error && (
          <p className="field-helper error" role="alert">
            <span className="alert-icon" aria-hidden="true" />
            {error}{" "}
            <button
              type="button"
              className="link-button"
              onClick={() => void reload()}>
              Retry
            </button>
          </p>
        )}
        {logoutError && (
          <p className="field-helper error" role="alert">
            {logoutError}
          </p>
        )}

        <label className="menu-search">
          <span className="visually-hidden">
            Search the menu
          </span>
          <input
            type="search"
            placeholder="Search all restaurants"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        {!search && restaurants.length > 0 && (
          <div
            className="menu-chips"
            role="tablist"
            aria-label="Restaurants">
            {restaurants.map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={name === restaurant}
                className={`toggle-option menu-chip${name === restaurant ? " toggle-option--active" : ""}`}
                onClick={() => setSelected(name)}>
                {name}
              </button>
            ))}
          </div>
        )}

        {loading && !menu && (
          <p className="menu-empty">Loading menu…</p>
        )}

        {!loading && menu && menu.items.length === 0 && (
          <p className="menu-empty">
            No menu data yet. Run{" "}
            <code>npm run import:menu</code> in
            packages/express-backend.
          </p>
        )}

        {search &&
          items.length === 0 &&
          menu &&
          menu.items.length > 0 && (
            <p className="menu-empty">
              No items match “{query.trim()}”.
            </p>
          )}

        {groupByCategory(items).map(([category, list]) => (
          <section className="menu-section" key={category}>
            <div className="section-header">{category}</div>
            <ul className="menu-list">
              {list.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  showRestaurant={Boolean(search)}
                />
              ))}
            </ul>
          </section>
        ))}

        <ComboList combos={combos} />

        <BottomNav
          active="explore"
          onNavigate={onNavigate}
          onSignOut={() => void handleSignOut()}
        />
      </section>
    </div>
  );
}
