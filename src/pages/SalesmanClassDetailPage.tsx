import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  School,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle
} from "lucide-react";
import { getSalesmanClassDetail } from "@/services/db";
import { toast } from "sonner";
import styles from "./SalesmanClassDetailPage.module.css";
import clsx from "clsx";

export default function SalesmanClassDetailPage() {
  const { salesmanId, classId } = useParams<{ salesmanId: string; classId: string }>();
  const navigate = useNavigate();
  const spId = Number(salesmanId);
  const ownerId = Number(classId);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (spId && ownerId) loadData();
  }, [spId, ownerId]);

  async function loadData() {
    try {
      const result = await getSalesmanClassDetail(spId, ownerId);
      setData(result);
    } catch (err) {
      console.error("Failed to load salesman class details:", err);
      toast.error("Failed to load payment details");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={clsx("page-enter", styles.container)}>
        <div className={styles.breadcrumb}>
          <div className="h-4 w-48 skeleton" />
        </div>
        <div className={styles.headerRow}>
          <div className="h-8 w-64 skeleton" />
        </div>
        <div className={styles.statsGrid}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-enter p-6 text-center space-y-4">
        <p className="text-[var(--color-text-secondary)]">Class details or payment information not found.</p>
        <button className="btn-primary text-xs" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  const { salesman, totalPayment, totalStudents, currentClassInfo, classDetail } = data;
  const reg = classDetail?.registration || {};
  const owner = classDetail?.owner || {};
  const user = owner.users || {};

  // Extract address and location details from JSON notes
  let addressText = "—";
  let stateText = "—";
  let pincodeText = "—";
  let batchTypeText = "—";
  try {
    const parsed = JSON.parse(reg.notes);
    if (parsed && typeof parsed === "object") {
      addressText = parsed.officeAddress || "—";
      stateText = parsed.state || "—";
      pincodeText = parsed.pincode || "—";
      batchTypeText = parsed.batchType || "—";
    }
  } catch {
    addressText = reg.notes || "—";
  }

  const rate = Number(salesman?.commission_per_student || 20);
  const studentCount = currentClassInfo?.student_count || 0;
  const currentClassPayment = currentClassInfo?.payment || 0;

  const formatClassId = (regId: number | null) => {
    if (!regId) return "#CLS-0000";
    return `#CLS-${String(regId).padStart(4, "0")}`;
  };

  return (
    <div className={clsx("page-enter", styles.container)}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link to="/salesman" className="hover:text-[var(--color-brand-400)] transition-colors">Salesman</Link>
        <span>&gt;</span>
        <Link to={`/salesman/${spId}`} className="hover:text-[var(--color-brand-400)] transition-colors">{salesman.full_name}</Link>
        <span>&gt;</span>
        <span className="text-[var(--color-text-primary)]">{currentClassInfo?.institute_name}</span>
      </div>

      {/* Header */}
      <div className={styles.headerRow}>
        <div className="flex items-center gap-3">
          <button
            className="btn-ghost !p-2 !rounded-lg"
            onClick={() => navigate(`/salesman/${spId}`)}
            title="Back to Salesman profile"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className={styles.headerTitle}>{currentClassInfo?.institute_name}</h1>
            <p className={styles.headerSubtitle}>
              Class info & salesman payment · {formatClassId(ownerId)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className={clsx("stagger-children", styles.statsGrid)}>
        <div className="stat-card">
          <p className={styles.statTitle}>Student Count</p>
          <p className={styles.statValue}>{studentCount}</p>
          <p className={clsx(styles.statSub, "text-[var(--color-text-muted)]")}>Enrolled students</p>
        </div>

        <div className="stat-card">
          <p className={styles.statTitle}>Salesman Payment (This Class)</p>
          <p className={clsx(styles.statValue, "text-[var(--color-success)]")}>₹{currentClassPayment.toLocaleString()}</p>
          <p className={clsx(styles.statSub, "text-[var(--color-text-muted)]")}>
            Formula: {studentCount} students × ₹{rate}
          </p>
        </div>

        <div className="stat-card">
          <p className={styles.statTitle}>Total Payment (All Classes)</p>
          <p className={clsx(styles.statValue, "text-[var(--color-brand-400)]")}>₹{totalPayment.toLocaleString()}</p>
          <p className={clsx(styles.statSub, "text-[var(--color-text-muted)]")}>
            Formula: {totalStudents} students × ₹{rate}
          </p>
        </div>
      </div>

      {/* Class Information (2 columns) */}
      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>
          Class Information
        </h2>
        <div className={styles.infoGrid}>
          {/* Left Column */}
          <div className={styles.infoSection}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status:</span>
              <span className={styles.infoValue}>
                <span className={`badge badge-${(reg.status || "active").toLowerCase()}`}>
                  {reg.status}
                </span>
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Batch Type:</span>
              <span className={styles.infoValue}>{batchTypeText}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Subscription:</span>
              <span className={clsx(styles.infoValue, "text-[var(--color-brand-400)] uppercase font-bold")}>
                {reg.plan_type}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Established:</span>
              <span className={clsx(styles.infoValue, "flex items-center gap-1.5")}>
                <Calendar size={14} className="text-[var(--color-text-muted)]" />
                {reg.registered_at ? new Date(reg.registered_at).toLocaleDateString() : "—"}
              </span>
            </div>
          </div>

          {/* Right Column */}
          <div className={styles.infoSection}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Owner:</span>
              <span className={styles.infoValue}>
                {user.full_name || "—"}
                {(user.mobile || owner.contact) && (
                  <span className="block text-[0.65rem] uppercase tracking-wider font-bold font-mono text-[var(--color-text-muted)] mt-1.5 flex items-center gap-1">
                    <Phone size={10} /> {user.mobile || owner.contact} · <Mail size={10} /> {user.email || "—"}
                  </span>
                )}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Address:</span>
              <span className={styles.infoValue}>
                {addressText} {stateText !== "—" && `, ${stateText}`} {pincodeText !== "—" && ` - ${pincodeText}`}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Assigned Salesman:</span>
              <span className={clsx(styles.infoValue, "text-[var(--color-brand-400)]")}>{salesman.full_name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Breakdown section */}
      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>
          Payment & Commission Breakdown
        </h2>
        <div className={styles.breakdownGrid}>
          <div className={styles.breakdownCardSuccess}>
            <h4 className={clsx(styles.breakdownTitle, styles.breakdownTitleSuccess)}>
              <CreditCard size={14} />
              This Class
            </h4>
            <div className={clsx(styles.breakdownValue, styles.breakdownValueSuccess)}>
              ₹{currentClassPayment.toLocaleString()}
            </div>
            <p className={styles.breakdownFormula}>
              Formula: {studentCount} students × ₹{rate} = ₹{currentClassPayment.toLocaleString()}
            </p>
          </div>

          <div className={styles.breakdownCardBrand}>
            <h4 className={clsx(styles.breakdownTitle, styles.breakdownTitleBrand)}>
              <Users size={14} />
              All Classes ({salesman.full_name})
            </h4>
            <div className={clsx(styles.breakdownValue, styles.breakdownValueBrand)}>
              ₹{totalPayment.toLocaleString()}
            </div>
            <p className={styles.breakdownFormula}>
              Formula: {totalStudents} total students × ₹{rate} across {data.assignedClasses?.length || 1} classes
            </p>
          </div>
        </div>
      </div>

      <div>
        <Link
          to={`/salesman/${spId}`}
          className={styles.backLink}
        >
          &larr; Back to all assigned classes
        </Link>
      </div>
    </div>
  );
}

