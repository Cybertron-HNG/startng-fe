import { useEffect, useState } from "react";
import type { User } from "../../api";
import { myCrews, CrewSummary } from "../crews/api";
import { useFeature } from "../flags";

/** The crews whose boards the signed-in player can look at: [] while the feature is off, signed out, or in no crew. */
export function useCrewScopes(user: User | null): CrewSummary[] {
  const boards = useFeature("scoped_boards");
  const crewsOn = useFeature("crews"); // both hooks every time: hooks can't sit behind a condition
  const on = boards && crewsOn;
  const [crews, setCrews] = useState<CrewSummary[]>([]);
  useEffect(() => {
    if (!on || !user) { setCrews([]); return; }
    myCrews().then(setCrews).catch(() => setCrews([]));
  }, [on, user?.id]);
  return crews;
}
