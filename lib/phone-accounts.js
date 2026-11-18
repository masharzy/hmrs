import "server-only";
import { db } from "./firebase-admin";
import { makePinCredential, normalizePhone } from "./phone-pin";
import {studentPhoneOwners,addStudentPhoneOwner} from "./student-phone-sharing.js";

export function phoneRefs(store, phone, uid) {
  return {
    mapping: store.collection("loginPhones").doc(phone),
    credential: store.collection("loginCredentials").doc(uid),
    user: store.collection("users").doc(uid)
  };
}

/** Only call from an authenticated/authorized server operation. */
export async function registerPhoneCredential({ uid, phone: rawPhone, pin, userPatch = {}, transaction } ) {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw Object.assign(Error("সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন"), { status: 400 });
  const store = db(), refs = phoneRefs(store, phone, uid), credential = makePinCredential(pin);
  const write = async tx => {
    const [mappingSnap,existingCred,userSnap]=await Promise.all([
      tx.get(refs.mapping),tx.get(refs.credential),tx.get(refs.user)]);
    const role=userPatch.role||userSnap.data()?.role;
    const firstOwner=mappingSnap.exists?studentPhoneOwners(mappingSnap.data())[0]:null;
    const currentOwner=firstOwner?await tx.get(store.collection("users").doc(firstOwner)):null;
    // Staff phone credentials stay unique. Students can use their siblings' phone.
    if(mappingSnap.exists&&(role!=="student"||currentOwner?.data()?.role!=="student"))
      throw Object.assign(Error("এই নম্বর শিক্ষার্থী ছাড়া অন্য ধরনের অ্যাকাউন্টে ব্যবহৃত হচ্ছে"),{status:409});
    if(existingCred.exists)throw Object.assign(Error("এই অ্যাকাউন্টে PIN আগে থেকেই সেট করা আছে"),{status:409});
    if(role==="student")tx.set(refs.mapping,addStudentPhoneOwner(mappingSnap.data(),uid));
    else tx.create(refs.mapping,{uid,createdAt:new Date().toISOString()});
    tx.create(refs.credential, { ...credential, phone, createdAt: new Date().toISOString() });
    tx.set(refs.user, { ...userPatch, phone, pinEnabled: true }, { merge: true });
  };
  if (transaction) await transaction(write);
  else await store.runTransaction(write);
  return phone;
}
