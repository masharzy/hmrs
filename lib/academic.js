/**
 * School academic rules. These rules implement the provided HMRS policy,
 * not a claim of automatic Bangladesh board certification.
 * All percentages are inclusive at 33%, consistent with the supplied grade table.
 */
import { parseBanglaNumber } from "./bangla-numbers.js";

export const GRADE_SCALE = [
  { min: 80, letter: "A+", point: 5 },
  { min: 70, letter: "A", point: 4 },
  { min: 60, letter: "A-", point: 3.5 },
  { min: 50, letter: "B", point: 3 },
  { min: 40, letter: "C", point: 2 },
  { min: 33, letter: "D", point: 1 },
  { min: 0, letter: "F", point: 0 }
];

const total = (id, name, max = 100) => ({ id, name, max, parts: [{ key: "total", label: "মোট নম্বর", max }] });
const theory = (id, name) => ({ id, name, max: 100, parts: [
  { key: "cq", label: "সৃজনশীল (CQ)", max: 70, pass: 23 },
  { key: "mcq", label: "বহুনির্বাচনী (MCQ)", max: 30, pass: 10 }
] });
const practical = (id, name) => ({ id, name, max: 100, parts: [
  { key: "cq", label: "সৃজনশীল (CQ)", max: 50, pass: 17 },
  { key: "mcq", label: "বহুনির্বাচনী (MCQ)", max: 25, pass: 8 },
  { key: "practical", label: "ব্যবহারিক", max: 25, pass: 8 }
] });
const language = (id, name, lower = false) => ({
  id, name, max: lower ? 150 : 200,
  parts: lower
    ? [{ key: "first", label: "১ম পত্র", max: 100 }, { key: "second", label: "২য় পত্র", max: 50 }]
    : id === "bangla"
      ? [{ key: "cq", label: "দুই পত্রের CQ", max: 140, pass: 46 }, { key: "mcq", label: "দুই পত্রের MCQ", max: 60, pass: 20 }]
      : [{ key: "first", label: "ইংরেজি ১ম পত্র", max: 100 }, { key: "second", label: "ইংরেজি ২য় পত্র", max: 100 }]
});

export const SUBJECTS_6_8 = [
  language("bangla", "বাংলা", true),
  language("english", "ইংরেজি", true),
  total("math", "গণিত"),
  total("ict", "তথ্য ও যোগাযোগ প্রযুক্তি", 50),
  total("science", "বিজ্ঞান"),
  total("bgs", "বাংলাদেশ ও বিশ্বপরিচয়"),
  total("religion", "ধর্ম ও নৈতিক শিক্ষা")
];

// Maintain one 200-mark Bangla subject for GPA, but enter each paper independently.
const secondaryBangla = {
  id: "bangla", name: "বাংলা", max: 200,
  parts: [
    { key:"firstCq", label:"CQ", paper:"বাংলা ১ম পত্র", max:70, pass:23 },
    { key:"firstMcq", label:"MCQ", paper:"বাংলা ১ম পত্র", max:30, pass:10 },
    { key:"secondCq", label:"লিখিত/CQ", paper:"বাংলা ২য় পত্র", max:70, pass:23 },
    { key:"secondMcq", label:"MCQ", paper:"বাংলা ২য় পত্র", max:30, pass:10 }
  ]
};
const common = [
  secondaryBangla, language("english", "ইংরেজি"),
  theory("math", "গণিত"), theory("religion", "ধর্ম ও নৈতিক শিক্ষা"),
  { id: "ict", name: "তথ্য ও যোগাযোগ প্রযুক্তি", max: 50, parts: [
    { key: "mcq", label: "MCQ", max: 25, pass: 8 },
    { key: "practical", label: "ব্যবহারিক", max: 25, pass: 8 }
  ] }
];

