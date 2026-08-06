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
    // Keep every portal (students included) in step with what admins publish.
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });
}

/** Terms of a class whose results have been published, newest first. */
export function publishedTerms(data: Academics | undefined, classId: string) {
  const published = new Set(
    (data?.approvals ?? [])
      .filter((a) => a.classId === classId && a.stage === "published")
      .map((a) => a.termId),
  );
  return (data?.terms ?? [])
    .filter((t) => published.has(t.id))
    .sort((a, b) => (a.session === b.session ? b.sortOrder - a.sortOrder : b.session.localeCompare(a.session)));
}


export function useRefreshAcademics() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: academicsQueryKey });
}

/** The term used for reads when a caller doesn't specify one. */
function resolveTermId(data: Academics | undefined, termId?: string) {
  if (termId) return termId;
  const settingsTerm = data?.settings.currentTermId;
  if (settingsTerm) return settingsTerm;
  return data?.terms.find((t) => t.status === "open")?.id ?? "";
}

export function stageFor(
  data: Academics | undefined,
  classId: string,
  termId?: string,
): WorkflowStage {
  const tid = resolveTermId(data, termId);
  const row = data?.approvals.find((a) => a.classId === classId && (!tid || a.termId === tid));
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

export function buildBroadsheet(data: Academics | undefined, classId: string, termId?: string) {
  const tid = resolveTermId(data, termId);
  const subjects = (data?.subjects ?? []).filter((s) => s.classId === classId);
  const students = (data?.students ?? []).filter((s) => s.classId === classId);
  const scores = (data?.scores ?? []).filter((s) => !tid || s.termId === tid);

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

/** All terms of a session, ordered. */
export function sessionTerms(data: Academics | undefined, session: string) {
  return (data?.terms ?? [])
    .filter((t) => t.session === session)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export type PromotionDecision = "promoted" | "probation" | "demoted";

export const PROMOTION_LABEL: Record<PromotionDecision, string> = {
  promoted: "Promoted",
  probation: "Promoted on probation",
  demoted: "Demoted",
};

export function decisionFor(average: number): PromotionDecision {
  if (average >= 40) return "promoted";
  if (average >= 37) return "probation";
  return "demoted";
}

/** Per-student averages across every term of a session (client preview of compilation). */
export function sessionCompilation(data: Academics | undefined, session: string, classId?: string) {
  const terms = sessionTerms(data, session);
  const termIds = terms.map((t) => t.id);
  const students = (data?.students ?? []).filter((s) => !classId || s.classId === classId);

  return students.map((student) => {
    const perTerm = terms.map((t) => {
      const { rows } = buildBroadsheet(data, student.classId, t.id);
      const row = rows.find((r) => r.student.id === student.id);
      return { termId: t.id, termName: t.name, average: row?.average ?? 0, hasScores: (row?.total ?? 0) > 0 };
    });
    const counted = perTerm.filter((p) => p.hasScores);
    const average = counted.length ? counted.reduce((a, b) => a + b.average, 0) / counted.length : 0;
    return {
      student,
      perTerm,
      termsCounted: counted.length,
      average: Math.round(average * 10) / 10,
      decision: decisionFor(average),
      termIds,
    };
  });
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
