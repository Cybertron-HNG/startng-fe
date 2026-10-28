import Boundary from "./Boundary";
import { allProfileSections } from "./registry";
import { useFeatures } from "./flags";

/** Every feature's section on a player's profile, in order (the profile page, S1, puts this where they go). */
export default function ProfileSections({ userId, isMe }: { userId: number; isMe: boolean }) {
  const isOn = useFeatures();
  return (
    <>
      {allProfileSections().filter((s) => isOn(s.feature) && (!s.ownerOnly || isMe)).map((s) => (
        <section key={s.key} className="profile-section" aria-label={s.title}>
          <h2>{s.title}</h2>
          <Boundary name={s.title}>
            <s.Component userId={userId} isMe={isMe} />
          </Boundary>
        </section>
      ))}
    </>
  );
}
