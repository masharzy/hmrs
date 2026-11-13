import {toAsciiDigits} from "./bangla-numbers.js";
const SUBJECTS={
 bangla:"Bangla",english:"English",math:"Mathematics",ict:"Information & Communication Technology",
 science:"General Science",bgs:"Bangladesh & Global Studies",religion:"Religion & Moral Education",
 physics:"Physics",chemistry:"Chemistry",biology:"Biology","higher-math":"Higher Mathematics",
 agriculture:"Agricultural Studies","home-science":"Home Science",accounting:"Accounting",
 entrepreneurship:"Business Entrepreneurship",finance:"Finance & Banking",history:"History & World Civilization",
 geography:"Geography & Environment",civics:"Civics & Citizenship",economics:"Economics"
};
const STREAMS={science:"Science",business:"Business Studies",humanities:"Humanities"};
export const enNumber=v=>v===null||v===undefined?"—":toAsciiDigits(v);
export const enSubject=(id,fallback)=>SUBJECTS[id]||fallback||id;
export const enStream=(group)=>STREAMS[group]||group||"";
export const enGrade=v=>"Class "+enNumber(v);
export function enPaper(subjectId,title=""){
 const s=toAsciiDigits(title);
 const name=enSubject(subjectId);
 if(/(1ম|1st|first)/i.test(s))return name+" · Paper 1";
 if(/(2য়|2nd|second)/i.test(s))return name+" · Paper 2";
 if(s.includes("পুরোনো")||s.includes("একত্রিত"))return name+" · Legacy combined marks";
 return name;
}
export function enPart(label="",key=""){
 if(["first","second","total"].includes(key))return key==="first"?"Paper 1":key==="second"?"Paper 2":"Total";
 if(["cq","firstCq","secondCq"].includes(key))return "CQ / Written";
 if(["mcq","firstMcq","secondMcq"].includes(key))return "MCQ";
 if(key==="practical")return "Practical";
 return label||key;
}
