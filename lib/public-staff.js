import { TEACHER_SUBJECT_OPTIONS, cleanAssignedClasses } from "./teacher-subjects.js";

const SUBJECT_NAMES = new Map(TEACHER_SUBJECT_OPTIONS.map(s => [s.id, s.name]));
const httpsUrl = value => typeof value === "string" && /^https:\/\/[^\s]+$/i.test(value.trim()) ? value.trim().slice(0, 1000) : "";

/**
 * Public homepage view of teacher accounts. Only a display name, an HTTPS portrait, homeroom
 * classes and subject names leave the server: no phone, uid, PIN data or internal ids.
 */
export function publicTeachers(users) {
  return (Array.isArray(users) ? users : [])
    .filter(u => u && u.active !== false && !u.deleting && typeof u.name === "string" && u.name.trim())
    .map(u => {
      const roles = Array.isArray(u.roles) && u.roles.length ? u.roles : [u.role];
      const homeroom = roles.includes("class_teacher") ? cleanAssignedClasses(u.classTeacherClasses || u.assignedClasses) : [];
      return {
        name: u.name.trim().slice(0, 120),
        photoUrl: httpsUrl(u.photoUrl),
        isClassTeacher: roles.includes("class_teacher"),
        homeroom,
        subjects: (Array.isArray(u.teachingSubjects) ? u.teachingSubjects : [])
          .map(id => SUBJECT_NAMES.get(String(id))).filter(Boolean).slice(0, 4)
      };
    })
    .sort((a, b) => Number(b.isClassTeacher) - Number(a.isClassTeacher) || a.name.localeCompare(b.name, "bn"));
}
