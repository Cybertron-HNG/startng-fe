import type { CrewSummary } from "../crews/api";

/** "Everyone | Lagos Cousins | ..." above a board. `scope` is "all" or "crew:<id>". Nothing when there are no crews. */
export default function ScopeTabs({ crews, scope, onChange }: { crews: CrewSummary[]; scope: string; onChange: (scope: string) => void }) {
  if (crews.length === 0) return null;
  return (
    <div className="segmented scope-tabs" role="group" aria-label="Whose scores">
      <button type="button" className={scope === "all" ? "on" : ""} aria-pressed={scope === "all"} onClick={() => onChange("all")}>Everyone</button>
      {crews.map((c) => (
        <button key={c.id} type="button" className={scope === `crew:${c.id}` ? "on" : ""} aria-pressed={scope === `crew:${c.id}`} onClick={() => onChange(`crew:${c.id}`)}>{c.name}</button>
      ))}
    </div>
  );
}
