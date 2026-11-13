export const publicationKey=(examId,studentId)=>examId+"_"+studentId;
export function resultIsPublished(exam,record){
 // Global publish/unpublish overrides previous individual decisions.
 const examVersion=exam?.publicationVersion;
 const recordVersion=record?.publicationVersion;
 return record&&typeof record.published==="boolean"&&examVersion===recordVersion
  ?record.published:!!exam?.published;
}
