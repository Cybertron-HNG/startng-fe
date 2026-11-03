import { Boundary } from "../Boundary";
import { useFeatures } from "./flags";
import { allProfileSections } from "./registry";

export default function ProfileSections({ isMe }: { isMe: boolean }) {
  const isOn = useFeatures();
  return (
    <>
      {allProfileSections().filter((s) => isOn(s.feature) && (isMe || !s.ownerOnly)).map((s) => (
        <section key={s.key} className="profile-section" aria-label={s.title}>
          <h2>{s.title}</h2>
          <Boundary name={s.title}>
            <s.Component isMe={isMe} />
          </Boundary>
        </section>
      ))}
    </>
  );
}
