export type Role =
  | "super_admin"
  | "school_admin"
  | "principal"
  | "vp_academic"
  | "class_teacher"
  | "subject_teacher";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  staffId?: string;
  subjectIds?: string[]; // for subject teachers
  classIds?: string[]; // classes taught / class teacher
}

export interface ClassLevel {
  id: string;
  name: string;
  level: "Nursery" | "Primary" | "JSS" | "SS";
  classTeacherId?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  classId: string;
  teacherId: string;
}

export interface Student {
  id: string;
  admissionNo: string;
  name: string;
  gender: "Male" | "Female";
  dob: string;
  classId: string;
  parentName: string;
  parentPhone: string;
  address: string;
}

export interface Score {
  studentId: string;
  subjectId: string;
  ca1: number;        // max 20
  ca2: number;        // max 10
  assignment: number; // max 10
  exam: number;       // max 60
}

export const SCHOOL = {
  name: "Greenfield College",
  motto: "Knowledge · Integrity · Excellence",
  address: "12 Palm Avenue, Lagos, Nigeria",
  phone: "+234 812 000 4433",
  email: "info@greenfield.edu.ng",
  website: "greenfield.edu.ng",
  session: "2025/2026",
  term: "First Term",
  nextTermBegins: "Jan 8, 2026",
};

export const USERS: User[] = [
  { id: "u1", name: "Dr. Ada Obi", email: "admin@greenfield.edu.ng", role: "school_admin" },
  { id: "u2", name: "Mr. Samuel Okoro", email: "principal@greenfield.edu.ng", role: "principal" },
  { id: "u7", name: "Mrs. Nkechi Umeh", email: "vp.academic@greenfield.edu.ng", role: "vp_academic", staffId: "STF-002" },
  { id: "u3", name: "Mrs. Grace Adewale", email: "grace@greenfield.edu.ng", role: "class_teacher", staffId: "STF-014", classIds: ["c-ss1a"] },
  { id: "u4", name: "Mr. John Bello", email: "john@greenfield.edu.ng", role: "subject_teacher", staffId: "STF-021", subjectIds: ["s-math-ss1a", "s-math-ss1b"] },
  { id: "u5", name: "Mr. Musa Idris", email: "musa@greenfield.edu.ng", role: "subject_teacher", staffId: "STF-030", subjectIds: ["s-phy-ss1a"] },
  { id: "u6", name: "Root", email: "root@lovable.dev", role: "super_admin" },
];

export const CLASSES: ClassLevel[] = [
  { id: "c-nur1", name: "Nursery 1", level: "Nursery" },
  { id: "c-nur2", name: "Nursery 2", level: "Nursery" },
  { id: "c-pri1", name: "Primary 1", level: "Primary" },
  { id: "c-pri3", name: "Primary 3", level: "Primary" },
  { id: "c-pri6", name: "Primary 6", level: "Primary" },
  { id: "c-jss1a", name: "JSS 1A", level: "JSS" },
  { id: "c-jss2a", name: "JSS 2A", level: "JSS" },
  { id: "c-jss3a", name: "JSS 3A", level: "JSS" },
  { id: "c-ss1a", name: "SS 1A", level: "SS", classTeacherId: "u3" },
  { id: "c-ss1b", name: "SS 1B", level: "SS" },
  { id: "c-ss2a", name: "SS 2A", level: "SS" },
  { id: "c-ss3a", name: "SS 3A", level: "SS" },
];

export const SUBJECTS: Subject[] = [
  { id: "s-math-ss1a", name: "Mathematics", code: "MTH", classId: "c-ss1a", teacherId: "u4" },
  { id: "s-phy-ss1a", name: "Physics", code: "PHY", classId: "c-ss1a", teacherId: "u5" },
  { id: "s-chem-ss1a", name: "Chemistry", code: "CHM", classId: "c-ss1a", teacherId: "u3" },
  { id: "s-eng-ss1a", name: "English Language", code: "ENG", classId: "c-ss1a", teacherId: "u3" },
  { id: "s-bio-ss1a", name: "Biology", code: "BIO", classId: "c-ss1a", teacherId: "u5" },
  { id: "s-math-ss1b", name: "Mathematics", code: "MTH", classId: "c-ss1b", teacherId: "u4" },
];