export function getSubjects(grade, group = "science", elective = "higher-math", fourthSubject = "") {
  const n = parseBanglaNumber(grade);
  if (!Number.isInteger(n) || n < 6 || n > 10) throw Error("শ্রেণি ৬ থেকে ১০ হতে হবে");
  if (n <= 8) return SUBJECTS_6_8.map(s => ({ ...s }));
  if (!["science", "business", "humanities"].includes(group)) throw Error("সঠিক বিভাগ নির্বাচন করুন");
  const out = [...common];
  if (group === "science") {
    if (!["higher-math", "agriculture", "home-science"].includes(elective)) throw Error("সঠিক ঐচ্ছিক বিষয় নির্বাচন করুন");
    out.push(theory("bgs", "বাংলাদেশ ও বিশ্বপরিচয়"), practical("physics", "পদার্থবিজ্ঞান"),
      practical("chemistry", "রসায়ন"), practical("biology", "জীববিজ্ঞান"));
    out.push(elective === "higher-math" ? practical("higher-math", "উচ্চতর গণিত")
      : practical(elective, elective === "agriculture" ? "কৃষি শিক্ষা" : "গার্হস্থ্য বিজ্ঞান"));
  } else if (group === "business") {
    if (!["agriculture", "home-science"].includes(elective)) throw Error("সঠিক চতুর্থ বিষয় নির্বাচন করুন");
    out.push(theory("science", "সাধারণ বিজ্ঞান"), theory("accounting", "হিসাববিজ্ঞান"),
      theory("entrepreneurship", "ব্যবসায় উদ্যোগ"), theory("finance", "ফিন্যান্স ও ব্যাংকিং"),
      elective === "agriculture" ? practical("agriculture", "কৃষি শিক্ষা") : theory("home-science", "গার্হস্থ্য বিজ্ঞান"));
  } else {
    if (!["civics", "economics"].includes(elective)) throw Error("সঠিক নৈর্বাচনিক বিষয় নির্বাচন করুন");
    const optional = ["agriculture", "home-science"].includes(fourthSubject) ? fourthSubject : "agriculture";
    out.push(theory("science", "সাধারণ বিজ্ঞান"), theory("history", "বাংলাদেশের ইতিহাস ও বিশ্বসভ্যতা"),
      theory("geography", "ভূগোল ও পরিবেশ"),
      theory(elective, elective === "civics" ? "পৌরনীতি ও নাগরিকতা" : "অর্থনীতি"),
      optional === "agriculture" ? practical("agriculture", "কৃষি শিক্ষা") : theory("home-science", "গার্হস্থ্য বিজ্ঞান"));
  }
  // Physics/Chemistry/etc require separate CQ, MCQ, practical thresholds.
  return out;
}

/** One fourth-subject field controls each student subject list and grade calculation. */
export const FOURTH_SUBJECT_OPTIONS={
 science:[{id:"biology",name:"জীববিজ্ঞান"},{id:"higher-math",name:"উচ্চতর গণিত"},{id:"agriculture",name:"কৃষি শিক্ষা"}],
 business:[{id:"agriculture",name:"কৃষি শিক্ষা"},{id:"home-science",name:"গার্হস্থ্য বিজ্ঞান"}],
 humanities:[{id:"agriculture",name:"কৃষি শিক্ষা"},{id:"home-science",name:"গার্হস্থ্য বিজ্ঞান"}]
};
export function selectedFourthSubject(student={}){
 const group=student.group,options=FOURTH_SUBJECT_OPTIONS[group];
 if(!options)return "";
 const requested=student.optionalId||student.optionalSubject||"";
 if(options.some(x=>x.id===requested))return requested;
 if(group==="science"){
  if(student.elective==="agriculture")return "agriculture";
  return "biology";
 }
 if(group==="business"&&options.some(x=>x.id===student.elective))return student.elective;
 if(group==="humanities"&&options.some(x=>x.id===student.fourthSubject))return student.fourthSubject;
 return "agriculture";
}
export function fourthSubjectSelection(group,choice){
 const options=FOURTH_SUBJECT_OPTIONS[group];
 if(!options||!options.some(s=>s.id===choice))throw Error("বিভাগ অনুযায়ী সঠিক ৪র্থ বিষয় নির্বাচন করুন");
 if(group==="science")return {
  elective:choice==="agriculture"?"agriculture":"higher-math",
  fourthSubject:choice,optionalId:choice
 };
 if(group==="business")return {elective:choice,fourthSubject:choice,optionalId:choice};
 return {elective:"civics",fourthSubject:choice,optionalId:choice};
}
export function getStudentSubjects(student){
 const n=parseBanglaNumber(student.grade);
 if(n<=8)return getSubjects(n);
 const derived=fourthSubjectSelection(student.group,selectedFourthSubject(student));
 return getSubjects(n,student.group,derived.elective,derived.fourthSubject);
}

export function gradeFor(percent, passed = true) {
  if (!passed) return { letter: "F", point: 0 };
  const level = GRADE_SCALE.find(g => percent >= g.min);
  return { letter: level.letter, point: level.point };
}

