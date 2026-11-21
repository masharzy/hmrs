/** Academic admission sessions follow the Bangladesh calendar year, not the server's UTC year. */
export function getAdmissionSessionYear(date=new Date()){
 return Number(new Intl.DateTimeFormat("en-US",{year:"numeric",timeZone:"Asia/Dhaka"}).format(date));
}

export function getAdmissionSessionOptions(year=getAdmissionSessionYear()){
 return [[String(year),String(year)+" (Current)"],[String(year+1),String(year+1)]];
}

/** Do not retroactively change the session of applications created before this field existed. */
export function storedAdmissionSession(record,now=new Date()){
 const explicit=String(record?.session??"").trim();
 if(/^\d{4}$/.test(explicit))return explicit;
 const timestamp=record?.createdAt;
 const created=typeof timestamp==="string"?new Date(timestamp):null;
 return String(getAdmissionSessionYear(created&&!Number.isNaN(created.getTime())?created:now));
}

export function allowedAdmissionSession(value,{now=new Date(),existingSession=""}={}){
 const session=String(value??"").trim();
 if(!/^\d{4}$/.test(session))return false;
 return getAdmissionSessionOptions(getAdmissionSessionYear(now)).some(([year])=>year===session)
  || (!!existingSession&&session===String(existingSession));
}
