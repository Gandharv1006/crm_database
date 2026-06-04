import { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  Calendar,
  Search,
  Filter
} from "lucide-react";
import { getAllTransactions } from "@/services/db";
import { downloadPDF } from "@/services/export";
import { toast } from "sonner";
import clsx from "clsx";
import styles from "./PaymentsPage.module.css";

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const txs = await getAllTransactions();
      setTransactions(txs);
    } catch (err) {
      console.error("Failed to load transactions:", err);
      toast.error("Failed to load payments log");
    } finally {
      setLoading(false);
    }
  }

  // Parse payment method from description
  const parseMethod = (tx: any) => {
    if (tx.transaction_type === "DEDUCTION") return "Auto-Deduction";
    const desc = tx.description || "";
    if (desc.includes("Cash")) return "Cash";
    if (desc.includes("UPI")) return "UPI";
    if (desc.includes("Bank Transfer")) return "Bank Transfer";
    if (desc.includes("Net Banking")) return "Net Banking";
    if (desc.includes("Cheque")) return "Cheque";
    return "Manual Deposit";
  };

  const formatTxId = (id: number) => {
    return `#TXN-${String(id).padStart(5, "0")}`;
  };

  // Filter transactions
  const filteredTxs = transactions.filter((tx) => {
    const q = search.toLowerCase();
    const className = tx.class_owners?.institute_name || "";
    const ownerName = tx.class_owners?.users?.full_name || "";
    const matchesSearch =
      !search ||
      className.toLowerCase().includes(q) ||
      ownerName.toLowerCase().includes(q) ||
      tx.description?.toLowerCase().includes(q);

    const matchesType =
      typeFilter === "All" ||
      tx.transaction_type === typeFilter;

    return matchesSearch && matchesType;
  });

  // Calculate statistics
  const totalVolume = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);
  const successCount = transactions.filter((t) => t.transaction_type === "DEPOSIT").length;
  const pendingCount = 0; // static or simulated
  const failedCount = 0; // static or simulated

  const handleExportPDF = () => {
    downloadPDF(
      filteredTxs.map((t) => ({
        "Transaction ID": formatTxId(t.transaction_id),
        Institute: t.class_owners?.institute_name || "N/A",
        Amount: `₹${Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        Method: parseMethod(t),
        Date: new Date(t.created_at).toLocaleDateString(),
        Status: "Success"
      })),
      "payments_report.pdf",
      "Payments & Transactions Log"
    );
  };

  if (loading) {
    return (
      <div className={clsx("page-enter", styles.container)}>
        <div className={styles.headerRow}>
          <div>
            <div className="h-6 w-32 skeleton" />
            <div className="h-4 w-64 skeleton" style={{ marginTop: "0.5rem" }} />
          </div>
          <div className="h-10 w-32 skeleton" />
        </div>
        <div className={styles.statsGrid}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: "6rem", borderRadius: "1rem" }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: "24rem", borderRadius: "1rem" }} />
      </div>
    );
  }

  return (
    <div className={clsx("page-enter", styles.container)}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.headerTitle}>Payments</h1>
          <p className={styles.headerSubtitle}>
            Manage and monitor all payment transactions across the platform.
          </p>
        </div>
        <button className="btn-secondary text-xs flex items-center gap-2" onClick={handleExportPDF}>
          <Download size={14} />
          Export Report
        </button>
      </div>

      {/* Stats Row */}
      <div className={clsx(styles.statsGrid, "stagger-children")}>
        <div className={clsx("stat-card", styles.statCard)}>
          <div className="icon-badge icon-badge-brand">
            <CreditCard size={20} />
          </div>
          <div>
            <div className={styles.statValue}>₹{totalVolume.toLocaleString()}</div>
            <div className={styles.statTitle}>Total Transactions</div>
          </div>
        </div>

        <div className={clsx("stat-card", styles.statCard)}>
          <div className="icon-badge icon-badge-success">
            <CheckCircle size={20} />
          </div>
          <div>
            <div className={styles.statValue}>{successCount}</div>
            <div className={styles.statTitle}>Successful Payments</div>
          </div>
        </div>

        <div className={clsx("stat-card", styles.statCard)}>
          <div className="icon-badge icon-badge-warning">
            <AlertCircle size={20} />
          </div>
          <div>
            <div className={styles.statValue}>{pendingCount}</div>
            <div className={styles.statTitle}>Pending Transactions</div>
          </div>
        </div>

        <div className={clsx("stat-card", styles.statCard)}>
          <div className="icon-badge icon-badge-danger">
            <XCircle size={20} />
          </div>
          <div>
            <div className={styles.statValue}>{failedCount}</div>
            <div className={styles.statTitle}>Failed Transactions</div>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className={styles.filtersRow}>
        <div className={styles.searchWrapper}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
          <input
            className="input-field"
            style={{ paddingLeft: "2.25rem" }}
            placeholder="Search by institute name, owner name, or TX details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filterSelectWrapper}>
          <div className={styles.filterSelectLabel}>
            <Filter size={14} />
            Type:
          </div>
          <select
            className={clsx("form-select", styles.filterSelect)}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="DEPOSIT">Deposits</option>
            <option value="DEDUCTION">Deductions</option>
          </select>
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className={clsx("glass-card-elevated", styles.tableCard)} style={{ padding: "1.5rem", overflow: "hidden" }}>
        <div className={clsx(styles.tableWrapper, "custom-scrollbar")}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Institute</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxs.length > 0 ? (
                filteredTxs.map((tx, idx) => (
                  <tr key={idx} className="transition-colors">
                    <td className="font-mono text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                      {formatTxId(tx.transaction_id)}
                    </td>
                    <td>
                      <div className={styles.instituteInfo}>
                        <span className={styles.instituteName}>
                          {tx.class_owners?.institute_name || "N/A"}
                        </span>
                        <span className={styles.instituteOwner}>
                          Owner: {tx.class_owners?.users?.full_name || "—"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={clsx(styles.txAmount, tx.transaction_type === "DEPOSIT" ? "text-success" : "text-danger")}>
                        {tx.transaction_type === "DEPOSIT" ? "+" : "-"}₹{Number(tx.amount).toLocaleString()}
                      </span>
                    </td>
                    <td className={styles.txMethod}>
                      <span className={styles.txMethodBadge}>
                        {parseMethod(tx)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.txDate}>
                        <Calendar size={14} style={{ color: "var(--color-text-muted)" }} />
                        <span className={styles.txDateVal}>{new Date(tx.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-active">Success</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 0", color: "var(--color-text-muted)" }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: "500" }}>No transactions logged yet.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
