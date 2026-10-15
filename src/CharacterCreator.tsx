import { FormEvent, useState } from "react";
import MyGames from "./MyGames";
import Viewer from "./three/Viewer";
import { Body, BOTTOMS, Character, CharacterStyle, HAIR_COLORS, HATS, SECTIONS, SKINS, TOPS, withBody } from "./character";

type Props = {
  initial: Character;
  editing: boolean;
  email: string;
  onSave: (c: Character) => Promise<void>;
  onCancel: () => void;
};

const label = (v: string) => (v === "tophat" ? "top hat" : v);

export default function CharacterCreator({ initial, editing, email, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial.name);
  const [style, setStyle] = useState<CharacterStyle>(initial.style);
  // New players pick female or male first; editing goes straight to the details.
  const [picked, setPicked] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof CharacterStyle>(k: K, v: CharacterStyle[K]) => setStyle((s) => ({ ...s, [k]: v }));
  // First pick starts with that section's main hairstyle; switching later keeps what still fits.
  const startAs = (b: Body) => ({ ...withBody(style, b), hair: SECTIONS[b].hair[0] });
  // Stable looks for the two pick cards (so they aren't rebuilt on every render).
  const [pickStyles] = useState(() => ({
    female: { ...startAs("female"), hat: "none" as const, accessory: "none" as const },
    male: { ...startAs("male"), hat: "none" as const, accessory: "none" as const },
  }));
  const pickBody = (b: Body) => { setStyle(picked ? (s) => withBody(s, b) : startAs(b)); setPicked(true); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ name: name.trim(), style });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your character");
      setSaving(false);
    }
  }

  if (!picked) {
    return (
      <div className="overlay creator-overlay">
        <div className="creator creator-pick">
          <p className="eyebrow">Welcome to start.ng</p>
          <h2>Create your character</h2>
          <p className="lead-sm">This is you in every game on start.ng. First, pick one.</p>
          <div className="body-options">
            {(["female", "male"] as Body[]).map((b) => (
              <button key={b} type="button" className="body-option" onClick={() => pickBody(b)}>
                <Viewer style={pickStyles[b]} interactive={false} className="pick-viewer" />
                <span>{b === "female" ? "Female" : "Male"}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const section = SECTIONS[style.body];
  const swatches = (key: "skinColor" | "hairColor" | "primaryColor" | "secondaryColor", list: string[]) => (
    <div className="swatches">
      {list.map((c) => (
        <button type="button" key={c} className={style[key] === c ? "on" : ""} style={{ background: c }} aria-label={c} onClick={() => set(key, c)} />
      ))}
    </div>
  );
  const chips = <K extends "hair" | "hat" | "accessory">(key: K, list: CharacterStyle[K][]) => (
    <div className="chips">
      {list.map((v) => (
        <button type="button" key={v} className={style[key] === v ? "on" : ""} onClick={() => set(key, v)}>{label(v)}</button>
      ))}
    </div>
  );

  return (
    <div className="overlay creator-overlay">
      <form className={`creator ${editing ? "creator-profile" : ""}`} onSubmit={submit}>
        <div className="creator-preview">
          <Viewer style={style} className="creator-viewer" />
          <strong>{name.trim() || "Your character"}</strong>
          <span className="viewer-hint">Drag to turn · Click to say hi</span>
        </div>
        <div className="creator-controls">
          <p className="eyebrow">{editing ? "Profile" : style.body === "female" ? "Female" : "Male"}</p>
          <h2>{editing ? "Your profile" : "Create your character"}</h2>
          <p className="lead-sm">{editing ? <>Signed in as {email}. Your character is you in every game.</> : "This is you in every game on start.ng."}</p>

          <div className="segmented" role="group" aria-label="Female or male">
            {(["female", "male"] as Body[]).map((b) => (
              <button type="button" key={b} className={style.body === b ? "on" : ""} onClick={() => pickBody(b)}>
                {b === "female" ? "Female" : "Male"}
              </button>
            ))}
          </div>

          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Character name" maxLength={24} required />
          </label>
          <div className="field"><span>Skin</span>{swatches("skinColor", SKINS)}</div>
          <div className="field"><span>Hair</span>{chips("hair", section.hair)}</div>
          {style.hair !== "bald" && <div className="field"><span>Hair colour</span>{swatches("hairColor", HAIR_COLORS)}</div>}
          <div className="field"><span>Top</span>{swatches("primaryColor", TOPS)}</div>
          <div className="field"><span>Bottoms</span>{swatches("secondaryColor", BOTTOMS)}</div>
          <div className="field"><span>Hat</span>{chips("hat", HATS)}</div>
          <div className="field"><span>Extra</span>{chips("accessory", section.accessory)}</div>

          {editing && <MyGames />}

          {error && <p className="error">{error}</p>}
          <div className="creator-actions">
            <button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save changes" : "Done"}</button>
            {editing && <button type="button" className="ghost" onClick={onCancel}>Cancel</button>}
          </div>
        </div>
      </form>
    </div>
  );
}
