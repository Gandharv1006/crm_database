import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Phone,
  Mail,
  Loader2,
  X,
  CreditCard,
  MapPin,
  Calendar,
  Building,
  Users,
  Edit
} from "lucide-react";
import { getAllSalespeople, addSalesperson, getAllClasses } from "@/services/db";
import { supabase } from "@/services/supabase";
import { toast } from "sonner";
import { EditSalesmanDialog } from "./SalesmanDetailPage";
import PhotoUploadField from "@/components/PhotoUploadField";
import { uploadToCloudinary } from "@/services/cloudinary";
import styles from "./SalesmanPage.module.css";
import clsx from "clsx";

export default function SalesmanPage() {
  const navigate = useNavigate();
  const [salespeople, setSalespeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const sps = await getAllSalespeople();
      setSalespeople(sps);
    } catch (err) {
      console.error("Failed to load salespeople:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={clsx("page-enter", styles.container)}>
        <div className={styles.headerRow}>
          <div>
            <div className="h-6 w-32 skeleton" />
            <div className="h-4 w-64 skeleton" style={{ marginTop: "0.25rem" }} />
          </div>
          <div className="h-10 w-36 skeleton" />
        </div>
        <div className="h-12 w-full skeleton rounded-xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className={clsx("page-enter", styles.container)}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.headerTitle}>Salesman</h1>
          <p className={styles.headerSubtitle}>
            Manage sales team, assigned areas, and commission payments.
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddDialog(true)}>
          <Plus size={16} />
          Add Salesman
        </button>
      </div>

      {/* Commission Rate Info Bar */}
      <div className={styles.infoBanner}>
        <div className={styles.bannerLeft}>
          <CreditCard size={18} />
          <span>Commission Rate: ₹20 per student</span>
        </div>
        <span>Payment = Students × 20</span>
      </div>

      {/* Summary Cards */}
      {(() => {
        const totalSalesmanIncome = salespeople.reduce((sum, sp) => sum + (sp.total_payment || 0), 0);
        return (
          <div className={styles.summaryGrid}>
            <div className={clsx("stat-card", styles.summaryCard)}>
              <p className={styles.summaryTitle}>Total Salesmen</p>
              <p className={styles.summaryValue}>{salespeople.length}</p>
            </div>
            <div className={clsx("stat-card", styles.summaryCard)}>
              <p className={styles.summaryTitle}>Total Salesman Income</p>
              <p className={styles.summaryValueSuccess}>₹{totalSalesmanIncome.toLocaleString()}</p>
            </div>
          </div>
        );
      })()}

      {/* Salespeople Table */}
      <div className={clsx("glass-card-elevated p-6 overflow-hidden", styles.tableCard)}>
        <div className={styles.tableWrapper}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Area</th>
                <th>Bank Details</th>
                <th>Classes</th>
                <th>Total Payment</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {salespeople.length > 0 ? (
                salespeople.map((sp, idx) => (
                  <tr key={idx} className="hover:bg-[var(--color-surface-2)] transition-colors">
                    <td>
                      <div className={styles.salesmanInfo}>
                        {sp.profile_photo_url ? (
                          <img
                            src={sp.profile_photo_url}
                            alt={sp.full_name}
                            className={styles.salesmanPhoto}
                          />
                        ) : (
                          <div className={styles.salesmanPhotoFallback}>
                            {sp.full_name ? sp.full_name.charAt(0) : <Users size={16} />}
                          </div>
                        )}
                        <div className={styles.salesmanMeta}>
                          <span className={styles.salesmanName}>{sp.full_name}</span>
                          <span className={styles.salesmanSince}>
                            <Calendar size={12} />
                            Since {new Date(sp.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.contactInfo}>
                        <span className={styles.contactItem}><Phone size={12} className="text-[var(--color-text-muted)]" /> {sp.mobile || "—"}</span>
                        <span className={styles.contactItem}><Mail size={12} className="text-[var(--color-text-muted)]" /> {sp.email || "—"}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.areaInfo}>
                        <MapPin size={14} className="text-[var(--color-text-muted)]" />
                        <span className="font-medium">{sp.area || "—"}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.bankInfo}>
                        {sp.bank_name ? (
                          <>
                            <span className={styles.bankNameRow}>
                              <Building size={12} className="text-[var(--color-text-muted)]" />
                              {sp.bank_name}
                            </span>
                            <span className={styles.bankIfsc}>IFSC: {sp.bank_ifsc || "—"}</span>
                          </>
                        ) : (
                          <span className="text-[var(--color-text-muted)] italic">No Bank Info</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={styles.assignedCountBadge}>
                        {sp.assigned_count}
                      </span>
                    </td>
                    <td>
                      <div className={styles.paymentInfo}>
                        <span className={styles.paymentAmount}>
                          ₹{sp.total_payment.toLocaleString()}
                        </span>
                        <span className={styles.paymentSub}>
                          {sp.total_students} students × ₹{Number(sp.commission_per_student || 20)}
                        </span>
                      </div>
                    </td>
                    <td className="text-right">
                      <div className={styles.actionsCell}>
                        <button
                          className="btn-ghost !px-2 !py-1.5 !text-xs font-bold text-[var(--color-text-primary)] hover:text-[var(--color-brand-400)]"
                          onClick={() => setEditingSalesman(sp)}
                          title="Edit Salesman"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="btn-ghost !px-3 !py-1.5 !text-xs font-bold text-[var(--color-brand-400)] hover:text-[var(--color-brand-300)]"
                          onClick={() => navigate(`/salesman/${sp.salesperson_id}`)}
                        >
                          View Profile
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
                      <Users size={48} className="mb-4 opacity-20" />
                      <span className="text-sm font-medium">No salespeople registered yet.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Salesperson Dialog */}
      {showAddDialog && (
        <AddSalesmanDialog
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false);
            loadData();
          }}
        />
      )}

      {editingSalesman && (
        <EditSalesmanDialog
          salesman={editingSalesman}
          onClose={() => setEditingSalesman(null)}
          onSaved={() => {
            setEditingSalesman(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Add Salesman Dialog
// ────────────────────────────────────────────────────────────
function AddSalesmanDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    email: "",
    bankName: "",
    bankIfsc: "",
    bankAccountNumber: "",
    commissionPerStudent: 20,
    password: "sales123",
  });

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    getAllClasses().then(setClasses).catch(console.error);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.mobile || !form.email || !form.password) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      let profilePhotoUrl = "";
      if (profilePhotoFile) {
        toast.loading("Uploading profile photo...", { id: "upload-toast" });
        try {
          profilePhotoUrl = await uploadToCloudinary(profilePhotoFile);
        } catch (uploadError) {
          toast.error("Profile photo upload failed. Please try again.", { id: "upload-toast" });
          setSaving(false);
          return;
        }
        toast.dismiss("upload-toast");
      }

      // Check for duplicate mobile or email in salespeople table
      const trimmedMobile = form.mobile.trim();
      const trimmedEmail = form.email.trim().toLowerCase();
      if (trimmedMobile || trimmedEmail) {
        const queryParts = [];
        if (trimmedMobile) queryParts.push(`mobile.eq.${trimmedMobile}`);
        if (trimmedEmail) queryParts.push(`email.eq.${trimmedEmail}`);
        
        const { data: existingSalespeople, error: checkError } = await supabase
          .from("salespeople")
          .select("full_name, mobile, email")
          .or(queryParts.join(","));

        if (!checkError && existingSalespeople && existingSalespeople.length > 0) {
          const match = existingSalespeople[0];
          const matchedFields = [];
          if (trimmedMobile && match.mobile === trimmedMobile) matchedFields.push("mobile");
          if (trimmedEmail && match.email?.toLowerCase() === trimmedEmail) matchedFields.push("email");
          toast.warning(`This ${matchedFields.join(" and ")} is already registered with ${match.full_name}`, {
            duration: 5000,
          });
        }
      }

      await addSalesperson({
        fullName: form.fullName.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        bankName: form.bankName.trim(),
        bankIfsc: form.bankIfsc.trim().toUpperCase(),
        bankAccountNumber: form.bankAccountNumber.trim(),
        commissionPerStudent: Number(form.commissionPerStudent) || 20,
        password: form.password,
        assignedClassIds: selectedClassIds,
        profilePhotoUrl,
      });
      toast.success("Salesman registered successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to register salesman");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
        <div className="modal-header">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Add Salesman</h2>
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
                <label className={styles.fieldLabel}>Email Address * (Will be CRM login email)</label>
                <input className="input-field" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <PhotoUploadField
                  label="Profile Photo"
                  value={profilePhotoFile}
                  onChange={(file) => setProfilePhotoFile(file)}
                  disabled={saving}
                />
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
                <input className="input-field font-mono" value={form.bankAccountNumber} onChange={(e) => set("bankAccountNumber", e.target.value)} placeholder="Enter account number" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-2 pt-4 border-t border-[var(--color-border-subtle)]">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Registering...</> : "Add Salesman"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
