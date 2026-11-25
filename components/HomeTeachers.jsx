"use client";
import { useEffect, useState } from "react";
import { loadPublicData } from "../lib/public-client";

const GRADE_SHORT = { 6: "৬ষ্ঠ", 7: "৭ম", 8: "৮ম", 9: "৯ম", 10: "১০ম" };
const TONES = ["blue", "emerald", "violet", "amber", "coral"];

function Avatar({ name, photoUrl, tone }) {
  const [failed, setFailed] = useState(false);
  return <span className={"hmrs-teacher-avatar tone-" + tone}>
    {photoUrl && !failed
      ? <img src={photoUrl} alt={name} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      : <b aria-hidden="true">{[...name][0]}</b>}
  </span>;
}

export default function HomeTeachers() {
  const [teachers, setTeachers] = useState(null);
  useEffect(() => {
    let live = true;
    loadPublicData().then(data => { if (live) setTeachers(Array.isArray(data?.teachers) ? data.teachers : []); })
      .catch(() => { if (live) setTeachers([]); });
    return () => { live = false; };
  }, []);
  if (!teachers || !teachers.length) return null;
  return <section className="container hmrs-home-teachers" id="teachers">
    <div className="hmrs-home-section-heading"><div>
      <span className="hmrs-home-eyebrow tone-amber">OUR TEACHERS</span>
      <h2 className="section-title">আমাদের শিক্ষকবৃন্দ</h2>
      <p>শিক্ষার্থীদের পথ দেখানো শ্রদ্ধেয় শিক্ষকগণ</p>
    </div></div>
    <div className="hmrs-teacher-grid">
      {teachers.map((t, i) => <article className="hmrs-teacher-card" key={i + "-" + t.name}>
        <Avatar name={t.name} photoUrl={t.photoUrl} tone={TONES[i % TONES.length]} />
        <h3>{t.name}</h3>
        <span className={"hmrs-teacher-role" + (t.isClassTeacher ? " is-homeroom" : "")}>
          {t.isClassTeacher
            ? "শ্রেণি শিক্ষক" + (t.homeroom?.length ? " · " + t.homeroom.map(g => GRADE_SHORT[g] || g).join(", ") : "")
            : "বিষয় শিক্ষক"}
        </span>
        {t.subjects?.length > 0 && <p>{t.subjects.join(" • ")}</p>}
      </article>)}
    </div>
  </section>;
}
