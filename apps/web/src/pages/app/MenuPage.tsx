import { useMemo, useState } from "react";
import type { MenuItem } from "@csc-3100-ama/shared";
import { BottomNav, type AppTab } from "../../components/BottomNav";
import { BrandHeader } from "../../components/BrandHeader";
import { MealCard, mealPrice } from "../../components/MealCard";
import { useMenu } from "../../hooks/useMenu";
import { useSavedMeals } from "../../hooks/useSavedMeals";

const FILTERS = ["Location", "Price", "Protein", "Calories", "Dietary"] as const;
type Filter = (typeof FILTERS)[number];

export function MenuPage({
  onNavigate,
  onSelectMeal,
  onToast,
}: {
  onNavigate: (tab: AppTab) => void;
  onSelectMeal: (item: MenuItem) => void;
  onToast: (message: string) => void;
}) {
  const { menu, loading, error, reload } = useMenu();
  const saved = useSavedMeals();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("Location");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSelection, setFilterSelection] = useState("");
  const search = query.trim().toLowerCase();

  const locations = useMemo(() => {
    const byId = new Map<string, string>();
    for (const item of menu?.items ?? []) {
      for (const offering of item.offerings) {
        byId.set(offering.location_id, offering.campus_area ?? offering.location_name);
      }
    }
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [menu]);
  const items = useMemo(() => {
    const filtered = (menu?.items ?? []).filter((item) => {
      const matchesSearch = `${item.name} ${item.category} ${item.restaurant}`
        .toLowerCase()
        .includes(search);
      if (!matchesSearch) return false;
      if (!filterSelection) return true;
      if (filterSelection.startsWith("location:")) {
        return item.offerings.some(
          (offering) => offering.location_id === filterSelection.slice("location:".length),
        );
      }
      if (filterSelection === "price:10") return (mealPrice(item) ?? Infinity) < 10;
      if (filterSelection === "price:12") return (mealPrice(item) ?? Infinity) <= 12;
      if (filterSelection === "protein:20") return (item.protein_g ?? 0) >= 20;
      if (filterSelection === "protein:30") return (item.protein_g ?? 0) >= 30;
      if (filterSelection === "calories:500") return (item.calories ?? Infinity) <= 500;
      if (filterSelection === "calories:600") return (item.calories ?? Infinity) <= 600;
      if (filterSelection.startsWith("diet:")) {
        const diet = filterSelection.slice("diet:".length);
        return item.tags?.some((tag) =>
          tag.toLowerCase().replace(/_/g, "-").includes(diet),
        ) ?? false;
      }
      return true;
    });
    return filtered.sort((a, b) => {
      if (filter === "Price") return (mealPrice(a) ?? Infinity) - (mealPrice(b) ?? Infinity);
      if (filter === "Protein") return (b.protein_g ?? -1) - (a.protein_g ?? -1);
      if (filter === "Calories") return (a.calories ?? Infinity) - (b.calories ?? Infinity);
      if (filter === "Dietary") {
        const score = (item: MenuItem) =>
          /tofu|vegan|vegetarian|veggie|salad/i.test(`${item.name} ${item.category}`) ? 1 : 0;
        return score(b) - score(a);
      }
      return a.restaurant.localeCompare(b.restaurant);
    });
  }, [filter, filterSelection, menu, search]);

  const filterOptions = useMemo(() => {
    if (filter === "Location") {
      return [
        ["", "All locations"],
        ...locations.map(([id, label]) => [`location:${id}`, label]),
      ];
    }
    if (filter === "Price") return [["", "Any price"], ["price:10", "Under $10"], ["price:12", "Under $12"]];
    if (filter === "Protein") return [["", "Any protein"], ["protein:20", "20g or more"], ["protein:30", "30g or more"]];
    if (filter === "Calories") return [["", "Any calories"], ["calories:500", "500 or fewer"], ["calories:600", "600 or fewer"]];
    return [["", "Any diet"], ["diet:vegetarian", "Vegetarian"], ["diet:vegan", "Vegan"], ["diet:gluten-free", "Gluten-free"]];
  }, [filter, locations]);

  async function handleToggle(item: MenuItem) {
    const result = await saved.toggle(item.id);
    if (result !== null) {
      onToast(result ? "Meal saved to your plans" : "Meal removed from saved plans");
    } else {
      onToast("Couldn't update saved meals");
    }
  }

  return (
    <div className="page-shell page-shell--dashboard">
      <BrandHeader />
      <main className="app-content explore-content">
        <h1>Explore Meals</h1>
        {error && (
          <p className="field-helper error" role="alert">
            {error}{" "}
            <button type="button" className="link-button" onClick={() => void reload()}>
              Retry
            </button>
          </p>
        )}
        {saved.error && <p className="field-helper error" role="alert">{saved.error}</p>}

        <label className="explore-search">
          <img src="/assets/figma/search.svg" alt="" aria-hidden="true" />
          <span className="visually-hidden">Search meals or locations</span>
          <input
            type="search"
            placeholder="Search meals or locations"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="explore-filters" role="group" aria-label="Sort meals">
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              className={`choice-chip${filter === option ? " choice-chip--selected" : ""}`}
              aria-pressed={filter === option}
              onClick={() => {
                if (filter !== option) setFilterSelection("");
                setFilter(option);
                setFilterOpen(filter === option ? !filterOpen : true);
              }}
            >
              {option}
            </button>
          ))}
        </div>
        {filterOpen && (
          <label className="filter-select-wrap">
            <span className="visually-hidden">Choose a {filter.toLowerCase()} filter</span>
            <select
              value={filterSelection}
              onChange={(event) => setFilterSelection(event.target.value)}
            >
              {filterOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        )}

        {loading && !menu ? (
          <p className="field-helper success" role="status">Loading meals…</p>
        ) : items.length ? (
          <ul className="explore-meal-list">
            {items.map((item) => (
              <li key={item.id}>
                <MealCard
                  item={item}
                  saved={saved.isSaved(item.id)}
                  onSelect={() => onSelectMeal(item)}
                  onToggleSaved={() => void handleToggle(item)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-card">
            {search ? `No meals match “${query.trim()}”.` : "No meals are available right now."}
          </p>
        )}

        {menu && menu.combos.length > 0 && (
          <section className="combo-section">
            <h2>Combos &amp; Meals</h2>
            {menu.combos.map((combo) => (
              <article className="combo-card" key={combo.id}>
                <div>
                  <span className="meal-label">{combo.restaurant}</span>
                  <strong>{combo.name}</strong>
                  {combo.description && <span>{combo.description}</span>}
                </div>
                <b>${combo.price.toFixed(2)}</b>
              </article>
            ))}
          </section>
        )}
      </main>
      <BottomNav active="explore" onNavigate={onNavigate} />
    </div>
  );
}
