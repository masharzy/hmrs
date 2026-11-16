export const publicationKey=(examId,studentId)=>examId+"_"+studentId;
export function resultIsPublished(exam,record){
 // Global publish/unpublish overrides previous individual decisions.
 const examVersion=exam?.publicationVersion;
 const recordVersion=record?.publicationVersion;
 return record&&typeof record.published==="boolean"&&examVersion===recordVersion
  ?record.published:!!exam?.published;
}
/**
 * Students whose result for this exam is currently published (whole-exam publish
 * or an individual publish). Published results are locked for editing; the
 * principal must unpublish first.
 */
export function publishedStudentIds(exam,records,studentIds){
 const byStudent=new Map((records||[]).map(r=>[r.studentId,r]));
 return new Set(studentIds.filter(id=>resultIsPublished(exam,byStudent.get(id))));
}
export const PUBLISHED_LOCK_MESSAGE="রেজাল্ট প্রকাশিত হয়েছে, তাই নম্বর বদলানো যাবে না। আগে Unpublish করুন, তারপর পরিবর্তন করুন।";
