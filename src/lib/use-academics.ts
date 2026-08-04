import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAcademics } from "./academics.functions";
import { gradeFor, scoreTotals, SCHOOL } from "./mock-data";

export type Academics = Awaited<ReturnType<typeof getAcademics>>;
export type ApiClass = Academics["classes"][number];
export type ApiSubject = Academics["subjects"][number];
export type ApiStudent = Academics["students"][number];
export type ApiScore = Academics["scores"][number];
export type ApiStaff = Academics["staff"][number];

export type WorkflowStage = "draft" | "vp_review" | "principal_review" | "approved" | "published";

export const STAGE_ORDER: WorkflowStage[] = [
  "draft",
  "vp_review",
  "principal_review",
  "approved",
  "published",
];

export const STAGE_LABEL: Record<WorkflowStage, string> = {
  draft: "Draft — scores in progress",
  vp_review: "Submitted · Awaiting VP (Academic)",
  principal_review: "VP approved · Awaiting Principal",
  approved: "Principal approved · Ready to publish",
  published: "Published to students & report cards",
};

export const academicsQueryKey = ["academics"] as const;

export function useAcademics() {
  return useQuery({
    queryKey: academicsQueryKey,
    queryFn: () => getAcademics(),
    staleTime: 30_000,
  });
}

export function useRefreshAcademics() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: academicsQueryKey });
}

export function stageFor(data: Academics | undefined, classId: string): WorkflowStage {
  const row = data?.approvals.find((a) => a.classId === classId);
  return (row?.stage as WorkflowStage) ?? "draft";
}

/** Subjects the signed-in user may enter scores for. */
export function subjectsForTeacher(data: Academics | undefined, userId: string, role: string) {
  if (!data) return [];
  if (role === "subject_teacher" || role === "class_teacher") {
    return data.subjects.filter((s) => s.teacherId === userId);
  }
  return data.subjects;
}

export interface BroadsheetRow {
  student: ApiStudent;
  perSubject: { subjectId: string; total: number }[];
  total: number;
  average: number;
  position: number;
}

export function buildBroadsheet(data: Academics | undefined, classId: string) {
  const subjects = (data?.subjects ?? []).filter((s) => s.classId === classId);
  const students = (data?.students ?? []).filter((s) => s.classId === classId);
  const scores = data?.scores ?? [];

  const rows = students.map((student) => {
    const perSubject = subjects.map((sub) => {
      const sc = scores.find((x) => x.studentId === student.id && x.subjectId === sub.id);
      const total = sc ? scoreTotals(sc).total : 0;
      return { subjectId: sub.id, total };
    });
    const total = perSubject.reduce((a, b) => a + b.total, 0);
    const average = perSubject.length ? total / perSubject.length : 0;
    return { student, perSubject, total, average, position: 0 };
  });

  const sorted = rows.sort((a, b) => b.total - a.total);
  let lastTotal = -1;
  let lastRank = 0;
  sorted.forEach((row, idx) => {
    if (row.total === lastTotal) {
      row.position = lastRank;
    } else {
      lastRank = idx + 1;
      lastTotal = row.total;
      row.position = lastRank;
    }
  });

  return { subjects, rows: sorted as BroadsheetRow[] };
}

export { gradeFor, scoreTotals };

export interface TermInfo {
  id: string;
  session: string;
  name: string;
  status: "open" | "closed" | "upcoming";
  /** e.g. "2025/2026 · First Term" */
  label: string;
  isOpen: boolean;
  nextTermBegins: string | null;
}

/** The term currently in session, derived from live school settings. */
export function currentTerm(data: Academics | undefined): TermInfo {
  const terms = data?.terms ?? [];
  const id = data?.settings.currentTermId ?? "";
  const term = terms.find((t) => t.id === id) ?? terms.find((t) => t.status === "open");
  const session = term?.session ?? SCHOOL.session;
  const name = term?.name ?? "No term in session";
  const status = (term?.status as TermInfo["status"]) ?? "closed";
  return {
    id: term?.id ?? "",
    session,
    name,
    status,
    label: `${session} · ${name}`,
    isOpen: status === "open",
    nextTermBegins: data?.settings.nextTermBegins ?? null,
  };
}

/** Next term that has not been closed yet, for resumption messaging. */
export function nextTerm(data: Academics | undefined) {
  const cur = currentTerm(data);
  const terms = data?.terms ?? [];
  const curRow = terms.find((t) => t.id === cur.id);
  return (
    terms.find(
      (t) =>
        t.session === (curRow?.session ?? cur.session) &&
        t.sortOrder > (curRow?.sortOrder ?? 0) &&
        t.status !== "closed",
    ) ?? null
  );
}
