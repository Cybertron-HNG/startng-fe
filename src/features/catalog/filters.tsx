import { useCallback, useState } from "react";
import type { Game } from "../../games";
import { useCatalog } from "./api";
import { useFeature } from "../flags";

// The filters on /games (PRD T1): a minimum rating and a sort, combined with the search box and kept in the address
// (?rating=4&sort=top), so a filtered list can be shared. Categories are picked from "Browse by category" (the tags
// feature), not here: the old single category field is set on almost no game, so its chips gave wrong results.

export type Sort = "new" | "popular" | "top";
export const SORTS: { key: Sort; label: string }[] = [
  { key: "new", label: "New" },
  { key: "popular", label: "Popular" },
  { key: "top", label: "Top rated" },
];
export const FILTER_PARAMS = ["category", "rating", "sort"]; // "category" only so old links lose it

type State = { rating: number; sort: Sort };

function fromUrl(): State {
  const p = new URLSearchParams(location.search);
  const rating = Number.parseInt(p.get("rating") ?? "0", 10);
  const sort = p.get("sort");
  return {
    rating: rating >= 1 && rating <= 5 ? rating : 0,
    sort: sort === "popular" || sort === "top" ? sort : "new",
  };
}

function writeUrl(s: State) {
  const p = new URLSearchParams(location.search);
  FILTER_PARAMS.forEach((k) => p.delete(k));
  p.delete("page"); // a new filter starts again from the first page
  if (s.rating) p.set("rating", String(s.rating));
  if (s.sort !== "new") p.set("sort", s.sort);
  const q = p.toString();
  history.replaceState(null, "", q ? `${location.pathname}?${q}` : location.pathname);
}

/** The /games filters: the state (from the address), a function that narrows and orders a list of games, and the bar. */
export function useGameFilters(onChange: () => void) {
  const on = useFeature("catalog");
  const { catalog, byGame } = useCatalog();
  const [state, setState] = useState<State>(fromUrl);

  const set = useCallback((changes: Partial<State>) => {
    setState((cur) => {
      const next = { ...cur, ...changes };
      writeUrl(next);
      return next;
    });
    onChange();
  }, [onChange]);
  const reset = () => set({ rating: 0, sort: "new" });
  const active = on && (state.rating > 0 || state.sort !== "new");

  /** The games that match, ordered. The Hangout (no rating) stays first unless a filter excludes it. */
  function apply(games: Game[]): Game[] {
    if (!on || !active) return games;
    let out = games;
    if (state.rating) out = out.filter((g) => (byGame.get(g.slug)?.rating_avg ?? 0) >= state.rating);
    if (state.sort === "popular") out = [...out].sort((a, b) => b.plays - a.plays);
    if (state.sort === "top") out = [...out].sort((a, b) => (byGame.get(b.slug)?.score ?? 0) - (byGame.get(a.slug)?.score ?? 0));
    return out;
  }

  return { state, active, apply, reset, set, catalog };
}

/** The bar itself: minimum rating and sort. Give it what useGameFilters returned. */
export function FilterBar({ filters }: { filters: ReturnType<typeof useGameFilters> }) {
  const { state, active, set, reset, catalog } = filters;
  if (!catalog) return null;
  return (
    <div className="filter-bar">
      <label>
        Rating{" "}
        <select value={state.rating} onChange={(e) => set({ rating: Number(e.target.value) })}>
          <option value={0}>Any</option>
          {[4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}+ stars</option>)}
        </select>
      </label>
      <label>
        Sort{" "}
        <select value={state.sort} onChange={(e) => set({ sort: e.target.value as Sort })}>
          {SORTS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
        </select>
      </label>
      {active && <button type="button" className="link" onClick={reset}>Clear filters</button>}
    </div>
  );
}
