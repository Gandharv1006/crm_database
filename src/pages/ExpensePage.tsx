import { useState, useEffect, type FormEvent } from "react";
import {
  Plus,
  Calendar,
  IndianRupee,
  Receipt,
  Search,
  X,
  Loader2,
  FileText,
  User,
  ExternalLink,
  Download
} from "lucide-react";
import { getAllExpenses, getAllEmployees, addExpense } from "@/services/db";
import { exportExpensesPDF } from "@/services/export";
import { toast } from "sonner";
import clsx from "clsx";
import styles from "./ExpensePage.module.css";

export default function ExpensePage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [exps, emps] = await Promise.all([
        getAllExpenses(),
        getAllEmployees()
      ]);
      setExpenses(exps);
      setEmployees(emps);
    } catch (err) {
      console.error("Failed to load expenses or employees:", err);
      toast.error("Failed to load expense records");
    } finally {
      setLoading(false);
    }
  }

  const filteredExpenses = expenses.filter((exp) => {
    const query = searchQuery.toLowerCase();
    const payTo = (exp.pay_to_display || "").toLowerCase();
    return (
      exp.title?.toLowerCase().includes(query) ||
      payTo.includes(query) ||
      exp.reason?.toLowerCase().includes(query)
    );
  });

  const totalExpenseAmount = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalLogsCount = expenses.length;

  const handleDownloadPDF = () => {
    if (filteredExpenses.length === 0) {
      toast.error("No expenses to export");
      return;
    }
    exportExpensesPDF(filteredExpenses);
  };

  if (loading) {
    return (
      <div className={clsx("page-enter", styles.container)}>
        <div className={styles.headerRow}>
          <div>
            <div className="h-6 w-32 skeleton" />
            <div className="h-4 w-64 skeleton" style={{ marginTop: "0.5rem" }} />
          </div>
          <div className="h-10 w-36 skeleton" />
        </div>
        <div className="h-12 w-full skeleton" style={{ borderRadius: "1rem" }} />
        <div className="skeleton" style={{ height: "16rem", borderRadius: "1rem" }} />
      </div>
    );
  }

  return (
    <div className={clsx("page-enter", styles.container)}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.headerTitle}>Expenses</h1>
          <p className={styles.headerSubtitle}>
            Track and record organizational expenditures, salaries, and other operational pay-outs.
          </p>
        </div>
        <div className={styles.actionsWrapper}>
          <button className="btn-secondary text-xs flex items-center gap-2" onClick={handleDownloadPDF}>
            <Download size={14} />
            Download PDF
          </button>
          <button className="btn-primary text-xs flex items-center gap-2" onClick={() => setShowAddDialog(true)}>
            <Plus size={14} />
            Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={clsx(styles.statsGrid, "stagger-children")}>
        <div className={clsx("stat-card", styles.statCard)}>
          <div className={styles.statHeader}>
            <div className="icon-badge icon-badge-danger">
              <IndianRupee size={20} />
            </div>
            <span className={styles.statTitle}>Total Outflow</span>
          </div>
          <p className={styles.statValue}>₹{totalExpenseAmount.toLocaleString()}</p>
        </div>
        <div className={clsx("stat-card", styles.statCard)}>
          <div className={styles.statHeader}>
            <div className="icon-badge icon-badge-brand">
              <Receipt size={20} />
            </div>
            <span className={styles.statTitle}>Expense Vouchers</span>
          </div>
          <p className={styles.statValue}>{totalLogsCount}</p>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className={styles.filtersRow}>
        <div className={styles.searchWrapper}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: "2.25rem" }}
            placeholder="Search expenses by title, recipient, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Expense Log Table */}
      <div className={clsx("glass-card-elevated", styles.tableCard)} style={{ padding: "1.5rem", overflow: "hidden" }}>
        <div className={clsx(styles.tableWrapper, "custom-scrollbar")}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Expense Voucher</th>
                <th>Recipient (Pay To)</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Reason / Description</th>
                <th>Logged At</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp, idx) => (
                  <tr key={idx} className="transition-colors">
                    <td>
                      <div className={styles.voucherInfo}>
                        <div className={styles.voucherIcon}>
                          <FileText size={16} />
                        </div>
                        <span className={styles.voucherTitle}>{exp.title}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.recipientWrapper}>
                        <span className={styles.recipientName}>
                          {exp.pay_to_type === "EMPLOYEE" ? (
                            <>
                              <User size={14} style={{ color: "var(--color-brand-400)", flexShrink: 0 }} />
                              <span>{exp.pay_to_display}</span>
                              <span className={styles.empBadge}>
                                EMP
                              </span>
                            </>
                          ) : (
                            <>
                              <ExternalLink size={14} style={{ color: "var(--color-warning)", flexShrink: 0 }} />
                              <span>{exp.pay_to_display}</span>
                            </>
                          )}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.expenseAmount}>
                        ₹{Number(exp.amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className={styles.expenseDate}>
                        {new Date(exp.expense_date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                    </td>
                    <td style={{ maxWidth: "20rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span className={styles.expenseReason} title={exp.reason}>
                        {exp.reason || "—"}
                      </span>
                    </td>
                    <td>
                      <span className={styles.loggedTime}>
                        {new Date(exp.created_at).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 0", color: "var(--color-text-muted)" }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: "500" }}>No expense logs match your criteria.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Dialog */}
      {showAddDialog && (
        <AddExpenseDialog
          employees={employees}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Add Expense Dialog Component
// ────────────────────────────────────────────────────────────
function AddExpenseDialog({
  employees,
  onClose,
  onSuccess
}: {
  employees: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    pay_to_type: "EMPLOYEE", // Default type
    employee_id: "",
    pay_to_name: "",
    amount: "",
    expense_date: new Date().toISOString().substring(0, 10), // Defaults to today
    reason: ""
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Expense Title is required");
      return;
    }
    const amt = Number(form.amount) || 0;
    if (amt <= 0) {
      toast.error("Amount must be a positive number greater than 0");
      return;
    }

    if (form.pay_to_type === "EMPLOYEE") {
      if (!form.employee_id) {
        toast.error("Please select an employee");
        return;
      }
    } else {
      if (!form.pay_to_name.trim()) {
        toast.error("Payee name is required for other expenditures");
        return;
      }
    }

    setSaving(true);
    try {
      await addExpense({
        title: form.title.trim(),
        pay_to_type: form.pay_to_type as "EMPLOYEE" | "OTHER",
        employee_id: form.pay_to_type === "EMPLOYEE" ? Number(form.employee_id) : null,
        pay_to_name: form.pay_to_type === "OTHER" ? form.pay_to_name.trim() : null,
        amount: amt,
        expense_date: form.expense_date,
        reason: form.reason.trim() || null
      });
      toast.success("Expense logged successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to log expense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "540px" }}>
        <div className="modal-header">
          <h2 className={styles.modalTitle}>Log Organizational Expense</h2>
          <button className="btn-ghost" style={{ padding: "0.5rem", borderRadius: "0.5rem" }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGrid}>
            <div className={clsx(styles.spanFull, styles.formGroup)}>
              <label className={styles.formLabel}>Expense Title *</label>
              <input
                className="input-field"
                required
                placeholder="e.g. Office Rent, Server Hosting, Salary Paid"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Pay To Type *</label>
              <select
                className="form-select"
                value={form.pay_to_type}
                onChange={(e) => {
                  set("pay_to_type", e.target.value);
                  set("employee_id", "");
                  set("pay_to_name", "");
                }}
              >
                <option value="EMPLOYEE">Employee (Internal Staff)</option>
                <option value="OTHER">Other (External Payee)</option>
              </select>
            </div>

            {/* Dynamic payee field based on Pay To Type selection */}
            {form.pay_to_type === "EMPLOYEE" ? (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Select Employee *</label>
                <select
                  className="form-select"
                  required
                  value={form.employee_id}
                  onChange={(e) => set("employee_id", e.target.value)}
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.name} ({emp.role || "Staff"})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Payee Name (Specify Text) *</label>
                <input
                  className="input-field"
                  required
                  placeholder="Enter name / company"
                  value={form.pay_to_name}
                  onChange={(e) => set("pay_to_name", e.target.value)}
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Amount (₹) *</label>
              <input
                className="input-field font-mono text-danger font-bold text-lg"
                required
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Expense Date *</label>
              <input
                className="input-field font-mono"
                required
                type="date"
                value={form.expense_date}
                onChange={(e) => set("expense_date", e.target.value)}
              />
            </div>
            <div className={clsx(styles.spanFull, styles.formGroup)}>
              <label className={styles.formLabel}>Reason / Description</label>
              <textarea
                className="input-field"
                style={{ minHeight: "80px", resize: "vertical" }}
                placeholder="Provide short explanation..."
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
              />
            </div>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Loader2 size={16} className="animate-spin" style={{ marginRight: "0.5rem" }} /> Logging...
                </div>
              ) : (
                "Log Expense"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

