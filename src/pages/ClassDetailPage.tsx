import { useState, useEffect, type FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Users,
  BookOpen,
  Wallet,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Plus,
  Search,
  X,
  Loader2,
  Edit,
  ShieldAlert,
  Lock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Activity,
  Award,
  Database,
  UploadCloud,
  Eye,
  EyeOff,
  Copy
} from "lucide-react";
import {
  getClassById,
  getBatchesByOwner,
  getStudentsByBatch,
  getWalletTransactions,
  addFunds,
  updateClass,
  updateClassStatus,
  getAllSalespeople,
  getAcademyHealth,
  updateClassCredentials,
  setupClassCredentials,
  disableClassCredentials,
  updateClassFullDetails
} from "@/services/db";
import { isSuperAdmin } from "@/services/auth";
import { downloadCSV, downloadPDF } from "@/services/export";
import { supabase } from "@/services/supabase";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import styles from "./ClassDetailPage.module.css";
import clsx from "clsx";

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ownerId = Number(id);

  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [walletTx, setWalletTx] = useState<any[]>([]);
  const [salespeople, setSalespeople] = useState<any[]>([]);
  const [academyHealth, setAcademyHealth] = useState<any>(null);
  const [studentGrowth, setStudentGrowth] = useState<any[]>([]);
  const [uniqueStudentCount, setUniqueStudentCount] = useState(0);

  const [paymentBoardEnabled, setPaymentBoardEnabled] = useState(false);
  const [showSetupCredentials, setShowSetupCredentials] = useState(false);
  const [aadhaarFile, setAadhaarFile] = useState("");
  const [panFile, setPanFile] = useState("");

  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showPaymentPass, setShowPaymentPass] = useState(false);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Modal triggers
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showEditClass, setShowEditClass] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [activeBatchModal, setActiveBatchModal] = useState<any | null>(null);

  useEffect(() => {
    if (ownerId) loadData();
  }, [ownerId]);

  async function loadData() {
    try {
      const [cd, b, wt, sps, health] = await Promise.all([
        getClassById(ownerId),
        getBatchesByOwner(ownerId),
        getWalletTransactions(ownerId),
        getAllSalespeople(),
        getAcademyHealth(ownerId)
      ]);

      setClassData(cd);
      setBatches(b);
      setWalletTx(wt);
      setSalespeople(sps);
      setAcademyHealth(health);

      let initialPaymentBoardEnabled = false;
      try {
        if (cd.registration && cd.registration.notes) {
          const parsed = JSON.parse(cd.registration.notes);
          initialPaymentBoardEnabled = parsed.paymentBoardEnabled ?? false;
        }
      } catch {}
      setPaymentBoardEnabled(initialPaymentBoardEnabled);

      // Load student growth curve for batches of this class owner
      const { data: enrollments } = await supabase
        .from("batch_enrollments")
        .select("student_id, batches!inner(owner_id), students(enrolled_at)")
        .eq("batches.owner_id", ownerId);

      const uniqueStudents = new Set((enrollments || []).map((e: any) => e.student_id));
      setUniqueStudentCount(uniqueStudents.size);

      const map: Record<string, number> = {};
      (enrollments || []).forEach((e: any) => {
        const dateStr = e.students?.enrolled_at;
        if (dateStr) {
          const d = new Date(dateStr);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          map[key] = (map[key] || 0) + 1;
        }
      });
      const sortedGrowth = Object.entries(map)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }));

      let cumulative = 0;
      const cumulativeGrowth = sortedGrowth.map((item) => {
        cumulative += item.count;
        return { month: item.month, count: cumulative };
      });
      setStudentGrowth(cumulativeGrowth);
    } catch (err) {
      console.error("Failed to load class detail data:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSuspend = async () => {
    if (confirm("Are you sure you want to suspend this account? The owner will lose panel access.")) {
      try {
        await updateClassStatus(ownerId, "SUSPENDED");
        toast.success("Account suspended successfully!");
        loadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to suspend account");
      }
    }
  };

  const handlePaymentBoardToggle = async (checked: boolean) => {
    if (checked) {
      setShowSetupCredentials(true);
    } else {
      if (confirm("Are you sure you want to disable and clear credentials for the payment board? The owner will no longer be able to log in.")) {
        try {
          await disableClassCredentials(ownerId);
          setPaymentBoardEnabled(false);
          toast.success("Credentials cleared and disabled successfully.");
          loadData();
        } catch (err: any) {
          toast.error(err.message || "Failed to disable credentials");
        }
      }
    }
  };

  const handleExportTransactionsCSV = () => {
    downloadCSV(
      walletTx.map((t) => ({
        Date: t.created_at ? new Date(t.created_at).toLocaleString() : "",
        Type: t.transaction_type,
        Amount: t.amount,
        Description: t.description || "",
      })),
      `${reg.institute_name}_transactions.csv`
    );
  };

  const handleExportTransactionsPDF = () => {
    downloadPDF(
      walletTx.map((t) => ({
        Date: t.created_at ? new Date(t.created_at).toLocaleString() : "",
        Type: t.transaction_type,
        Amount: `₹${Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        Description: t.description || "",
      })),
      `${reg.institute_name}_transactions.pdf`,
      `Transactions — ${reg.institute_name}`
    );
  };

  if (loading) {
    return (
      <div className={clsx("page-enter", styles.container)}>
        <div className={styles.breadcrumb}>
          <div className="h-4 w-32 skeleton" />
        </div>
        <div className={styles.headerRow}>
          <div className="h-8 w-64 skeleton" />
          <div className={styles.headerActions}>
            <div className="h-10 w-24 skeleton" />
            <div className="h-10 w-24 skeleton" />
          </div>
        </div>
        <div className={styles.statsGrid}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  const reg = classData?.registration || {};
  const owner = classData?.owner || {};
  const wallet = classData?.wallet || {};
  const assignment = classData?.assignment || {};
  const user = owner.users || {};

  // Extract address and other notes fields from serialized JSON
  let addressText = "—";
  let stateText = "—";
  let pincodeText = "—";
  let alternateMobile = "—";
  let rawNotes = reg.notes || "";
  try {
    const parsed = JSON.parse(reg.notes);
    if (parsed && typeof parsed === "object") {
      addressText = parsed.officeAddress || "—";
      stateText = parsed.state || "—";
      pincodeText = parsed.pincode || "—";
      alternateMobile = parsed.alternateMobile || "—";
      rawNotes = parsed.notes || "";
    }
  } catch {
    // Keep raw notes as address text fallback
    addressText = reg.notes || "—";
  }

  const totalStudents = batches.reduce((s: number, b: any) => s + (b.student_count || 0), 0);
  const totalRevenue = walletTx
    .filter((t: any) => t.transaction_type === "DEPOSIT")
    .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

  const formatClassId = (regId: number | null) => {
    if (!regId) return "#CLS-0000";
    return `#CLS-${String(regId).padStart(4, "0")}`;
  };

  return (
    <div className={clsx("page-enter", styles.container)}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link to="/classes" className="hover:text-[var(--color-brand-400)] transition-colors">Classes</Link>
        <span>&gt;</span>
        <span className="text-[var(--color-text-primary)]">{reg.institute_name || owner.institute_name}</span>
      </div>

      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.headerTitle}>
            {reg.institute_name || owner.institute_name}
          </h1>
          <p className={styles.headerSubtitle}>
            Class ID: {formatClassId(reg.registration_id)}
          </p>
        </div>
        <div className={styles.headerActions}>
          {isSuperAdmin() && (
            <button className="btn-secondary flex items-center gap-2" onClick={() => setShowEditClass(true)}>
              <Edit size={16} />
              Edit Class
            </button>
          )}
          {isSuperAdmin() && (
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddFunds(true)}>
              <Plus size={16} />
              Add Funds
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className={clsx("stagger-children", styles.statsGrid)}>
        <div className="stat-card">
          <p className={styles.statTitle}>Total Students</p>
          <p className={styles.statValue}>{uniqueStudentCount}</p>
          <p className={clsx(styles.statSub, "text-[var(--color-brand-400)]")}>Active enrollments</p>
        </div>

        <div className="stat-card">
          <p className={styles.statTitle}>Wallet Balance</p>
          <p className={clsx(styles.statValue, "text-[var(--color-warning)]")}>₹{Number(wallet.balance || 0).toLocaleString()}</p>
          <p className={clsx(styles.statSub, "text-[var(--color-text-muted)]")}>Deduction: ₹{wallet.deduction_per_student || 0}/std</p>
        </div>

        <div className="stat-card">
          <p className={styles.statTitle}>Income for Us</p>
          <p className={clsx(styles.statValue, "text-[var(--color-success)]")}>₹{(uniqueStudentCount * Number(wallet.deduction_per_student || 0)).toLocaleString()}</p>
          <p className={clsx(styles.statSub, "text-[var(--color-text-muted)]")}>
            Total Students ({uniqueStudentCount}) × ₹{wallet.deduction_per_student || 0}
          </p>
        </div>
      </div>

      <div className={styles.mainGrid}>
        {/* Left Column */}
        <div className={styles.leftColumn}>
          {/* Institute Info Section */}
          <div className="glass-card-elevated p-6">
            <h2 className="text-[0.8rem] font-bold tracking-[0.08em] uppercase text-[var(--color-text-muted)] pb-3 mb-5 border-b border-[var(--color-border-subtle)]">
              Institute Information
            </h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoSection}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Owner Name:</span>
                  <span className={styles.infoValue}>{user.full_name || owner.contact_person || "—"}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Contact:</span>
                  <span className={clsx(styles.infoValue, "font-mono")}>
                    {user.mobile || owner.contact} {alternateMobile !== "—" && ` / ${alternateMobile}`}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Email Address:</span>
                  <span className={clsx(styles.infoValue, "truncate")}>{user.email || "—"}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Full Address:</span>
                  <span className={styles.infoValue}>
                    {addressText} {cityText(owner.city, stateText)} {pincodeText !== "—" && ` - ${pincodeText}`}
                  </span>
                </div>
              </div>

              <div className={styles.infoSection}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Assigned Salesmen:</span>
                  <span className={clsx(styles.infoValue, styles.salesmenList)}>
                    {classData?.assignments && classData.assignments.length > 0 ? (
                      classData.assignments.map((asm: any, idx: number) => (
                        <span key={asm.assignment_id}>
                          <Link to={`/salesman/${asm.salesperson_id}`} className="text-[var(--color-brand-400)] hover:text-[var(--color-brand-300)] hover:underline transition-colors">
                            {asm.salespeople?.full_name}
                          </Link>
                          {idx < classData.assignments.length - 1 && <span className="text-[var(--color-text-muted)] mr-1">,</span>}
                        </span>
                      ))
                    ) : (
                      <span className="text-[var(--color-text-secondary)] italic">Unassigned</span>
                    )}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Plan Type:</span>
                  <span className={styles.infoValue}>
                    <span className="badge badge-info">
                      {reg.plan_type || "Basic"}
                    </span>
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Status:</span>
                  <span className={styles.infoValue}>
                    <span className={`badge badge-${(reg.status || "active").toLowerCase()}`}>
                      {reg.status}
                    </span>
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Registered:</span>
                  <span className={styles.infoValue}>
                    {reg.registered_at ? new Date(reg.registered_at).toLocaleDateString() : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Academy Health Row */}
          <div className={styles.healthGrid}>
            <div className={clsx("stat-card", styles.healthCard)}>
              <div className={styles.healthCardHeader}>
                <div className="icon-badge icon-badge-brand">
                  <Activity size={22} />
                </div>
              </div>
              <div>
                <div className={styles.healthCardValue}>{academyHealth?.attendanceAvg || 0}%</div>
                <div className={styles.healthCardLabel}>Attendance Avg</div>
              </div>
            </div>

            <div className={clsx("stat-card", styles.healthCard)}>
              <div className={styles.healthCardHeader}>
                <div className="icon-badge icon-badge-success">
                  <Award size={22} />
                </div>
              </div>
              <div>
                <div className={styles.healthCardValue}>{academyHealth?.testCompletion || 0}%</div>
                <div className={styles.healthCardLabel}>Test Completion</div>
              </div>
            </div>

            <div className={clsx("stat-card", styles.healthCard)}>
              <div className={styles.healthCardHeader}>
                <div className="icon-badge icon-badge-warning">
                  <Database size={22} />
                </div>
              </div>
              <div>
                <div className={styles.healthCardValue}>{academyHealth?.groupsCount || 0}</div>
                <div className={styles.healthCardLabel}>Groups Count</div>
              </div>
            </div>
          </div>

          {/* Student Analytics & Batches */}
          <div className={styles.innerGrid}>
            {/* Student Growth Chart */}
            <div className="glass-card-elevated p-6 flex flex-col">
              <h2 className="text-[0.8rem] font-bold tracking-[0.08em] uppercase text-[var(--color-text-muted)] pb-3 mb-4 border-b border-[var(--color-border-subtle)]">
                Student Growth Trend
              </h2>
              {studentGrowth.length > 0 ? (
                <div className="flex-1 min-h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={studentGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: "#55556a", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fill: "#55556a", fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip
                        contentStyle={{
                          background: "#1e1e2a",
                          border: "1px solid #ffffff18",
                          borderRadius: "10px",
                          color: "#f0f0f8",
                          fontSize: "0.8125rem",
                          boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
                        }}
                        itemStyle={{ color: "#818cf8" }}
                      />
                      <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: "#1e1e2a", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#6366f1", strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 min-h-[260px] text-[var(--color-text-muted)]">
                  <Users size={36} className="mb-3 opacity-20" />
                  <span className="text-sm">No student growth data available</span>
                </div>
              )}
            </div>

            {/* Batch List */}
            <div className="glass-card-elevated p-6 flex flex-col">
              <h2 className="text-[0.8rem] font-bold tracking-[0.08em] uppercase text-[var(--color-text-muted)] pb-3 mb-4 border-b border-[var(--color-border-subtle)]">
                Batches List
              </h2>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {batches.length > 0 ? (
                  <div className={styles.batchContainer}>
                    {batches.map((b, idx) => (
                      <div
                        key={idx}
                        className={styles.batchCard}
                        onClick={() => setActiveBatchModal(b)}
                      >
                        <div className={styles.batchInfo}>
                          <div className={styles.batchIcon}>
                            <BookOpen size={18} />
                          </div>
                          <div>
                            <p className={styles.batchTitle}>{b.batch_name}</p>
                            <p className={styles.batchSub}>
                              Code: {b.batch_code} · {b.subject}
                            </p>
                          </div>
                        </div>
                        <div className={styles.batchRight}>
                          <span className={styles.studentCountBadge}>
                            {b.student_count}
                          </span>
                          <ChevronRight size={18} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-brand-400)] transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 h-[260px] text-[var(--color-text-muted)]">
                    <BookOpen size={36} className="mb-3 opacity-20" />
                    <span className="text-sm">No batches created yet</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className={styles.rightColumn}>
          {/* Transaction History Section */}
          <div className="glass-card-elevated p-6 flex flex-col">
            <div className={styles.txHeader}>
              <h2 className={styles.txTitle}>
                Transaction History
              </h2>
              {walletTx.length > 0 && (
                <button className="btn-ghost !p-1.5 !text-xs !gap-1.5" onClick={handleExportTransactionsCSV}>
                  <Download size={14} />
                  CSV
                </button>
              )}
            </div>
            
            <div className="flex-1">
              {walletTx.length > 0 ? (
                <div className={clsx(styles.txFeed, "max-h-[500px] overflow-y-auto pr-2 custom-scrollbar")}>
                  {walletTx.map((tx, idx) => (
                    <div key={idx} className={styles.txItem}>
                      <div className={clsx(styles.txDot, tx.transaction_type === "DEPOSIT" ? "bg-[var(--color-success)] text-[var(--color-success)]" : "bg-[var(--color-danger)] text-[var(--color-danger)]")} style={{ boxShadow: "0 0 8px currentColor" }} />
                      <div className={styles.txInfo}>
                        <p className={styles.txDesc}>
                          {tx.description}
                        </p>
                        <p className={styles.txTime}>
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className={styles.txAmount}>
                        <span className={clsx(styles.txAmountValue, tx.transaction_type === "DEPOSIT" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]")}>
                          {tx.transaction_type === "DEPOSIT" ? "+" : "-"}₹{Number(tx.amount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-[var(--color-text-muted)]">
                  <Wallet size={36} className="mb-3 opacity-20" />
                  <span className="text-sm">No transaction records found</span>
                </div>
              )}
            </div>
          </div>

          {/* Class Login Credentials Card */}
          <div className="glass-card-elevated p-6 text-left">
            <h2 className={styles.credentialsCardTitle}>
              <Lock size={14} />
              Class Login Credentials
            </h2>
            <div className={styles.credentialsCardContent}>
              {/* Class Admin Login */}
              <div className={styles.credentialSectionBox}>
                <span className={styles.credentialBoxTitle}>Class Admin Login</span>
                <div className={styles.credentialRow}>
                  <span className={styles.credentialLabel}>Username:</span>
                  <div className={styles.credentialContent}>
                    <span className={styles.credentialValue}>{owner.class_admin_username ? `${owner.class_admin_username}@acadex.in` : "—"}</span>
                    {owner.class_admin_username && (
                      <button className="btn-ghost !p-1" onClick={() => handleCopy(`${owner.class_admin_username}@acadex.in`, "Username")} title="Copy Username">
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.credentialRow}>
                  <span className={styles.credentialLabel}>Password:</span>
                  <div className={styles.credentialContent}>
                    <span className={styles.credentialValue}>
                      {owner.class_admin_password ? (showAdminPass ? owner.class_admin_password : "••••••••") : "—"}
                    </span>
                    {owner.class_admin_password && (
                      <div className={styles.credentialActions}>
                        <button className="btn-ghost !p-1" onClick={() => setShowAdminPass(!showAdminPass)}>
                          {showAdminPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button className="btn-ghost !p-1" onClick={() => handleCopy(owner.class_admin_password, "Password")} title="Copy Password">
                          <Copy size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Board Login */}
              {owner.payment_board_enabled && (
                <div className={styles.credentialSectionBox} style={{ borderTop: "1px solid var(--color-border-subtle)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                  <span className={styles.credentialBoxTitle}>Payment Board Login</span>
                  <div className={styles.credentialRow}>
                    <span className={styles.credentialLabel}>Username:</span>
                    <div className={styles.credentialContent}>
                      <span className={styles.credentialValue}>{owner.payment_board_username || "—"}</span>
                      {owner.payment_board_username && (
                        <button className="btn-ghost !p-1" onClick={() => handleCopy(owner.payment_board_username, "Payment Username")} title="Copy Username">
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={styles.credentialRow}>
                    <span className={styles.credentialLabel}>Password:</span>
                    <div className={styles.credentialContent}>
                      <span className={styles.credentialValue}>
                        {owner.payment_board_password ? (showPaymentPass ? owner.payment_board_password : "••••••••") : "—"}
                      </span>
                      {owner.payment_board_password && (
                        <div className={styles.credentialActions}>
                          <button className="btn-ghost !p-1" onClick={() => setShowPaymentPass(!showPaymentPass)}>
                            {showPaymentPass ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button className="btn-ghost !p-1" onClick={() => handleCopy(owner.payment_board_password, "Payment Password")} title="Copy Password">
                            <Copy size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Management Tools Panel */}
          {isSuperAdmin() && (
            <div className="glass-card-elevated p-6 text-left space-y-6">
              <h2 className="text-[0.8rem] font-bold tracking-[0.08em] uppercase text-[var(--color-text-muted)] pb-3 mb-4 border-b border-[var(--color-border-subtle)]">
                Management Tools
              </h2>
              <div className={styles.managementButtons}>
                <button className="btn-secondary w-full justify-center" onClick={() => setShowResetPassword(true)}>
                  <Lock size={16} />
                  Reset Password
                </button>
                <button className="btn-danger w-full justify-center" onClick={handleSuspend}>
                  <ShieldAlert size={16} />
                  Suspend Account
                </button>
              </div>

              {/* Payment Board Credentials Section */}
              <div className="space-y-3 pt-4 border-t border-[var(--color-border-subtle)]">
                <h3 className="text-xs font-bold tracking-[0.08em] uppercase text-[var(--color-text-muted)]">
                  Payment Board Credentials
                </h3>
                <div className="flex items-center gap-3 bg-[var(--color-surface-2)] border border-[var(--color-border-default)] p-4 rounded-xl">
                  <input
                    type="checkbox"
                    id="paymentBoardEnabled"
                    className="switch-toggle"
                    checked={paymentBoardEnabled}
                    onChange={(e) => handlePaymentBoardToggle(e.target.checked)}
                  />
                  <label htmlFor="paymentBoardEnabled" className="text-sm font-semibold text-[var(--color-text-primary)] cursor-pointer select-none">
                    Enable payment board credentials
                  </label>
                </div>
              </div>

              {/* Documents Section */}
              <div className="space-y-4 pt-4 border-t border-[var(--color-border-subtle)]">
                <h3 className="text-xs font-bold tracking-[0.08em] uppercase text-[var(--color-text-muted)]">
                  Documents
                </h3>
                <div className={styles.documentsGrid}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Aadhaar Card</label>
                    <div className={styles.dragUploadBox}>
                      <UploadCloud size={18} className={styles.dragUploadIcon} />
                      <span className={styles.dragUploadText}>{aadhaarFile || "Upload Aadhaar Card (PDF/JPG)"}</span>
                      <input
                        type="file"
                        className={styles.dragUploadInput}
                        onChange={(e) => {
                          // TODO: wire to Supabase storage bucket when configured
                          setAadhaarFile(e.target.files?.[0]?.name || "");
                        }}
                      />
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>PAN Card</label>
                    <div className={styles.dragUploadBox}>
                      <UploadCloud size={18} className={styles.dragUploadIcon} />
                      <span className={styles.dragUploadText}>{panFile || "Upload PAN Card (PDF/JPG)"}</span>
                      <input
                        type="file"
                        className={styles.dragUploadInput}
                        onChange={(e) => {
                          // TODO: wire to Supabase storage bucket when configured
                          setPanFile(e.target.files?.[0]?.name || "");
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* dialogs */}
      {showAddFunds && (
        <AddFundsDialog
          ownerId={ownerId}
          onClose={() => setShowAddFunds(false)}
          onSuccess={() => {
            setShowAddFunds(false);
            loadData();
          }}
        />
      )}

      {showEditClass && (
        <EditClassDialog
          reg={reg}
          owner={owner}
          wallet={wallet}
          assignment={assignment}
          assignments={classData?.assignments || []}
          salespeople={salespeople}
          ownerId={ownerId}
          onClose={() => setShowEditClass(false)}
          onSaved={() => {
            setShowEditClass(false);
            loadData();
          }}
        />
      )}

      {showResetPassword && (
        <ResetPasswordDialog
          userId={owner.user_id}
          ownerName={user.full_name}
          onClose={() => setShowResetPassword(false)}
        />
      )}

      {showSetupCredentials && (
        <SetupCredentialsDialog
          ownerId={ownerId}
          ownerName={user.full_name || owner.contact_person || ""}
          onClose={() => setShowSetupCredentials(false)}
          onSuccess={() => {
            setShowSetupCredentials(false);
            setPaymentBoardEnabled(true);
            loadData();
          }}
        />
      )}

      {activeBatchModal && (
        <BatchDetailModal
          batch={activeBatchModal}
          onClose={() => setActiveBatchModal(null)}
        />
      )}
    </div>
  );
}

function cityText(city: string, state: string) {
  if (!city && state === "—") return "";
  if (!city) return `, ${state}`;
  if (state === "—") return `, ${city}`;
  return `, ${city}, ${state}`;
}

// ────────────────────────────────────────────────────────────
// Batch Detail Student Modal
// ────────────────────────────────────────────────────────────
interface Student {
  enrollment_id: number;
  roll_number: string;
  full_name: string;
  mobile: string;
  guardian_name: string;
  guardian_contact: string;
  city: string;
  address: string;
  username: string;
  password: string;
}

function BatchDetailModal({ batch, onClose }: { batch: any; onClose: () => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (batch.batch_id) {
      setLoading(true);
      getStudentsByBatch(batch.batch_id)
        .then(setStudents)
        .catch((err) => {
          console.error(err);
          toast.error("Failed to load students list");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [batch.batch_id]);

  const filteredStudents = students.filter(
    (s) =>
      !search ||
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_number?.toString().includes(search)
  );

  const handleExportCSV = () => {
    downloadCSV(
      filteredStudents.map((s) => ({
        "Roll No": s.roll_number,
        "Full Name": s.full_name,
        Mobile: s.mobile,
        "City/Address": s.address || s.city,
      })),
      `${batch.batch_name}_students.csv`
    );
  };

  const handleExportPDF = () => {
    downloadPDF(
      filteredStudents.map((s) => ({
        "Roll No": s.roll_number,
        "Full Name": s.full_name,
        Mobile: s.mobile,
        "City/Address": s.address || s.city,
      })),
      `${batch.batch_name}_students.pdf`,
      `Students List — ${batch.batch_name}`
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "1000px" }}>
        <div className="modal-header">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{batch.batch_name} — Students List</h2>
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mt-1">Code: {batch.batch_code} · {batch.subject}</p>
          </div>
          <button className="btn-ghost !p-2 !rounded-lg" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-[var(--color-brand-500)]" />
            </div>
          ) : (
            <>
              <div className={styles.batchModalControls}>
                <div className={styles.batchModalSearch}>
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    className="input-field pl-9"
                    placeholder="Search by name or roll number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className={styles.batchModalButtons}>
                  <button className="btn-secondary text-xs" onClick={handleExportCSV}>
                    <Download size={14} />
                    CSV
                  </button>
                  <button className="btn-secondary text-xs" onClick={handleExportPDF}>
                    <Download size={14} />
                    PDF
                  </button>
                </div>
              </div>

              {filteredStudents.length > 0 ? (
                <div className={styles.studentsTableWrapper}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Roll No</th>
                        <th>Full Name</th>
                        <th>Mobile</th>
                        <th>City/Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((s, idx) => (
                        <tr key={idx} className="hover:bg-[var(--color-surface-2)] transition-colors">
                          <td className="font-mono text-xs">{s.roll_number || "—"}</td>
                          <td className="font-bold text-[var(--color-text-primary)]">{s.full_name}</td>
                          <td className="font-mono text-xs">{s.mobile || "—"}</td>
                          <td>{s.address || s.city || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-default)] rounded-xl">
                  <Users size={48} className="mb-4 opacity-20" />
                  <span className="text-sm font-medium">No students registered in this batch</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Reset Password Dialog
// ────────────────────────────────────────────────────────────
function ResetPasswordDialog({
  userId,
  ownerName,
  onClose,
}: {
  userId: number;
  ownerName: string;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error("Please enter a password");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ password_hash: newPassword })
        .eq("user_id", userId);
      if (error) throw error;
      toast.success("Password reset successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Reset Password</h2>
          <button className="btn-ghost !p-2 !rounded-lg" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 text-left flex flex-col gap-5">
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            Set a new login password for owner: <strong className="text-[var(--color-text-primary)]">{ownerName}</strong>
          </p>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>New Password *</label>
            <input
              className="input-field font-mono"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Confirm Password *</label>
            <input
              className="input-field font-mono"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Add Funds Dialog
// ────────────────────────────────────────────────────────────
function AddFundsDialog({
  ownerId,
  onClose,
  onSuccess,
}: {
  ownerId: number;
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
      await addFunds(ownerId, Number(amount), paymentMode, reference, note);
      toast.success(`₹${Number(amount).toLocaleString()} added successfully!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to deposit funds");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Add Funds</h2>
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
            <label className={styles.fieldLabel}>Transaction Reference</label>
            <input className="input-field" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. UPI Ref / Bank TXID" />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Note</label>
            <input className="input-field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Onboarding deposit" />
          </div>
          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : "Add Funds"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Edit Class Dialog
// ────────────────────────────────────────────────────────────
function EditClassDialog({
  reg,
  owner,
  wallet,
  assignment,
  assignments,
  salespeople,
  ownerId,
  onClose,
  onSaved,
}: {
  reg: any;
  owner: any;
  wallet: any;
  assignment: any;
  assignments?: any[];
  salespeople: any[];
  ownerId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [selectedSalespersonIds, setSelectedSalespersonIds] = useState<number[]>(() => {
    if (assignments && assignments.length > 0) {
      return assignments.map((asm: any) => Number(asm.salesperson_id));
    }
    return assignment?.salesperson_id ? [Number(assignment.salesperson_id)] : [];
  });
  
  let initialNotes: any = {};
  try {
    initialNotes = JSON.parse(reg.notes || "{}");
  } catch {}

  const [form, setForm] = useState({
    instituteName: owner.institute_name || "",
    city: owner.city || "",
    ownerFullName: owner.users?.full_name || owner.contact_person || "",
    ownerMobile: owner.users?.mobile || owner.contact || "",
    ownerEmail: owner.users?.email || "",
    alternateMobile: initialNotes.alternateMobile || "",
    officeAddress: initialNotes.officeAddress || "",
    state: initialNotes.state || "",
    pincode: initialNotes.pincode || "",
    deductionPerStudent: Number(wallet.deduction_per_student) || 0,
    status: reg.status || "ACTIVE",
  });

  const [credentials, setCredentials] = useState({
    classAdminUsername: owner.class_admin_username || "",
    classAdminPassword: owner.class_admin_password || "",
    paymentBoardEnabled: owner.payment_board_enabled || false,
    paymentBoardUsername: owner.payment_board_username || "",
    paymentBoardPassword: owner.payment_board_password || "",
  });
  const [showEditAdminPass, setShowEditAdminPass] = useState(false);
  const [showEditPaymentPass, setShowEditPaymentPass] = useState(false);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.instituteName || !form.ownerFullName || !form.ownerMobile || !form.ownerEmail) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      await updateClassFullDetails(ownerId, {
        instituteName: form.instituteName.trim(),
        city: form.city.trim(),
        ownerFullName: form.ownerFullName.trim(),
        ownerMobile: form.ownerMobile.trim(),
        ownerEmail: form.ownerEmail.trim(),
        alternateMobile: form.alternateMobile.trim(),
        officeAddress: form.officeAddress.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        deductionPerStudent: Number(form.deductionPerStudent) || 0,
        status: form.status,
        salespersonIds: selectedSalespersonIds
      });

      await updateClassCredentials(ownerId, {
        classAdminUsername: credentials.classAdminUsername.trim(),
        classAdminPassword: credentials.classAdminPassword,
        paymentBoardEnabled: credentials.paymentBoardEnabled,
        paymentBoardUsername: credentials.paymentBoardEnabled ? credentials.paymentBoardUsername.trim() : null,
        paymentBoardPassword: credentials.paymentBoardEnabled ? credentials.paymentBoardPassword : null,
      });

      toast.success("Class details updated!");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to update class details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
        <div className="modal-header">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Edit Class Details</h2>
          <button className="btn-ghost !p-2 !rounded-lg" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 text-left flex flex-col gap-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          <div className="space-y-4">
            <h3 className="text-[0.75rem] font-bold tracking-[0.08em] uppercase text-[var(--color-text-muted)] pb-2 border-b border-[var(--color-border-subtle)]">
              Institute Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={clsx(styles.fieldGroup, "sm:col-span-2")}>
                <label className={styles.fieldLabel}>Institute Name *</label>
                <input className="input-field" value={form.instituteName} onChange={(e) => set("instituteName", e.target.value)} />
              </div>
              <div className={clsx(styles.fieldGroup, "sm:col-span-2")}>
                <label className={styles.fieldLabel}>Office Address</label>
                <input className="input-field" value={form.officeAddress} onChange={(e) => set("officeAddress", e.target.value)} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>City</label>
                <input className="input-field" value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>State</label>
                <input className="input-field" value={form.state} onChange={(e) => set("state", e.target.value)} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Pincode</label>
                <input className="input-field font-mono" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[0.75rem] font-bold tracking-[0.08em] uppercase text-[var(--color-text-muted)] pb-2 border-b border-[var(--color-border-subtle)]">
              Owner Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={clsx(styles.fieldGroup, "sm:col-span-2")}>
                <label className={styles.fieldLabel}>Owner Full Name *</label>
                <input className="input-field" value={form.ownerFullName} onChange={(e) => set("ownerFullName", e.target.value)} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Mobile Number *</label>
                <input className="input-field font-mono" value={form.ownerMobile} onChange={(e) => set("ownerMobile", e.target.value)} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Alternate Mobile</label>
                <input className="input-field font-mono" value={form.alternateMobile} onChange={(e) => set("alternateMobile", e.target.value)} />
              </div>
              <div className={clsx(styles.fieldGroup, "sm:col-span-2")}>
                <label className={styles.fieldLabel}>Email Address *</label>
                <input className="input-field" type="email" value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[0.75rem] font-bold tracking-[0.08em] uppercase text-[var(--color-text-muted)] pb-2 border-b border-[var(--color-border-subtle)]">
              Operational Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Deduction Per Student (₹) *</label>
                <input className="input-field font-mono" type="number" value={form.deductionPerStudent} onChange={(e) => set("deductionPerStudent", Number(e.target.value))} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Status</label>
                <select className="form-select" value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
              <div className={clsx(styles.fieldGroup, "sm:col-span-2")}>
                <label className={styles.fieldLabel}>Assign Salespeople</label>
                <div className={styles.salespersonSelectorBox}>
                  {salespeople.map((sp) => (
                    <label key={sp.salesperson_id} className={styles.salespersonCheckboxRow}>
                      <input
                        type="checkbox"
                        checked={selectedSalespersonIds.includes(sp.salesperson_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSalespersonIds([...selectedSalespersonIds, sp.salesperson_id]);
                          } else {
                            setSelectedSalespersonIds(selectedSalespersonIds.filter((id) => id !== sp.salesperson_id));
                          }
                        }}
                        className={styles.salespersonCheckbox}
                      />
                      <span>{sp.full_name} <span className={styles.salespersonCheckboxTextMuted}>({sp.email || "No Email"})</span></span>
                    </label>
                  ))}
                  {salespeople.length === 0 && (
                    <span className="text-xs text-[var(--color-text-muted)] italic">No salespeople found</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Login Credentials Section */}
          <div className={styles.credentialsSection}>
            <h3 className={styles.credentialsSectionTitle}>
              Login Credentials
            </h3>
            
            <div className={styles.credentialSectionBox}>
              <h4 className={styles.credentialsSubTitle}>Class Admin Login</h4>
              <div className={styles.credentialsFormGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Class Admin Username *</label>
                  <input
                    className="input-field"
                    value={credentials.classAdminUsername}
                    onChange={(e) => setCredentials({ ...credentials, classAdminUsername: e.target.value.replace(/[^a-zA-Z0-9]/g, "") })}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Class Admin Password *</label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      className={`${styles.passwordInputField} input-field font-mono`}
                      type={showEditAdminPass ? "text" : "password"}
                      value={credentials.classAdminPassword}
                      onChange={(e) => setCredentials({ ...credentials, classAdminPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      className={styles.passwordToggleBtn}
                      onClick={() => setShowEditAdminPass(!showEditAdminPass)}
                    >
                      {showEditAdminPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.credentialSectionBox}>
              <div className={styles.paymentBoardToggleRow}>
                <input
                  type="checkbox"
                  id="editPaymentBoardEnabled"
                  className="switch-toggle"
                  checked={credentials.paymentBoardEnabled}
                  onChange={(e) => setCredentials({ ...credentials, paymentBoardEnabled: e.target.checked })}
                />
                <label htmlFor="editPaymentBoardEnabled" className={styles.paymentBoardToggleLabel}>
                  Enable Payment Board Credentials
                </label>
              </div>

              {credentials.paymentBoardEnabled && (
                <div className={styles.credentialsFormGrid} style={{ marginTop: "0.75rem" }}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Payment Board Username *</label>
                    <input
                      className="input-field"
                      value={credentials.paymentBoardUsername}
                      onChange={(e) => setCredentials({ ...credentials, paymentBoardUsername: e.target.value.replace(/[^a-zA-Z0-9_.-]/g, "") })}
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Payment Board Password *</label>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        className={`${styles.passwordInputField} input-field font-mono`}
                        type={showEditPaymentPass ? "text" : "password"}
                        value={credentials.paymentBoardPassword}
                        onChange={(e) => setCredentials({ ...credentials, paymentBoardPassword: e.target.value })}
                      />
                      <button
                        type="button"
                        className={styles.passwordToggleBtn}
                        onClick={() => setShowEditPaymentPass(!showEditPaymentPass)}
                      >
                        {showEditPaymentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SetupCredentialsDialogProps {
  ownerId: number;
  ownerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

function SetupCredentialsDialog({ ownerId, ownerName, onClose, onSuccess }: SetupCredentialsDialogProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-generate suggested credentials on load
  useEffect(() => {
    if (ownerName) {
      const suggestedUsername = ownerName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .substring(0, 10) + Math.floor(100 + Math.random() * 900);
      setUsername(suggestedUsername);
      const generatedPassword = `Acadex@${Math.floor(1000 + Math.random() * 9000)}`;
      setPassword(generatedPassword);
      setConfirmPassword(generatedPassword);
    }
  }, [ownerName]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }
    if (!password) {
      toast.error("Password is required");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await setupClassCredentials(ownerId, username, password);
      toast.success("Credentials configured successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to configure credentials");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
        <div className="modal-header">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] font-sans">Setup Credentials</h2>
          <button className="btn-ghost !p-2 !rounded-lg" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 text-left flex flex-col gap-5">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Create login credentials for the class admin dashboard.
          </p>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Login Username *</label>
            <div className="flex items-center">
              <input
                className="input-field !rounded-r-none !border-r-0"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
              />
              <span className="bg-[var(--color-surface-3)] border border-[var(--color-border-default)] border-l-0 px-4 py-[0.6rem] rounded-r-lg text-xs font-semibold text-[var(--color-text-muted)] font-mono">
                @acadex.in
              </span>
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Login Password *</label>
            <input
              className="input-field font-mono"
              type="text"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Confirm Password *</label>
            <input
              className="input-field font-mono"
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save Credentials"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
