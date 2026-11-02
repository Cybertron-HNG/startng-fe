import { useEffect, useState } from "react";
import type { YourGameProps } from "../registry";
import { checkAgain, getPhoneCheck, type PhoneCheck } from "./api";
import "./phone_check.css";

// "Phone check", inside Your games: what start.ng found when it looked at the game at phone sizes after it was
// published or updated. Only a warning: a rough check of the start screen, so it says "worth a look", not "broken".
const SUMMARY: Record<PhoneCheck["status"], string> = {
  unchecked: "Checking soon, after each update",
  ok: "No phone problems found",
  worth_a_look: "Worth a look on a phone",
  error: "Couldn't check this game",
};

export default function PhoneCheckPanel({ game }: YourGameProps) {
  const [check, setCheck] = useState<PhoneCheck | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    getPhoneCheck(game.name).then((c) => live && setCheck(c)).catch(() => {});
    return () => { live = false; };
  }, [game.name]);
  if (!check) return null;
  const again = () => {
    setBusy(true);
    checkAgain(game.name).then(setCheck).catch(() => {}).finally(() => setBusy(false));
  };
  const how = check.method === "browser" ? "Opened at 320 and 375 px wide" : check.method === "files" ? "From your game's files" : null;
  return (
    <details className="your-stats phone-check" open={check.status === "worth_a_look"}>
      <summary className="your-stats-head">
        <b>Phone check</b>
        {check.status === "worth_a_look" && <span className="tag">{check.findings.length} to look at</span>}
        <span className="note">{SUMMARY[check.status]}</span>
      </summary>
      {check.findings.length > 0 && (
        <ul className="phone-check-findings">
          {check.findings.map((f) => <li key={f.code}>{f.message}</li>)}
        </ul>
      )}
      <p className="note">
        {how && <>{how}. </>}It only looks at the start screen, so it can miss things or flag something that's fine.{" "}
        <a href="/docs#works-on-a-small-phone">Tips for phones</a>
      </p>
      {check.status !== "unchecked" && (
        <button type="button" className="ghost" disabled={busy} onClick={again}>{busy ? "Asking…" : "Check again"}</button>
      )}
    </details>
  );
}