const firstNames = ["Ahmed", "Mary", "Musa", "Chinelo", "David", "Fatima", "Emeka", "Grace", "Sade", "Ibrahim", "Ngozi", "Kunle", "Zainab", "Peter", "Halima"];
const lastNames = ["Okafor", "Bello", "Ibrahim", "Okonkwo", "Adeyemi", "Musa", "Eze", "Danjuma", "Okoro", "Balogun", "Yusuf", "Ojo", "Nwosu", "Aliyu", "Umar"];

function seedStudents(): Student[] {
  const out: Student[] = [];
  let i = 1;
  for (const cls of CLASSES) {
    const n = cls.id === "c-ss1a" ? 12 : 8;
    for (let k = 0; k < n; k++) {
      const fn = firstNames[(i * 3) % firstNames.length];
      const ln = lastNames[(i * 5) % lastNames.length];
      out.push({
        id: `st-${i}`,
        admissionNo: `GC/${2025}/${String(1000 + i).padStart(4, "0")}`,
        name: `${fn} ${ln}`,
        gender: i % 2 === 0 ? "Male" : "Female",
        dob: `20${10 + (i % 4)}-0${1 + (i % 8)}-1${i % 9}`,
        classId: cls.id,
        parentName: `Mr. ${ln}`,
        parentPhone: `+2348${String(10000000 + i * 137).slice(0, 8)}`,
        address: `${i} Palm Avenue, Lagos`,
      });
      i++;
    }
  }
  return out;
}

export const STUDENTS: Student[] = seedStudents();

function seedScores(): Score[] {
  const out: Score[] = [];
  for (const sub of SUBJECTS) {
    const classStudents = STUDENTS.filter((s) => s.classId === sub.classId);
    for (const st of classStudents) {
      const seed = (st.id.charCodeAt(3) + sub.id.length) % 20;
      out.push({
        studentId: st.id,
        subjectId: sub.id,
        ca1: 12 + (seed % 8),        // 12–19 / 20
        ca2: 4 + ((seed * 3) % 6),   // 4–9 / 10
        assignment: 4 + (seed % 6),  // 4–9 / 10
        exam: 35 + ((seed * 7) % 25),// 35–59 / 60
      });
    }
  }
  return out;
}

export const SCORES: Score[] = seedScores();

export interface GradeBand {
  min: number;
  max: number;
  grade: string;
  remark: string;
}

export const GRADE_BANDS: GradeBand[] = [
  { min: 70, max: 100, grade: "A", remark: "Excellent" },
  { min: 60, max: 69, grade: "B", remark: "Very Good" },
  { min: 50, max: 59, grade: "C", remark: "Credit" },
  { min: 45, max: 49, grade: "D", remark: "Pass" },
  { min: 40, max: 44, grade: "E", remark: "Fair" },
  { min: 0, max: 39, grade: "F", remark: "Fail" },
];

export function gradeFor(total: number): GradeBand {
  return GRADE_BANDS.find((g) => total >= g.min && total <= g.max) ?? GRADE_BANDS[GRADE_BANDS.length - 1];
}

export function scoreTotals(s: Score) {
  const caTotal = s.ca1 + s.ca2 + s.assignment + s.practical;
  const total = caTotal + s.exam;
  return { caTotal, total };
}

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function classBroadsheet(classId: string) {
  const classSubjects = SUBJECTS.filter((s) => s.classId === classId);
  const classStudents = STUDENTS.filter((s) => s.classId === classId);
  const rows = classStudents.map((student) => {
    const perSubject = classSubjects.map((sub) => {
      const sc = SCORES.find((x) => x.studentId === student.id && x.subjectId === sub.id);
      const { total } = sc ? scoreTotals(sc) : { total: 0 };
      return { subjectId: sub.id, total };
    });
    const total = perSubject.reduce((a, b) => a + b.total, 0);
    const avg = perSubject.length ? total / perSubject.length : 0;
    return { student, perSubject, total, average: avg };
  });
  // Position with tie handling (dense-ish: same rank for ties, next skips)
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  let lastTotal = -1;
  let lastRank = 0;
  sorted.forEach((row, idx) => {
    if (row.total === lastTotal) {
      (row as any).position = lastRank;
    } else {
      lastRank = idx + 1;
      lastTotal = row.total;
      (row as any).position = lastRank;
    }
  });
  return { subjects: classSubjects, rows: sorted as (typeof rows[number] & { position: number })[] };
}
