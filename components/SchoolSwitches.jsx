"use client";
import { useState } from "react";

/** Principal controls: online admission on/off, top banner on/off and its text. Banner text comes from here. */
export const DEFAULT_BANNER_TEXT = "নতুন শিক্ষাবর্ষে ভর্তি আবেদন এখন অনলাইনে";
export const DEFAULT_BANNER_LINK = "আবেদন করুন";
export default function SchoolSwitches({ settings, working, mutate }) {
  const [text, setText] = useState(settings?.bannerText ?? DEFAULT_BANNER_TEXT);
  const [link, setLink] = useState(settings?.bannerLinkText ?? DEFAULT_BANNER_LINK);
  const admissionOpen = settings?.admissionOpen !== false, bannerOn = settings?.bannerEnabled !== false;
  const Toggle = ({ on, onClick, children }) => <label className="flex items-center gap-3 cursor-pointer">
    <input type="checkbox" checked={on} disabled={working} onChange={onClick} style={{ width: 20, height: 20 }}/> <span>{children}</span></label>;
  return <div className="panel p-5 grid gap-4">
    <h3 className="font-bold">Online Admission &amp; Home Banner</h3>
    <Toggle on={admissionOpen} onClick={() => mutate("settings.switches", { admissionOpen: !admissionOpen })}>
      Online admission is <b>{admissionOpen ? "OPEN" : "CLOSED"}</b> (closing it blocks new applications on the admission page)</Toggle>
    <Toggle on={bannerOn} onClick={() => mutate("settings.switches", { bannerEnabled: !bannerOn })}>
      Home page top banner is <b>{bannerOn ? "SHOWN" : "HIDDEN"}</b></Toggle>
    <label className="field">Banner text<input value={text} maxLength={200} onChange={e => setText(e.target.value)}/></label>
    <label className="field">Banner link label<input value={link} maxLength={60} onChange={e => setLink(e.target.value)}/></label>
    <button className="btn primary justify-self-start" disabled={working} onClick={() => mutate("settings.switches", { bannerText: text, bannerLinkText: link })}>Save banner text</button>
  </div>;
}
