import {toAsciiDigits} from "./bangla-numbers.js";
export const keyFor=(studentId,subjectId)=>studentId+"|"+subjectId;
/** Build a validated snapshot; never send half-typed or out-of-range scores. */
export function pendingMarkBatch(edits,studentsById,subjectsByStudent){
 const ready=[],invalid=[];
 for(const [key,values] of Object.entries(edits||{})){
  const split=key.indexOf("|");
  const studentId=key.slice(0,split),subjectId=key.slice(split+1);
  const student=studentsById.get(studentId);
  const subject=student&&subjectsByStudent.get(studentId)?.find(s=>s.id===subjectId);
  if(!student||!subject){invalid.push({key,reason:"Student or subject is not available"});continue}
  const validParts=new Map(subject.parts.map(p=>[p.key,p]));
  const scores={};let reason="";
  for(const [part,raw] of Object.entries(values)){
   const spec=validParts.get(part),value=typeof raw==="string"?toAsciiDigits(raw):raw;
   if(!spec){reason="Unknown mark component";break}
   if(value===""||value===null){scores[part]=null;continue}
   if(!Number.isFinite(Number(value))||Number(value)<0||Number(value)>spec.max){
    reason=student.name+" · "+subject.name+" · "+spec.label+" must be between 0 and "+spec.max;
    break;
   }
   scores[part]=Number(value);
  }
  if(reason||!Object.keys(scores).length){invalid.push({key,reason:reason||"No marks to save"});continue}
  ready.push({studentId,subjectId,scores});
 }
 return {ready,invalid};
}
/** Remove only values actually acknowledged by the server, not values typed during flight. */
export function clearSavedMarkEdits(current,batch){
 const next={...current};
 for(const entry of batch){
  const key=keyFor(entry.studentId,entry.subjectId),currentValues=next[key];
  if(!currentValues)continue;
  const retained={...currentValues};
  for(const [part,saved] of Object.entries(entry.scores)){
   const now=retained[part];
   if(now===undefined)continue;
   if(saved===null?now===""||now===null:now!==""&&now!==null&&Number(toAsciiDigits(now))===saved)
    delete retained[part];
  }
  if(Object.keys(retained).length)next[key]=retained;
  else delete next[key];
 }
 return next;
}
