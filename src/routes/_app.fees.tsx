import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Banknote,
  CheckCircle2,
  Clock,
  Landmark,
  Receipt,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useAcademics } from "@/lib/use-academics";
import {
  useFees,
  useRefreshFees,
  formatNaira,
  approvedTotal,
  PAYMENT_STATUS_LABEL,
  type FeePayment,
} from "@/lib/use-fees";
import {
  saveFeeAccount,
  deleteFeeAccount,
  submitFeePayment,
  reviewFeePayment,
} from "@/lib/fees.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/fees")({
  head: () => ({
    meta: [
      { title: "School Fees · Greenfield College Portal" },
      {
        name: "description",
        content:
          "Publish school fee account details, let students submit transaction IDs or receipts, and approve payments.",
      },
      { property: "og:title", content: "School Fees · Greenfield College Portal" },
      {
        property: "og:description",
        content: "School fee payment desk for accountants, students and class teachers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeesPage,
});

const LEVELS = ["All levels", "Nursery", "Primary", "JSS", "SS"];

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary";
  return <Badge variant={variant as never}>{PAYMENT_STATUS_LABEL[status] ?? status}</Badge>;
}

function FeesPage() {
  const { user } = useAuth();
  const { data: academics } = useAcademics();
  const { data: fees, isLoading } = useFees();
  const refresh = useRefreshFees();

  const role = user.role;
  const isStudent = role === "student";
  const canManage = fees?.canManage ?? false;
  const terms = academics?.terms ?? [];
  const currentTermId = academics?.settings.currentTermId ?? "";
  const students = academics?.students ?? [];
  const classes = academics?.classes ?? [];
  const payments = fees?.payments ?? [];
  const accounts = fees?.accounts ?? [];

  const studentName = (id: string) => students.find((s) => s.id === id)?.name ?? id;
  const studentClass = (id: string) => {
    const s = students.find((x) => x.id === id);
    return classes.find((c) => c.id === s?.classId)?.name ?? "—";
  };
  const termName = (id: string) => terms.find((t) => t.id === id)?.name ?? id;

  const myStudentId = academics?.me.studentId ?? user.studentId ?? "";
  const myClassIds = classes.filter((c) => c.classTeacherId === user.id).map((c) => c.id);

  /* ------------------------------- accountant ------------------------------- */
  const emptyAccount = {
    bankName: "",
    accountName: "",
    accountNumber: "",
    amountDue: "",
    termId: currentTermId,
    level: "All levels",
    instructions: "",
    isPublished: true,
  };
  const [accForm, setAccForm] = useState(emptyAccount);

  const saveAccount = useServerFn(saveFeeAccount);
  const removeAccount = useServerFn(deleteFeeAccount);
  const review = useServerFn(reviewFeePayment);
  const submitPayment = useServerFn(submitFeePayment);

  const saveMutation = useMutation({
    mutationFn: (input: Parameters<typeof saveFeeAccount>[0]) => saveAccount(input),
    onSuccess: () => {
      toast.success("Fee account details saved");
      setAccForm({ ...emptyAccount, termId: currentTermId });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeAccount({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewMutation = useMutation({
    mutationFn: (input: { paymentId: string; action: "approve" | "reject" }) =>
      review({ data: input }),
    onSuccess: (r) => {
      toast.success(r.status === "approved" ? "Payment approved" : "Payment rejected");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* --------------------------------- student -------------------------------- */
  const emptyPay = {
    amount: "",
    method: "transfer" as "transfer" | "cash" | "pos" | "online",
    transactionRef: "",
    note: "",
  };
  const [payForm, setPayForm] = useState(emptyPay);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!myStudentId) throw new Error("Your account is not linked to a student record yet");
      let receiptPath = "";
      if (receipt) {
        setUploading(true);
        const ext = receipt.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("receipts").upload(path, receipt);
        setUploading(false);
        if (error) throw new Error(error.message);
        receiptPath = path;
      }
      return submitPayment({
        data: {
          studentId: myStudentId,
          termId: currentTermId,
          amount: Number(payForm.amount || 0),
          method: payForm.method,
          transactionRef: payForm.transactionRef,
          receiptPath,
          note: payForm.note,
        },
      });
    },
    onSuccess: () => {
      toast.success("Payment sent to the accountant for approval");
      setPayForm(emptyPay);
      setReceipt(null);
      refresh();
    },
    onError: (e: Error) => {
      setUploading(false);
      toast.error(e.message);
    },
  });

  const myPayments = useMemo(
    () => payments.filter((p) => p.studentId === myStudentId),
    [payments, myStudentId],
  );

  const feeDue = useMemo(() => {
    const forTerm = accounts.filter((a) => !a.termId || a.termId === currentTermId);
    return forTerm.reduce((max, a) => Math.max(max, a.amountDue), 0);
  }, [accounts, currentTermId]);

  /* ------------------------------ teacher record ---------------------------- */
  const recordRows = useMemo(() => {
    const list = canManage || role === "principal" || role === "vp_academic"
      ? students
      : students.filter((s) => myClassIds.includes(s.classId));
    return list.map((s) => {
      const paid = approvedTotal(payments, s.id, currentTermId);
      const pending = payments.some(
        (p) => p.studentId === s.id && p.termId === currentTermId && p.status === "pending",
      );
      return { student: s, paid, pending };
    });
  }, [students, payments, currentTermId, canManage, role, myClassIds]);

  const pendingQueue = payments.filter((p) => p.status === "pending");

  const renderPaymentRow = (p: FeePayment, withActions: boolean) => (
    <tr key={p.id} className="border-border/60 border-b last:border-0">
      <td className="py-2 pr-3">
        <div className="font-medium">{studentName(p.studentId)}</div>
        <div className="text-muted-foreground text-xs">{studentClass(p.studentId)}</div>
      </td>
      <td className="py-2 pr-3 text-xs">{termName(p.termId)}</td>
      <td className="py-2 pr-3 font-medium">{formatNaira(p.amount)}</td>
      <td className="py-2 pr-3 text-xs capitalize">{p.method}</td>
      <td className="py-2 pr-3 text-xs">
        {p.transactionRef || <span className="text-muted-foreground">—</span>}
      </td>
      <td className="py-2 pr-3 text-xs">
        {p.receiptUrl ? (
          <a
            href={p.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary inline-flex items-center gap-1 underline"
          >
            <Receipt className="h-3.5 w-3.5" /> View
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-2 pr-3">
        <StatusBadge status={p.status} />
      </td>
      {withActions && (
        <td className="py-2 text-right">
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={p.status === "approved" || reviewMutation.isPending}
              onClick={() => reviewMutation.mutate({ paymentId: p.id, action: "approve" })}
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={p.status === "rejected" || reviewMutation.isPending}
              onClick={() => reviewMutation.mutate({ paymentId: p.id, action: "reject" })}
            >
              <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
            </Button>
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">School Fees</h1>
        <p className="text-muted-foreground text-sm">
          {isStudent
            ? "Pay into the published school account, then send your transaction ID or receipt for approval."
            : "Publish payment account details, approve student payments and track who has settled fees."}
        </p>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading fee records…</p>}

      {/* Published account details — everyone sees these */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4" /> Payment account details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No account details have been published yet.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {accounts.map((a) => (
                <div key={a.id} className="border-border rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display font-semibold">{a.bankName}</p>
                      <p className="text-sm">{a.accountName}</p>
                      <p className="font-mono text-lg tracking-wide">{a.accountNumber}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={a.isPublished ? "default" : "secondary"}>
                        {a.isPublished ? "Published" : "Draft"}
                      </Badge>
                      {canManage && (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Remove account details"
                          onClick={() => deleteMutation.mutate(a.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">
                    <p>
                      Amount due: <span className="text-foreground font-medium">{formatNaira(a.amountDue)}</span>
                      {a.level ? ` · ${a.level}` : ""}
                      {a.termId ? ` · ${termName(a.termId)}` : ""}
                    </p>
                    {a.instructions && <p>{a.instructions}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accountant: add account details */}
      {canManage && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-4 w-4" /> Add / publish account details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate({
                  data: {
                    bankName: accForm.bankName,
                    accountName: accForm.accountName,
                    accountNumber: accForm.accountNumber,
                    amountDue: Number(accForm.amountDue || 0),
                    termId: accForm.termId,
                    level: accForm.level === "All levels" ? "" : accForm.level,
                    instructions: accForm.instructions,
                    isPublished: accForm.isPublished,
                  },
                });
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="bankName">Bank</Label>
                <Input
                  id="bankName"
                  value={accForm.bankName}
                  maxLength={120}
                  onChange={(e) => setAccForm({ ...accForm, bankName: e.target.value })}
                  placeholder="First Bank"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="accountName">Account name</Label>
                <Input
                  id="accountName"
                  value={accForm.accountName}
                  maxLength={120}
                  onChange={(e) => setAccForm({ ...accForm, accountName: e.target.value })}
                  placeholder="Greenfield College"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="accountNumber">Account number</Label>
                <Input
                  id="accountNumber"
                  value={accForm.accountNumber}
                  maxLength={40}
                  onChange={(e) => setAccForm({ ...accForm, accountNumber: e.target.value })}
                  placeholder="0123456789"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amountDue">Amount due</Label>
                <Input
                  id="amountDue"
                  type="number"
                  min={0}
                  value={accForm.amountDue}
                  onChange={(e) => setAccForm({ ...accForm, amountDue: e.target.value })}
                  placeholder="75000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feeTerm">Term</Label>
                <Select
                  value={accForm.termId || undefined}
                  onValueChange={(v) => setAccForm({ ...accForm, termId: v })}
                >
                  <SelectTrigger id="feeTerm">
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.session} · {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feeLevel">Applies to</Label>
                <Select
                  value={accForm.level}
                  onValueChange={(v) => setAccForm({ ...accForm, level: v })}
                >
                  <SelectTrigger id="feeLevel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label htmlFor="instructions">Instructions to students</Label>
                <Textarea
                  id="instructions"
                  value={accForm.instructions}
                  maxLength={1000}
                  onChange={(e) => setAccForm({ ...accForm, instructions: e.target.value })}
                  placeholder="Use the student admission number as the payment narration."
                />
              </div>
              <div className="flex items-center gap-3 md:col-span-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={accForm.isPublished}
                    onChange={(e) => setAccForm({ ...accForm, isPublished: e.target.checked })}
                  />
                  Publish to all student portals
                </label>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving…" : "Save details"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Student: make a payment */}
      {isStudent && (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="h-4 w-4" /> Send a payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  payMutation.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount paid</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={0}
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    placeholder={feeDue ? String(feeDue) : "50000"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="method">Payment method</Label>
                  <Select
                    value={payForm.method}
                    onValueChange={(v) => setPayForm({ ...payForm, method: v as typeof payForm.method })}
                  >
                    <SelectTrigger id="method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">Bank transfer</SelectItem>
                      <SelectItem value="cash">Cash deposit</SelectItem>
                      <SelectItem value="pos">POS</SelectItem>
                      <SelectItem value="online">Online payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ref">Transaction ID</Label>
                  <Input
                    id="ref"
                    value={payForm.transactionRef}
                    maxLength={120}
                    onChange={(e) => setPayForm({ ...payForm, transactionRef: e.target.value })}
                    placeholder="TRX-88213904"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="receipt">Upload receipt (optional)</Label>
                  <Input
                    id="receipt"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    value={payForm.note}
                    maxLength={500}
                    onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
                    placeholder="Part payment for the term"
                  />
                </div>
                <Button type="submit" disabled={payMutation.isPending || uploading} className="w-full">
                  {uploading ? "Uploading receipt…" : payMutation.isPending ? "Sending…" : "Send to accountant"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-card lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" /> My payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-3 text-sm">
                Approved this term:{" "}
                <span className="text-foreground font-semibold">
                  {formatNaira(approvedTotal(payments, myStudentId, currentTermId))}
                </span>
                {feeDue ? ` of ${formatNaira(feeDue)}` : ""}
              </p>
              {myPayments.length === 0 ? (
                <p className="text-muted-foreground text-sm">You have not submitted any payment yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-muted-foreground border-border border-b text-xs">
                      <tr>
                        <th className="py-2 font-medium">Term</th>
                        <th className="py-2 font-medium">Amount</th>
                        <th className="py-2 font-medium">Transaction ID</th>
                        <th className="py-2 font-medium">Receipt</th>
                        <th className="py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myPayments.map((p) => (
                        <tr key={p.id} className="border-border/60 border-b last:border-0">
                          <td className="py-2 pr-3 text-xs">{termName(p.termId)}</td>
                          <td className="py-2 pr-3 font-medium">{formatNaira(p.amount)}</td>
                          <td className="py-2 pr-3 text-xs">{p.transactionRef || "—"}</td>
                          <td className="py-2 pr-3 text-xs">
                            {p.receiptUrl ? (
                              <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                                View
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-2">
                            <StatusBadge status={p.status} />
                            {p.reviewNote && (
                              <p className="text-muted-foreground text-[11px]">{p.reviewNote}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Accountant: approval queue */}
      {canManage && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" /> Payments awaiting approval ({pendingQueue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingQueue.length === 0 ? (
              <p className="text-muted-foreground text-sm">No payments waiting for approval.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-muted-foreground border-border border-b text-xs">
                    <tr>
                      <th className="py-2 font-medium">Student</th>
                      <th className="py-2 font-medium">Term</th>
                      <th className="py-2 font-medium">Amount</th>
                      <th className="py-2 font-medium">Method</th>
                      <th className="py-2 font-medium">Transaction ID</th>
                      <th className="py-2 font-medium">Receipt</th>
                      <th className="py-2 font-medium">Status</th>
                      <th className="py-2 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>{pendingQueue.map((p) => renderPaymentRow(p, true))}</tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Staff: payment record per student */}
      {!isStudent && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" /> Fee record ·{" "}
              {currentTermId ? termName(currentTermId) : "current term"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recordRows.length === 0 ? (
              <p className="text-muted-foreground text-sm">No students to show.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-muted-foreground border-border border-b text-xs">
                    <tr>
                      <th className="py-2 font-medium">Student</th>
                      <th className="py-2 font-medium">Class</th>
                      <th className="py-2 font-medium">Approved paid</th>
                      <th className="py-2 font-medium">Balance</th>
                      <th className="py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recordRows.map(({ student, paid, pending }) => {
                      const balance = Math.max(feeDue - paid, 0);
                      return (
                        <tr key={student.id} className="border-border/60 border-b last:border-0">
                          <td className="py-2 pr-3">
                            <div className="font-medium">{student.name}</div>
                            <div className="text-muted-foreground text-xs">{student.admissionNo}</div>
                          </td>
                          <td className="py-2 pr-3 text-xs">
                            {classes.find((c) => c.id === student.classId)?.name ?? "—"}
                          </td>
                          <td className="py-2 pr-3 font-medium">{formatNaira(paid)}</td>
                          <td className="py-2 pr-3">{feeDue ? formatNaira(balance) : "—"}</td>
                          <td className="py-2">
                            {paid > 0 && (!feeDue || balance === 0) ? (
                              <Badge>Fees settled</Badge>
                            ) : pending ? (
                              <Badge variant="secondary">Awaiting approval</Badge>
                            ) : paid > 0 ? (
                              <Badge variant="secondary">Part payment</Badge>
                            ) : (
                              <Badge variant="destructive">Not paid</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
