"use client";
import { useState } from "react";
import { ArrowUpCircle, X } from "lucide-react";
import { enGrade, enStream } from "../lib/result-english.js";
import { toAsciiDigits } from "../lib/bangla-numbers";

const label = s => `${s.name} (${enGrade(s.grade)}${s.group ? " · " + enStream(s.group) : ""}, Roll ${toAsciiDigits(s.roll)})`;

/** Promote one student, or everyone (optionally only one class), to the next class. Principal only. */
export default function StudentPromotion({ students, target, working, mutate, onClose }) {
  const one = target?.student || null;
  const [grade, setGrade] = useState("");
  const [groupFor9, setGroupFor9] = useState("");
  const [result, setResult] = useState(null);
  const pool = one ? [one] : students.filter(s => !grade || Number(s.grade) === Number(grade));
  const movable = pool.filter(s => Number(s.grade) < 10);
  const board = pool.filter(s => Number(s.grade) >= 10 && !s.boardPromoted);
  const undo = one && Number(one.grade) >= 10 && one.boardPromoted;
  const needsGroup = movable.some(s => Number(s.grade) === 8 && !s.group);
  async function run() {
    const r = await mutate("student.promote", one ? { studentIds: [one.id], groupFor9, revoke: !!undo } : { all: true, grade: grade || undefined, groupFor9 });
    if (r) setResult(r);
  }
  return <div className="record-modal-backdrop" role="dialog" aria-modal="true"><div className="record-modal">
    <div className="flex justify-between items-center gap-3 mb-3"><h3 className="font-bold flex items-center gap-2"><ArrowUpCircle size={18}/> {one ? "Promote Student" : "Promote Students"}</h3>
      <button type="button" className="btn sm" onClick={onClose} aria-label="Close"><X size={15}/></button></div>
    {result ? <div className="grid gap-3">
      {(result.promoted>0||!(result.boardPromoted||result.boardRevoked))&&<div className="alert">{toAsciiDigits(result.promoted)} students promoted to the next class.</div>}
      {result.boardPromoted>0&&<div className="alert">{toAsciiDigits(result.boardPromoted)} Class 10 students marked “Promoted to Board Exam”.</div>}
      {result.boardRevoked>0&&<div className="alert">Board-exam promotion removed.</div>}
      {!!result.skipped?.length && <div className="alert danger"><b>{toAsciiDigits(result.skipped.length)} not promoted:</b>
        <ul className="mt-1 text-sm">{result.skipped.slice(0, 15).map(s => <li key={s.id}>{s.name} — {s.reason === "বিভাগ নেই" ? "no group selected" : s.reason}</li>)}</ul></div>}
      <button className="btn primary justify-self-start" onClick={onClose}>Done</button>
    </div> : <div className="grid gap-3">
      {one ? <p>{label(one)} {Number(one.grade) >= 10 ? (undo ? "is marked “Promoted to Board Exam”. Remove this status?" : "will be marked “Promoted to Board Exam” (shown in green on the result).") : "will move to " + enGrade(Number(one.grade) + 1) + "."}</p> : <>
        <label className="field">Which class?<select value={grade} onChange={e => setGrade(e.target.value)}>
          <option value="">All classes (6–9 move up one class)</option>
          {[6, 7, 8, 9, 10].map(g => <option key={g} value={g}>{enGrade(g)}</option>)}</select></label>
        <p className="muted text-sm">{toAsciiDigits(movable.length)} students move up one class. {toAsciiDigits(board.length)} Class 10 students will be marked “Promoted to Board Exam”.</p></>}
      {needsGroup && <label className="field">Group for students entering Class 9 (Class 8 has no group)
        <select value={groupFor9} onChange={e => setGroupFor9(e.target.value)}>
          <option value="">Select group…</option><option value="science">Science</option><option value="business">Business Studies</option><option value="humanities">Humanities</option></select></label>}
      <div className="alert">Roll numbers are kept when free, otherwise the next free roll is given. Old marks and attendance stay as they are. This cannot be undone automatically.</div>
      <div className="inline-actions"><button className="btn primary" disabled={working || !(movable.length || board.length || undo) || (needsGroup && !groupFor9)} onClick={run}>
        <ArrowUpCircle size={15}/> {working ? "Promoting…" : one ? "Promote" : "Promote " + toAsciiDigits(movable.length + board.length) + " students"}</button>
        <button className="btn" onClick={onClose}>Cancel</button></div>
    </div>}
  </div></div>;
}
