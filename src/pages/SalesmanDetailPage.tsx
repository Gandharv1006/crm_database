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
  Building,
  Calendar,
  ChevronRight,
  Download,
  Edit,
  Loader2,
  X
} from "lucide-react";
import { getSalesmanById, getAssignedClasses, updateSalesman, getAllClasses } from "@/services/db";
import { downloadCSV, downloadPDF } from "@/services/export";
import { toast } from "sonner";
import styles from "./SalesmanDetailPage.module.css";
import clsx from "clsx";

export default function SalesmanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const salesmanId = Number(id);

  const [salesman, setSalesman] = useState<any>(null);
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (salesmanId) loadData();
  }, [salesmanId]);

  async function loadData() {
    try {
      const [sp, classes] = await Promise.all([
        getSalesmanById(salesmanId),
        getAssignedClasses(salesmanId)
      ]);
      setSalesman(sp);
      setAssignedClasses(classes);
    } catch (err) {
      console.error("Failed to load salesman details:", err);
      toast.error("Failed to load salesman data");
    } finally {
      setLoading(false);
    }
  }

  const handleDownloadPDF = () => {
    downloadPDF(
      assignedClasses.map((c) => ({
        "Institute Name": c.institute_name,
        City: c.city,
        "Students Count": c.student_count,
        "Commission Rate": `₹${Number(c.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        "Total Payment": `₹${Number(c.payment).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      })),
      `${salesman.full_name}_commissions.pdf`,
      `Commission Breakdown — ${salesman.full_name}`
    );
  };

  if (loading) {
    return (
      <div className={clsx("page-enter", styles.container)}>
        <div className={styles.breadcrumb}>
          <div className="h-4 w-32 skeleton" />
        </div>
        <div className={styles.headerRow}>
          <div className="h-8 w-48 skeleton" />
          <div className={styles.headerActions}>
            <div className="h-10 w-32 skeleton" />
          </div>
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

  if (!salesman) {
    return (
      <div className="page-enter p-6 text-center space-y-4">
        <p className="text-[var(--color-text-secondary)]">Salesman not found or failed to load.</p>
        <button className="btn-primary text-xs" onClick={() => navigate("/salesman")}>
          Back to List
        </button>
      </div>
    );
  }

  const totalClasses = assignedClasses.length;
  const totalStudents = assignedClasses.reduce((s, c) => s + c.student_count, 0);
  const totalPayment = assignedClasses.reduce((s, c) => s + c.payment, 0);
  const rate = Number(salesman?.commission_per_student || 20);

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
        <span className="text-[var(--color-text-primary)]">{salesman.full_name}</span>
      </div>

      {/* Header */}
      <div className={styles.headerRow}>
        <div className="flex items-center gap-3">
          <button
            className="btn-ghost !p-2 !rounded-lg"
            onClick={() => navigate("/salesman")}
            title="Back to List"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className={styles.headerTitle}>{salesman.full_name}</h1>
            <p className={styles.headerSubtitle}>Salesman profile & assigned classes</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className="btn-secondary flex items-center gap-2 text-xs" onClick={() => setShowEditDialog(true)}>
            <Edit size={14} />
            Edit Profile
          </button>
          {assignedClasses.length > 0 && (
            <button className="btn-secondary flex items-center gap-2 text-xs" onClick={handleDownloadPDF}>
              <Download size={14} />
              Download Summary PDF
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className={clsx("stagger-children", styles.statsGrid)}>
        <div className="stat-card">
          <p className={styles.statTitle}>Assigned Classes</p>
          <p className={styles.statValue}>{totalClasses}</p>
          <p className={clsx(styles.statSub, "text-[var(--color-text-muted)]")}>Direct assignments</p>
        </div>

        <div className="stat-card">
          <p className={styles.statTitle}>Total Students</p>
          <p className={styles.statValue}>{totalStudents.toLocaleString()}</p>
          <p className={clsx(styles.statSub, "text-[var(--color-brand-400)]")}>Across assigned classes</p>
        </div>

        <div className="stat-card">
          <p className={styles.statTitle}>Total Income</p>
          <p className={clsx(styles.statValue, "text-[var(--color-success)]")}>₹{totalPayment.toLocaleString()}</p>
          <p className={clsx(styles.statSub, "text-[var(--color-text-muted)]")}>
            Formula: {totalStudents} students × ₹{rate}
          </p>
        </div>
      </div>

      {/* Contact & Bank Details Grid */}
      <div className={styles.detailsGrid}>
        {/* Contact Info */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>
            Contact Information
          </h2>
          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <Phone className="text-[var(--color-text-muted)] shrink-0" size={18} />
              <div>
                <p className={styles.infoItemLabel}>Mobile Number</p>
                <p className={clsx(styles.infoItemValue, "font-mono")}>{salesman.mobile || "—"}</p>
              </div>
            </div>
            <div className={styles.infoItem}>
              <Mail className="text-[var(--color-text-muted)] shrink-0" size={18} />
              <div>
                <p className={styles.infoItemLabel}>Email Address</p>
                <p className={styles.infoItemValue}>{salesman.email || "—"}</p>
              </div>
            </div>
            <div className={styles.infoItem}>
              <MapPin className="text-[var(--color-text-muted)] shrink-0" size={18} />
              <div>
                <p className={styles.infoItemLabel}>Assigned Area</p>
                <p className={styles.infoItemValue}>{salesman.area || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Info */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>
            Bank Details
          </h2>
          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <Building className="text-[var(--color-text-muted)] shrink-0" size={18} />
              <div>
                <p className={styles.infoItemLabel}>Bank Name</p>
                <p className={styles.infoItemValue}>{salesman.bank_name || "—"}</p>
              </div>
            </div>
            <div className={styles.infoItem}>
              <CreditCard className="text-[var(--color-text-muted)] shrink-0" size={18} />
              <div>
                <p className={styles.infoItemLabel}>IFSC Code</p>
                <p className={clsx(styles.infoItemValue, "font-mono")}>{salesman.bank_ifsc || "—"}</p>
              </div>
            </div>
            <div className={styles.infoItem}>
              <CreditCard className="text-[var(--color-text-muted)] shrink-0" size={18} />
              <div>
                <p className={styles.infoItemLabel}>Account Number</p>
                <p className={clsx(styles.infoItemValue, "font-mono")}>{salesman.bank_account_number || "—"}</p>
              </div>
            </div>
            <div className={styles.infoItem}>
              <Calendar className="text-[var(--color-text-muted)] shrink-0" size={18} />
              <div>
                <p className={styles.infoItemLabel}>Commission Rate</p>
                <p className={styles.infoItemValue}>₹{rate} Per Student</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Classes Section */}
      <div className={styles.classesSection}>
        <div>
          <h2 className={styles.classesTitle}>Assigned Classes</h2>
          <p className={styles.classesSubtitle}>Click a class to view details and payment breakdown</p>
        </div>

        {assignedClasses.length > 0 ? (
          <div className={styles.classesGrid}>
            {assignedClasses.map((cls, idx) => (
              <div
                key={idx}
                className={styles.classCard}
                onClick={() => navigate(`/salesman/${salesmanId}/classes/${cls.owner_id}`)}
              >
                <div className={styles.classCardHeader}>
                  <div>
                    <h4 className={styles.classCardTitle}>
                      {cls.institute_name}
                    </h4>
                    <p className={styles.classCardSub}>
                      {formatClassId(cls.owner_id)} · {cls.city}
                    </p>
                  </div>
                  <span className={`badge badge-${(cls.status || "active").toLowerCase()}`}>
                    {cls.status}
                  </span>
                </div>

                <div className={styles.classCardFooter}>
                  <div className={styles.classCardFooterLeft}>
                    <span className={styles.footerCount}>{cls.student_count}</span>
                    <span className={styles.footerLabel}>students</span>
                  </div>
                  <div className={styles.classCardFooterRight}>
                    <p className={styles.footerPaymentLabel}>Payment</p>
                    <p className={styles.footerPaymentVal}>
                      ₹{cls.payment.toLocaleString()}
                    </p>
                    <p className={styles.footerFormula}>
                      {cls.student_count} × ₹{rate}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card-elevated py-16 flex flex-col items-center justify-center text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-default)]">
            <School size={48} className="mb-4 opacity-20" />
            <span className="text-sm font-medium">No classes assigned to this salesman yet</span>
          </div>
        )}
      </div>

      {/* Edit Salesman Dialog */}
      {showEditDialog && (
        <EditSalesmanDialog
          salesman={salesman}
          onClose={() => setShowEditDialog(false)}
          onSaved={() => {
            setShowEditDialog(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Edit Salesman Dialog
// ────────────────────────────────────────────────────────────
export function EditSalesmanDialog({ salesman, onClose, onSaved }: { salesman: any; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [form, setForm] = useState({
    fullName: salesman.full_name || "",
    mobile: salesman.mobile || "",
    email: salesman.email || "",
    bankName: salesman.bank_name || "",
    bankIfsc: salesman.bank_ifsc || "",
    bankAccountNumber: salesman.bank_account_number || "",
    commissionPerStudent: Number(salesman.commission_per_student) || 20,
  });

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    getAllClasses().then(setClasses).catch(console.error);

    getAssignedClasses(salesman.salesperson_id)
      .then((assigned) => {
        setSelectedClassIds(assigned.map((c: any) => c.owner_id));
      })
      .catch(console.error);
  }, [salesman.salesperson_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.mobile || !form.email) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      await updateSalesman(salesman.salesperson_id, {
        fullName: form.fullName.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        bankName: form.bankName.trim(),
        bankIfsc: form.bankIfsc.trim().toUpperCase(),
        bankAccountNumber: form.bankAccountNumber.trim(),
        commissionPerStudent: Number(form.commissionPerStudent) || 20,
        assignedClassIds: selectedClassIds,
      });
      toast.success("Salesman updated successfully!");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to update salesman");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
        <div className="modal-header">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Edit Salesman</h2>
          <button className="btn-ghost !p-2 !rounded-lg" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 text-left flex flex-col gap-6">
          <div className="space-y-4">
            <h3 className="text-[0.75rem] font-bold tracking-[0.08em] uppercase text-[var(--color-text-muted)] pb-2 border-b border-[var(--color-border-subtle)]">
              Personal Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Full Name *</label>
                <input className="input-field" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Mobile Number *</label>
                <input className="input-field font-mono" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
              </div>
              <div className={clsx(styles.fieldGroup, "sm:col-span-2")}>
                <label className={styles.fieldLabel}>Email Address *</label>
                <input className="input-field" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[0.75rem] font-bold tracking-[0.08em] uppercase text-[var(--color-text-muted)] pb-2 border-b border-[var(--color-border-subtle)]">
              Job Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Commission Per Student (₹) *</label>
                <input className="input-field font-mono" type="number" value={form.commissionPerStudent} onChange={(e) => set("commissionPerStudent", Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[0.75rem] font-bold tracking-[0.08em] uppercase text-[var(--color-text-muted)] pb-2 border-b border-[var(--color-border-subtle)]">
              Assign Classes
            </h3>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Select Classes to Assign</label>
              <div className={styles.selectorBox}>
                {classes.map((c) => (
                  <label key={c.owner_id} className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={selectedClassIds.includes(c.owner_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClassIds([...selectedClassIds, c.owner_id]);
                        } else {
                          setSelectedClassIds(selectedClassIds.filter((id) => id !== c.owner_id));
                        }
                      }}
                      className={styles.checkboxInput}
                    />
                    <span>{c.institute_name} <span className={styles.checkboxLabelMuted}>({c.city})</span></span>
                  </label>
                ))}
                {classes.length === 0 && (
                  <span className="text-xs text-[var(--color-text-muted)] italic">No classes found</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[0.75rem] font-bold tracking-[0.08em] uppercase text-[var(--color-text-muted)] pb-2 border-b border-[var(--color-border-subtle)]">
              Bank Account Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Bank Name</label>
                <input className="input-field" value={form.bankName} onChange={(e) => set("bankName", e.target.value)} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Bank IFSC Code</label>
                <input className="input-field font-mono" value={form.bankIfsc} onChange={(e) => set("bankIfsc", e.target.value)} />
              </div>
              <div className={clsx(styles.fieldGroup, "sm:col-span-2")}>
                <label className={styles.fieldLabel}>Bank Account Number</label>
                <input className="input-field font-mono" value={form.bankAccountNumber} onChange={(e) => set("bankAccountNumber", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-2 pt-4 border-t border-[var(--color-border-subtle)]">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
