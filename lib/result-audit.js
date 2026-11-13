import {evaluateTranscript} from "./academic.js";
export function auditExamScores(students,marks){
 const byStudent=new Map();
 for(const record of marks){
  const map=byStudent.get(record.studentId)||{};
  map[record.subjectId]=record.scores;byStudent.set(record.studentId,map);
 }
 const incomplete=[];
 for(const student of students){
  try{
   const result=evaluateTranscript(student,byStudent.get(student.id)||{});
   if(!result.complete)incomplete.push({
    studentId:student.id,name:student.name,grade:student.grade,
    group:student.group,roll:student.roll,
    missingSubjects:result.missingSubjects
   });
  }catch(e){incomplete.push({studentId:student.id,name:student.name,grade:student.grade,
    group:student.group,roll:student.roll,missingSubjects:["বিষয় নির্বাচন অসম্পূর্ণ"]});}
 }
 return {total:students.length,incompleteCount:incomplete.length,completeCount:students.length-incomplete.length,incomplete};
}
