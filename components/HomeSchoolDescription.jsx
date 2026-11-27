"use client";

import { useEffect, useState } from "react";
import { loadPublicData } from "../lib/public-client";

const fallback = "হাজী মতিউর রহমান সরকার উচ্চ বিদ্যালয়ের শিক্ষার্থী, শিক্ষক ও অভিভাবকদের জন্য প্রয়োজনীয় তথ্য ও ডিজিটাল সেবা এখন এক জায়গায়।";

export default function HomeSchoolDescription() {
  const [description, setDescription] = useState(fallback);

  useEffect(() => {
    let active = true;
    loadPublicData()
      .then(data => {
        const saved = typeof data?.settings?.subtitle === "string"
          ? data.settings.subtitle.trim()
          : "";
        if (active && saved) setDescription(saved);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return <p className="hmrs-home-lead hmrs-home-description">{description}</p>;
}
