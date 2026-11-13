export const publicationKey=(examId,studentId)=>examId+"_"+studentId;
export function resultIsPublished(exam,record){
 return record&&typeof record.published==="boolean"?record.published:!!exam?.published;
}
