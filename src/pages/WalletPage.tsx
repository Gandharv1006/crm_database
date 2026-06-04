import { useState, useEffect, type FormEvent } from "react";
import {
  Wallet,
  Search,
  Download,
  Plus,
  TrendingUp,
  TrendingDown,
  X,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { getAllTransactions, getWalletSummary, addFunds, getAllClasses } from "@/services/db";
import { downloadCSV, downloadPDF } from "@/services/export";
import { supabase } from "@/services/supabase";
import { toast } from "sonner";
import styles from "./WalletPage.module.css";
import clsx from "clsx";

export default function WalletPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Selected class for class-specific history
  const [selectedClassOwnerId, setSelectedClassOwnerId] = useState<number | null>(null);
  const [fundsDialogClass, setFundsDialogClass] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Subscribe to INSERT events on wallet_transactions.
    const channel = supabase
      .channel('wallet_transactions_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wallet_transactions' },
        (payload) => {
          const tx = payload.new as {
            transaction_id: number;
            owner_id: number;
            amount: number;
            transaction_type: 'DEPOSIT' | 'DEDUCTION';
            description: string;
            created_at: string;
          };
          
          // Update the local classes state array (wallet_balance field)
          setClasses((prev) =>
            prev.map((c) =>
              c.owner_id === tx.owner_id
                ? {
                    ...c,
                    wallet_balance:
                      tx.transaction_type === 'DEPOSIT'
                        ? c.wallet_balance + Number(tx.amount)
                        : c.wallet_balance - Math.abs(Number(tx.amount)),
                  }
                : c
            )
          );

          // Update transactions history list
          setTransactions((prev) => [tx, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadData() {
    try {
      const [txs, cls, s] = await Promise.all([
        getAllTransactions(),
        getAllClasses(),
        getWalletSummary()
      ]);
      setTransactions(txs);
      setClasses(cls);
      setSummary(s);
    } catch (err) {
      console.error("Failed to load wallet data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter classes list
  const classesWithFundsStats = classes.map((c) => {
    const classTxs = transactions.filter((tx) => tx.owner_id === c.owner_id);
    const totalAdded = classTxs
      .filter((tx) => tx.transaction_type === "DEPOSIT")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const totalDeducted = classTxs
      .filter((tx) => tx.transaction_type === "DEDUCTION")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    return {
      ...c,
      totalAdded,
      totalDeducted,
    };
  });

  const filteredClasses = classesWithFundsStats.filter((c) => {
    const q = search.toLowerCase();
    const className = c.institute_name || "";
    const ownerName = c.owner_name || "";
    return (
      !search ||
      className.toLowerCase().includes(q) ||
      ownerName.toLowerCase().includes(q)
    );
  });

  // Calculate active subscription classes (e.g. status is ACTIVE)
  const activeSubscriptionsCount = classes.filter(c => c.status === "ACTIVE").length;

  // Selected class details
  const selectedClass = classesWithFundsStats.find(c => c.owner_id === selectedClassOwnerId);
  const selectedClassTxs = transactions.filter(tx => tx.owner_id === selectedClassOwnerId);

  const handleDownloadReport = (format: "csv" | "pdf") => {
    const data = transactions.map((t) => ({
      Date: new Date(t.created_at).toLocaleString(),
      "Class Name": t.class_owners?.institute_name || "N/A",
      Owner: t.class_owners?.users?.full_name || "N/A",
      Description: t.description || "",
      Amount: `${t.transaction_type === "DEPOSIT" ? "+" : "-"}₹${Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    }));

    if (format === "csv") {
      downloadCSV(data, "wallet_transactions_report.csv");
    } else {
      downloadPDF(data, "wallet_transactions_report.pdf", "Wallet Transactions Log");
    }
  };

  const handleDownloadClassReport = (format: "csv" | "pdf") => {
    if (!selectedClass) return;
    const data = selectedClassTxs.map((t) => ({
      Date: new Date(t.created_at).toLocaleString(),
      Description: t.description || "",
      Type: t.transaction_type,
      Amount: `${t.transaction_type === "DEPOSIT" ? "+" : "-"}₹${Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    }));

    const filename = `${selectedClass.institute_name.replace(/\s+/g, "_")}_wallet_ledger`;
    const title = `${selectedClass.institute_name} - Wallet Transaction Ledger`;

    if (format === "csv") {
      downloadCSV(data, `${filename}.csv`);
    } else {
      downloadPDF(data, `${filename}.pdf`, title);
    }
  };

  const formatClassId = (regId: number | null) => {
    if (!regId) return "#CLS-0000";
    return `#CLS-${String(regId).padStart(4, "0")}`;
  };

  if (loading) {
    return (
      <div className={clsx("page-enter", styles.container)}>
        <div className={styles.statsGrid}>
          {[...Array(2)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className={clsx("page-enter", styles.container)}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.headerTitle}>Wallet Management</h1>
          <p className={styles.headerSubtitle}>
            Search for a class and add funds to its wallet, or manage global credits across institutes.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className="btn-secondary text-xs flex items-center gap-2" onClick={() => handleDownloadReport("csv")}>
            <Download size={14} /> Export All CSV
          </button>
          <button className="btn-secondary text-xs flex items-center gap-2" onClick={() => handleDownloadReport("pdf")}>
            <Download size={14} /> Export All PDF
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className={clsx("stagger-children", styles.statsGrid)}>
        <div className="stat-card flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-badge icon-badge-warning">
              <Wallet size={20} />
            </div>
            <span className={styles.statTitle}>Total Wallet Balance</span>
          </div>
          <p className={styles.statValue}>
            ₹{Number(summary?.totalBalance || 0).toLocaleString()}
          </p>
        </div>

        <div className="stat-card flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-badge icon-badge-success">
              <TrendingUp size={20} />
            </div>
            <span className={styles.statTitle}>Active Subscriptions</span>
          </div>
          <p className={styles.statValue}>
            {activeSubscriptionsCount}
          </p>
        </div>
      </div>

      {/* Class Wallets Table */}
      <div className="glass-card-elevated p-6 text-left flex flex-col">
        <div className={styles.tableHeader}>
          <h2 className="text-[0.8rem] font-bold tracking-[0.08em] uppercase text-[var(--color-text-muted)] m-0 border-0 pb-0">Class Wallets Ledger</h2>
          <div className={styles.tableSearch}>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              className="input-field pl-9"
              placeholder="Search classes by name or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="data-table">
            <thead>
              <tr>
                <th>Class ID</th>
                <th>Institute / Class Name</th>
                <th>Owner</th>
                <th>Total Funds Added</th>
                <th>Current Balance</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.length > 0 ? (
                filteredClasses.map((c) => (
                  <tr
                    key={c.owner_id}
                    className={`hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer ${
                      selectedClassOwnerId === c.owner_id ? "bg-[rgba(99,102,241,0.05)] border-l-4 border-l-[var(--color-brand-500)]" : "border-l-4 border-l-transparent"
                    }`}
                    onClick={() => setSelectedClassOwnerId(c.owner_id)}
                  >
                    <td className="font-mono text-xs text-[var(--color-text-secondary)]">
                      {formatClassId(c.registration_id)}
                    </td>
                    <td className="font-bold text-[var(--color-text-primary)]">
                      {c.institute_name}
                    </td>
                    <td className="text-[var(--color-text-secondary)] font-medium">{c.owner_name}</td>
                    <td className="font-mono text-sm font-bold text-[var(--color-success)]">
                      ₹{c.totalAdded.toLocaleString()}
                    </td>
                    <td className="font-mono text-sm font-bold text-[var(--color-text-primary)]">
                      ₹{c.wallet_balance.toLocaleString()}
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-3">
                        <button
                          className="btn-ghost !px-3 !py-1.5 !text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-brand-400)]"
                          onClick={() => setSelectedClassOwnerId(c.owner_id)}
                        >
                          View History
                        </button>
                        <button
                          className="btn-primary !px-3 !py-1.5 !text-xs gap-1.5 flex items-center"
                          onClick={() => setFundsDialogClass(c)}
                        >
                          <Plus size={14} />
                          Add Funds
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-10 text-[var(--color-text-muted)]">
                      <span className="text-sm font-medium">No classes found matching search criteria.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class-Specific Transaction History Section */}
      {selectedClass ? (
        <div className={clsx("glass-card-elevated p-6 text-left space-y-5 animate-fade-in", styles.walletHistorySection)}>
          <div className={styles.walletHistoryHeader}>
            <div>
              <h2 className={styles.walletHistoryTitle}>{selectedClass.institute_name} Wallet Ledger</h2>
              <p className={styles.walletHistorySubtitle}>
                Class ID: {formatClassId(selectedClass.registration_id)} · Owner: {selectedClass.owner_name}
              </p>
            </div>
            <div className={styles.walletHistoryActions}>
              <button className="btn-secondary text-xs flex items-center gap-2" onClick={() => handleDownloadClassReport("csv")}>
                <Download size={14} /> CSV
              </button>
              <button className="btn-secondary text-xs flex items-center gap-2" onClick={() => handleDownloadClassReport("pdf")}>
                <Download size={14} /> PDF
              </button>
              <button
                className="btn-primary text-xs flex items-center gap-2"
                onClick={() => setFundsDialogClass(selectedClass)}
              >
                <Plus size={14} />
                Add Funds
              </button>
            </div>
          </div>

          {/* Quick stats for selected class */}
          <div className={styles.classQuickStats}>
            <div className={styles.classQuickStatCard}>
              <span className={styles.classQuickStatLabel}>Total Funds Added</span>
              <span className={clsx(styles.classQuickStatVal, "text-[var(--color-success)]")}>₹{selectedClass.totalAdded.toLocaleString()}</span>
            </div>
            <div className={styles.classQuickStatCard}>
              <span className={styles.classQuickStatLabel}>Total Deductions</span>
              <span className={clsx(styles.classQuickStatVal, "text-[var(--color-danger)]")}>₹{selectedClass.totalDeducted.toLocaleString()}</span>
            </div>
            <div className={styles.classQuickStatCard}>
              <span className={styles.classQuickStatLabel}>Current Balance</span>
              <span className={clsx(styles.classQuickStatVal, "text-[var(--color-text-primary)]")}>₹{selectedClass.wallet_balance.toLocaleString()}</span>
            </div>
          </div>

          {selectedClassTxs.length > 0 ? (
            <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedClassTxs.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-[var(--color-surface-2)] transition-colors">
                      <td className="font-mono text-xs text-[var(--color-text-secondary)] font-medium">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className="text-[var(--color-text-primary)] font-medium">{tx.description}</span>
                      </td>
                      <td>
                        <span className={`badge ${
                          tx.transaction_type === "DEPOSIT" ? "badge-active" : "badge-inactive"
                        }`}>
                          {tx.transaction_type === "DEPOSIT" ? "DEPOSIT" : "DEDUCTION"}
                        </span>
                      </td>
                      <td>
                        <span className={`font-mono font-bold ${
                          tx.transaction_type === "DEPOSIT" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
                        }`}>
                          {tx.transaction_type === "DEPOSIT" ? "+" : "-"}₹{Number(tx.amount).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-default)] rounded-2xl">
              <AlertCircle size={36} className="mb-3 opacity-20" />
              <span className="text-sm font-medium">No transaction records logged for this class.</span>
            </div>
          )}

          {/* Verification Banner */}
          <div className="flex items-center gap-3 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-[var(--color-success)] p-4 rounded-xl text-xs font-semibold">
            <CheckCircle size={18} />
            <span>All transaction records are audit-logged and validated on the Supabase network.</span>
          </div>
        </div>
      ) : (
        <div className={styles.noClassSelectedBox}>
          <Wallet size={48} className="mb-4 text-[var(--color-brand-400)] opacity-50" />
          <h4 className={styles.noClassSelectedTitle}>No Class Selected</h4>
          <p className={styles.noClassSelectedSub}>
            Click "View History" on any class in the table above to view its past transactions, total funds added, and current funds.
          </p>
        </div>
      )}

      {/* Add Funds Dialog */}
      {fundsDialogClass && (
        <AddFundsDialogInline
          classObj={fundsDialogClass}
          onClose={() => setFundsDialogClass(null)}
          onSuccess={() => {
            setFundsDialogClass(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function AddFundsDialogInline({
  classObj,
  onClose,
  onSuccess,
}: {
  classObj: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid deposit amount");
      return;
    }
    setSaving(true);
    try {
      await addFunds(classObj.owner_id, Number(amount), paymentMode, reference, note);
      toast.success(`₹${Number(amount).toLocaleString()} added successfully to ${classObj.institute_name}!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to add funds");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Add Funds to Wallet</h2>
            <p className="text-[0.65rem] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-1">{classObj.institute_name}</p>
          </div>
          <button className="btn-ghost !p-2 !rounded-lg" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 text-left flex flex-col gap-5">
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Amount (₹) *</label>
            <input className="input-field text-lg font-bold font-mono" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus placeholder="0" />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Payment Mode *</label>
            <select className="form-select" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              <option>Cash</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
              <option>Net Banking</option>
              <option>Cheque</option>
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Reference ID (UPI TXID / Ref)</label>
            <input className="input-field" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Note</label>
            <input className="input-field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Depositing...</> : "Deposit Funds"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

