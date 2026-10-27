import { useId, useMemo, useState } from "react";

// The search field on /games and /creators. The text lives in the address (?q=...) so a search
// can be shared, and typing filters the list that's already loaded: nothing is sent to the API.
// `suggestions` are the game names and creators on the page; the ones matching what you've typed
// drop down under the field (arrow keys and Enter, or a tap, fill it in).
export default function SearchBox({ value, onChange, label, placeholder, suggestions = [] }: {
  value: string; onChange: (q: string) => void; label: string; placeholder: string; suggestions?: string[];
}) {
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();

  const options = useMemo(() => {
    const typed = value.trim().toLowerCase();
    if (!typed) return [];
    const unique = [...new Set(suggestions)].filter((s) => s.toLowerCase().includes(typed) && s.toLowerCase() !== typed);
    // Names that start with what you typed come first.
    return unique.sort((a, b) => Number(b.toLowerCase().startsWith(typed)) - Number(a.toLowerCase().startsWith(typed))).slice(0, 6);
  }, [value, suggestions]);
  const open = focused && options.length > 0;

  function pick(text: string) {
    onChange(text);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      if (open) setFocused(false); else onChange("");
    } else if (e.key === "ArrowDown" && options.length) {
      e.preventDefault();
      setFocused(true);
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp" && options.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
    } else if (e.key === "Enter" && open && active >= 0) {
      e.preventDefault();
      pick(options[active]);
    }
  }

  const bold = (text: string) => {
    const at = text.toLowerCase().indexOf(value.trim().toLowerCase());
    if (at < 0) return text;
    const end = at + value.trim().length;
    return <>{text.slice(0, at)}<mark>{text.slice(at, end)}</mark>{text.slice(end)}</>;
  };

  return (
    <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input
        type="search"
        value={value}
        onChange={(e) => { onChange(e.target.value); setActive(-1); setFocused(true); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={label}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        maxLength={80}
        autoComplete="off"
        spellCheck={false}
      />
      {value && <button type="button" className="link search-clear" aria-label="Clear search" onClick={() => onChange("")}>✕</button>}
      {open && (
        <ul className="suggestions" id={listId} role="listbox">
          {options.map((o, i) => (
            // onMouseDown, not onClick: the field loses focus (and the list closes) before a click lands.
            <li key={o} id={`${listId}-${i}`} role="option" aria-selected={i === active} className={i === active ? "on" : undefined}
              onMouseDown={(e) => { e.preventDefault(); pick(o); }}>
              {bold(o)}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

/** Every word you typed must appear somewhere in the game's text (case doesn't matter). */
export function matches(query: string, ...fields: string[]) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = fields.join(" ").toLowerCase();
  return words.every((w) => text.includes(w));
}

export const queryFromUrl = () => (new URLSearchParams(location.search).get("q") ?? "").slice(0, 80);

/** Write ?q= (and ?page=) into the address without adding a history entry per keystroke. */
export function urlFor(path: string, q: string, page = 1) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q);
  // The /games filters (src/features/catalog/filters.tsx) stay in the address while searching and paging.
  const now = new URLSearchParams(location.search);
  for (const key of ["rating", "sort"]) if (now.get(key)) params.set(key, now.get(key)!);
  if (page > 1) params.set("page", String(page));
  const s = params.toString();
  return s ? `${path}?${s}` : path;
}
