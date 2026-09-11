import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFees } from "./fees.functions";

export type Fees = Awaited<ReturnType<typeof getFees>>;
export type FeeAccount = Fees["accounts"][number];
export type FeePayment = Fees["payments"][number];

export const feesQueryKey = ["fees"] as const;

export function useFees() {
  return useQuery({
    queryKey: feesQueryKey,
    queryFn: () => getFees(),
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });
}

export function useRefreshFees() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: feesQueryKey });
}

export function formatNaira(amount: number) {
  return `₦${(amount ?? 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting approval",
  approved: "Approved",
  rejected: "Rejected",
};

/** Total approved so far for a student in a term. */
export function approvedTotal(payments: FeePayment[], studentId: string, termId?: string) {
  return payments
    .filter((p) => p.studentId === studentId && p.status === "approved" && (!termId || p.termId === termId))
    .reduce((sum, p) => sum + p.amount, 0);
}
