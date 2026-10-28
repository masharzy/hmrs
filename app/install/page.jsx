"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, LockKeyhole, School, ShieldCheck, UserRoundPlus } from "lucide-react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { firebaseAuth } from "../../lib/firebase-client";

export default function InstallPage() {
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", setupKey: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [installedNow, setInstalledNow] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/install", { cache: "no-store" })
      .then(async r => {
        if (!r.ok) throw Error("সেটআপের অবস্থা পাওয়া যায়নি");
        return r.json();
      })
      .then(data => { if (active) setStatus(data); })
      .catch(e => { if (active) setStatus({ ready: false, error: e.message }); });
    return () => { active = false; };
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("দুটি পাসওয়ার্ড একই হতে হবে"); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/install", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, setupKey: form.setupKey })
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "অ্যাকাউন্ট তৈরি করা যায়নি");
      setInstalledNow(true);
      setStatus({ installed: true, ready: true });
      setForm(v => ({ ...v, password: "", confirm: "", setupKey: "" }));
      try {
        await signInWithEmailAndPassword(firebaseAuth(), form.email, form.password);
        router.replace("/dashboard");
      } catch {
        // Account is created even when browser login fails. Provide explicit login link.
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const change = e => setForm(v => ({ ...v, [e.target.name]: e.target.value }));
  const noAccess = status?.installed || installedNow;
  return <><SiteHeader/><main className="container" style={{ maxWidth: 560, paddingTop: 46, paddingBottom: 65 }}>
    <Link href="/" className="muted text-xs flex items-center gap-2 mb-6"><ArrowLeft size={14}/> হোম পেজে ফিরুন</Link>
    <div className="panel p-6 sm:p-9">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center rounded-md" style={{ height: 46, width: 46, background: "#e9f4ef", color: "#176b61" }}>
          <School size={23}/>
        </div>
        <div><div className="kicker">HMRS / FIRST-TIME SETUP</div><h1 className="font-extrabold text-lg mt-1 mb-0">প্রতিষ্ঠান প্রধানের অ্যাকাউন্ট</h1></div>
      </div>
      {!status ? <div className="empty">সেটআপের অবস্থা যাচাই হচ্ছে...</div> :
      noAccess ? <div className="py-6 text-center">
        <CheckCircle2 size={43} color="#176b61" className="mx-auto mb-4"/>
        <h2 className="section-title">সেটআপ সম্পন্ন হয়েছে</h2>
        <p className="muted text-sm">প্রতিষ্ঠানের জন্য প্রধান শিক্ষকের অ্যাকাউন্ট তৈরি করা হয়েছে। নিরাপত্তার জন্য এই ফর্ম দিয়ে আর নতুন প্রধান শিক্ষক তৈরি করা যাবে না।</p>
        <Link href="/login/principal" className="btn primary mt-3">প্রধান শিক্ষক লগইন <ArrowRight size={16}/></Link>
        {installedNow && <p className="text-xs muted mt-5 mb-0">এখন Vercel থেকে INSTALL_SETUP_KEY মুছে দিতে পারো।</p>}
      </div> :
      !status.ready ? <div className="alert error">
        <b>Firebase configuration এখনো প্রস্তুত নয়।</b>
        <p className="mt-2 mb-1">{status.error || "প্রথমে Vercel → Settings → Environment Variables-এ প্রয়োজনীয় তথ্য বসাও।"}</p>
        {!!status.missing?.length && <p className="mt-2 mb-0 text-xs">Missing: {status.missing.join(", ")}</p>}
      </div> :
      !status.setupKeyConfigured ? <div className="alert error">
        প্রথমে Vercel Environment Variables-এ <code>INSTALL_SETUP_KEY</code> (অন্তত ৩২ অক্ষরের random key) যোগ করে Redeploy করো।
      </div> :
      <>
        <p className="muted text-sm mb-6">শুধু বিদ্যালয়ের অনুমোদিত প্রধান শিক্ষক প্রথমবার এই ফর্ম পূরণ করবেন। এরপর installer স্থায়ীভাবে বন্ধ থাকবে।</p>
        <form className="grid gap-4" onSubmit={submit}>
          <label className="field">প্রধান শিক্ষকের নাম
            <input required minLength={3} maxLength={120} name="name" autoComplete="name" value={form.name} onChange={change} placeholder="পূর্ণ নাম"/>
          </label>
          <label className="field">ইমেইল ঠিকানা
            <input required type="email" maxLength={160} name="email" autoComplete="email" value={form.email} onChange={change} placeholder="name@example.com"/>
          </label>
          <div className="form-grid">
            <label className="field">নতুন পাসওয়ার্ড
              <input required minLength={12} maxLength={128} name="password" type="password" autoComplete="new-password" value={form.password} onChange={change} placeholder="কমপক্ষে ১২ অক্ষর"/>
            </label>
            <label className="field">পাসওয়ার্ড নিশ্চিত করো
              <input required minLength={12} name="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={change}/>
            </label>
          </div>
          <label className="field">Setup Key (শুধু Vercel-এ রাখা গোপন key)
            <input required minLength={32} maxLength={256} name="setupKey" type="password" autoComplete="off" value={form.setupKey} onChange={change} placeholder="INSTALL_SETUP_KEY"/>
          </label>
          {error && <div className="alert error" role="alert">{error}</div>}
          <div className="alert flex items-start gap-2"><ShieldCheck size={16} className="shrink-0 mt-1"/> এই key ওয়েবসাইটের source code-এ থাকবে না। প্রধান শিক্ষকের পাসওয়ার্ড Firebase Authentication নিরাপদে সংরক্ষণ করবে।</div>
          <button type="submit" disabled={busy} className="btn primary w-full mt-2"><UserRoundPlus size={16}/>{busy ? "অ্যাকাউন্ট তৈরি হচ্ছে..." : "প্রধান শিক্ষক অ্যাকাউন্ট তৈরি করো"} <ArrowRight size={16}/></button>
        </form>
      </>}
    </div>
    <p className="text-center muted text-xs mt-5"><LockKeyhole size={14} className="inline mr-1"/> প্রথমবার ইনস্টল · একবারের জন্য</p>
  </main><SiteFooter/></>;
}