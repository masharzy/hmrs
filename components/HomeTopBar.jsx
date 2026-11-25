"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { loadPublicData } from "../lib/public-client";

const DEFAULT_TEXT = "নতুন শিক্ষাবর্ষে ভর্তি আবেদন এখন অনলাইনে";
const DEFAULT_LINK = "আবেদন করুন";

/** News-style ticker of the latest 10 notices (pauses on hover, click opens the notice) above the admission banner. */
export default function HomeTopBar() {
  const [state, setState] = useState(null);
  useEffect(() => {
    let live = true;
    loadPublicData().then(data => { if (live) setState({ notices: (data?.notices || []).slice(0, 10), settings: data?.settings || {} }); })
      .catch(() => { if (live) setState({ notices: [], settings: {} }); });
    return () => { live = false; };
  }, []);
  if (!state) return null;
  const { notices, settings } = state;
  const showBanner = settings.bannerEnabled !== false;
  const text = typeof settings.bannerText === "string" && settings.bannerText.trim() ? settings.bannerText : DEFAULT_TEXT;
  const link = typeof settings.bannerLinkText === "string" && settings.bannerLinkText.trim() ? settings.bannerLinkText : DEFAULT_LINK;
  const open = notice => {
    window.dispatchEvent(new CustomEvent("hmrs-open-notice", { detail: notice }));
  };
  return <>
    {notices.length > 0 && <div className="hmrs-home-ticker" role="region" aria-label="সর্বশেষ নোটিশ">
      <span className="hmrs-home-ticker-label"><Megaphone size={15}/> সর্বশেষ নোটিশ</span>
      <div className="hmrs-home-ticker-viewport">
        <div className="hmrs-home-ticker-track" style={{ "--ticker-time": Math.max(24, notices.length * 7) + "s" }}>
          {[0, 1].map(copy => <div className="hmrs-home-ticker-group" key={copy} aria-hidden={copy === 1}>
            {notices.map(n => <button type="button" className="hmrs-home-ticker-item" key={n.id} tabIndex={copy ? -1 : 0} onClick={() => open(n)}>
              <i aria-hidden="true"/>{n.title}</button>)}
          </div>)}
        </div>
      </div>
    </div>}
    {showBanner && <div className="hmrs-home-announce"><span>{text}</span>{settings.admissionOpen !== false && <Link href="/admission">{link} →</Link>}</div>}
  </>;
}