export function evaluateSubject(subject, scores) {
  if (!scores || typeof scores !== "object") return {status:"missing",subjectId:subject.id,name:subject.name,
   received:0,max:subject.max,percent:0,passed:false,letter:"F",point:0};
  // Old 9th/10th Bangla records store combined CQ/MCQ. Do not fabricate
  // paper-by-paper scores; keep their existing published result calculable.
  if(subject.id==="bangla" && subject.max===200 && scores.cq!==undefined && scores.mcq!==undefined &&
    subject.parts.some(p=>p.key==="firstCq") && subject.parts.every(p=>scores[p.key]===undefined)){
    const legacy={...subject,parts:[
      {key:"cq",max:140,pass:46},{key:"mcq",max:60,pass:20}
    ]};
    const result=evaluateSubject(legacy,scores);
    return {...result,legacy:result.status==="complete"};
  }
  let received = 0;
  let passedComponents = true;
  for (const part of subject.parts) {
    const rawValue = scores[part.key];
    const value = typeof rawValue === "string" ? parseBanglaNumber(rawValue) : rawValue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > part.max)
      return {status:"missing",subjectId:subject.id,name:subject.name,received:0,max:subject.max,
       percent:0,passed:false,letter:"F",point:0};
    received += value;
    if (part.pass !== undefined && value < part.pass) passedComponents = false;
  }
  const percent = received / subject.max * 100;
  const passed = passedComponents && percent >= 33;
  return { status: "complete", subjectId: subject.id, name: subject.name, received, max: subject.max,
    percent: Math.round(percent * 100) / 100, passed, ...gradeFor(percent, passed) };
}

export function evaluateTranscript(student, marks = {}) {
  const subjects = getStudentSubjects(student);
  const rows = subjects.map(subject => ({ subject, ...evaluateSubject(subject, marks[subject.id]) }));
  const complete = rows.every(row => row.status === "complete");
  const chosenOptional = parseBanglaNumber(student.grade) >= 9 ? selectedFourthSubject(student) : null;
  const optionalRow=rows.find(row=>row.subjectId===chosenOptional);
  const required=rows.filter(row=>row.subjectId!==chosenOptional);
  const requiredComplete=required.length>0&&required.every(row=>row.status==="complete");
  // An unentered result is treated as zero for grading only, NOT saved as a real mark.
  // Keep "complete" separate for result-publication warnings.
  const passed=required.length>0&&required.every(row=>row.passed===true);
  const round=n=>Math.round(n*100)/100;
  const totalPoints=required.reduce((sum,row)=>sum+(row.point||0),0);
  const base=passed?round(totalPoints/required.length):0;
  const bonus=optionalRow?.status==="complete"?Math.max(0,optionalRow.point-2):0;
  const withOptional=passed?round(Math.min(5,(totalPoints+bonus)/required.length)):0;
  const gpa=withOptional;
  const letter=!passed?"F":gpa>=5?"A+":gpa>=4?"A":gpa>=3.5?"A-":
   gpa>=3?"B":gpa>=2?"C":gpa>=1?"D":"F";
  return {
   rows,complete,requiredComplete,passed,provisional:!complete,optionalId:chosenOptional,
   withoutFourthGpa:base,withFourthGpa:withOptional,bonus, gpa,letter,
   total:rows.reduce((sum,row)=>sum+(row.received||0),0),
   maxTotal:rows.reduce((sum,row)=>sum+row.subject.max,0),
   missingSubjects:rows.filter(row=>row.status!=="complete").map(row=>row.subject.name),
   hasAllRequiredMarks:requiredComplete
  };
}

export function validateMarkForStudent(student, subjectId, scores) {
  const subject = getStudentSubjects(student).find(s => s.id === subjectId);
  if (!subject) throw Error("এই শিক্ষার্থীর বিষয় তালিকায় বিষয়টি নেই");
  const result = evaluateSubject(subject, scores);
  if (result.status !== "complete") throw Error("নম্বর সঠিক নয়: প্রতিটি অংশে ০ থেকে পূর্ণ নম্বর দিন");
  return result;
}

/** Validate only the supplied cells. Missing other paper cells remain incomplete. */
export function validatePartialMarkForStudent(student,subjectId,scores){
 const subject=getStudentSubjects(student).find(s=>s.id===subjectId);
 if(!subject)throw Error("এই শিক্ষার্থীর বিষয় তালিকায় বিষয়টি নেই");
 if(!scores || typeof scores!=="object" || Array.isArray(scores))throw Error("নম্বরের তথ্য সঠিক নয়");
 const allowed=new Map(subject.parts.map(part=>[part.key,part]));
 const keys=Object.keys(scores);
 if(!keys.length || keys.some(key=>!allowed.has(key)))throw Error("বিষয়ের অংশ নির্বাচন করুন");
 const parsed={};
 for(const key of keys){
  const raw=scores[key];
  if(raw===null||raw===""){parsed[key]=null;continue}
  const v=typeof raw==="number"?raw:parseBanglaNumber(raw);
  if(!Number.isFinite(v)||v<0||v>allowed.get(key).max)
   throw Error(allowed.get(key).label+" must be between 0 and "+allowed.get(key).max);
  parsed[key]=v;
 }
 return parsed;
}
