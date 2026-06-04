import { useState, useEffect, type FormEvent } from "react";
import {
  Users,
  Plus,
  Phone,
  MapPin,
  Building,
  CreditCard,
  X,
  Loader2,
  Calendar,
  Search,
  IndianRupee,
  Edit
} from "lucide-react";
import { getAllEmployees, addEmployee, updateEmployee } from "@/services/db";
import { supabase } from "@/services/supabase";
import { toast } from "sonner";
import PhotoUploadField from "@/components/PhotoUploadField";
import { uploadToCloudinary } from "@/services/cloudinary";
import clsx from "clsx";
import styles from "./EmployeePage.module.css";

export default function EmployeePage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const emps = await getAllEmployees();
      setEmployees(emps);
    } catch (err) {
      console.error("Failed to load employees:", err);
      toast.error("Failed to load employee directory");
    } finally {
      setLoading(false);
    }
  }

  const filteredEmployees = employees.filter((emp) => {
    const query = searchQuery.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(query) ||
      emp.mobile?.includes(query) ||
      emp.role?.toLowerCase().includes(query) ||
      emp.bank_name?.toLowerCase().includes(query)
    );
  });

  const totalEmployees = employees.length;
  const totalSalaryRoll = employees.reduce((acc, curr) => acc + Number(curr.assigned_salary || 0), 0);

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
          <h1 className={styles.headerTitle}>Employees</h1>
          <p className={styles.headerSubtitle}>
            Manage your internal staff directories, contact information, and bank profiles.
          </p>
        </div>
        <button className="btn-primary text-xs flex items-center gap-2" onClick={() => setShowAddDialog(true)}>
          <Plus size={14} />
          Add Employee
        </button>
      </div>

      {/* Summary Cards */}
      <div className={clsx(styles.statsGrid, "stagger-children")}>
        <div className={clsx("stat-card", styles.statCard)}>
          <div className={styles.statHeader}>
            <div className="icon-badge icon-badge-brand">
              <Users size={20} />
            </div>
            <span className={styles.statTitle}>Total Staff</span>
          </div>
          <p className={styles.statValue}>{totalEmployees}</p>
        </div>
        <div className={clsx("stat-card", styles.statCard)}>
          <div className={styles.statHeader}>
            <div className="icon-badge icon-badge-success">
              <IndianRupee size={20} />
            </div>
            <span className={styles.statTitle}>Monthly Salary Roll</span>
          </div>
          <p className={styles.statValue}>₹{totalSalaryRoll.toLocaleString()}</p>
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
            placeholder="Search employees by name, role, contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Employee List Table */}
      <div className={clsx("glass-card-elevated", styles.tableCard)} style={{ padding: "1.5rem", overflow: "hidden" }}>
        <div className={clsx(styles.tableWrapper, "custom-scrollbar")}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name & Role</th>
                <th>Mobile Number</th>
                <th>Address</th>
                <th>Bank Profile</th>
                <th>Assigned Salary</th>
                <th>Registered On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp, idx) => (
                  <tr key={idx} className="transition-colors">
                    <td>
                      <div className={styles.employeeInfo}>
                        {emp.profile_photo_url ? (
                          <img
                            src={emp.profile_photo_url}
                            alt={emp.name}
                            className={styles.employeePhoto}
                          />
                        ) : (
                          <div className={styles.employeePhotoPlaceholder}>
                            {emp.name ? emp.name.charAt(0) : <Users size={16} />}
                          </div>
                        )}
                        <div className={styles.employeeMeta}>
                          <span className={styles.employeeName}>{emp.name}</span>
                          <span className={styles.employeeRole}>
                            {emp.role || "Staff Member"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.employeePhone}>
                        <Phone size={14} style={{ color: "var(--color-text-muted)" }} />
                        {emp.mobile || "—"}
                      </span>
                    </td>
                    <td style={{ maxWidth: "20rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span className={styles.employeeAddress} title={emp.address}>
                        <MapPin size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                        {emp.address || "—"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.bankInfo}>
                        {emp.bank_name ? (
                          <>
                            <span className={styles.bankName}>
                              <Building size={14} style={{ color: "var(--color-text-muted)" }} />
                              {emp.bank_name}
                            </span>
                            <span className={styles.bankAccount}>A/C: {emp.account_number || "—"}</span>
                            <span className={styles.bankIfsc}>IFSC: {emp.ifsc_code || "—"}</span>
                          </>
                        ) : (
                          <span className={styles.noBank}>No Bank Account</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={styles.salaryValue}>
                        ₹{Number(emp.assigned_salary || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className={styles.registeredDate}>
                        <Calendar size={14} style={{ color: "var(--color-text-muted)" }} />
                        {new Date(emp.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: "0.375rem 0.5rem", fontSize: "0.75rem", fontWeight: "700" }}
                        onClick={() => setEditingEmployee(emp)}
                        title="Edit Employee"
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 0", color: "var(--color-text-muted)" }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: "500" }}>No employees found matching the search.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Dialog */}
      {showAddDialog && (
        <AddEmployeeDialog
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false);
            loadData();
          }}
        />
      )}

      {editingEmployee && (
        <EditEmployeeDialog
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSuccess={() => {
            setEditingEmployee(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Add Employee Dialog Component
// ────────────────────────────────────────────────────────────
function AddEmployeeDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    address: "",
    role: "",
    account_number: "",
    bank_name: "",
    ifsc_code: "",
    assigned_salary: ""
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Employee Name is required");
      return;
    }
    const salary = Number(form.assigned_salary) || 0;
    if (form.assigned_salary !== "" && isNaN(salary)) {
      toast.error("Assigned salary must be a valid number");
      return;
    }

    setSaving(true);
    try {
      let profile_photo_url = undefined;
      if (profilePhotoFile) {
        toast.loading("Uploading profile photo...", { id: "upload-toast" });
        try {
          profile_photo_url = await uploadToCloudinary(profilePhotoFile);
        } catch (uploadError) {
          toast.error("Profile photo upload failed. Please try again.", { id: "upload-toast" });
          setSaving(false);
          return;
        }
        toast.dismiss("upload-toast");
      }

      // Check if mobile already exists in employees table
      const trimmedMobile = form.mobile.trim();
      if (trimmedMobile) {
        const { data: existingEmployees, error: checkError } = await supabase
          .from("employees")
          .select("name, mobile")
          .eq("mobile", trimmedMobile);

        if (!checkError && existingEmployees && existingEmployees.length > 0) {
          const match = existingEmployees[0];
          toast.warning(`This mobile is already registered with ${match.name}`, {
            duration: 5000,
          });
        }
      }

      await addEmployee({
        name: form.name.trim(),
        mobile: form.mobile.trim() || undefined,
        address: form.address.trim() || undefined,
        role: form.role.trim() || undefined,
        account_number: form.account_number.trim() || undefined,
        bank_name: form.bank_name.trim() || undefined,
        ifsc_code: form.ifsc_code.trim().toUpperCase() || undefined,
        assigned_salary: salary,
        profile_photo_url
      });
      toast.success("Employee onboarded successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to onboard employee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
        <div className="modal-header">
          <h2 className={styles.modalTitle}>Add New Employee</h2>
          <button className="btn-ghost" style={{ padding: "0.5rem", borderRadius: "0.5rem" }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGrid}>
            <div className={clsx(styles.spanFull, styles.formGroup)}>
              <label className={styles.formLabel}>Employee Name *</label>
              <input
                className="input-field"
                required
                placeholder="Enter full name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Mobile Number</label>
              <input
                className="input-field font-mono"
                type="tel"
                placeholder="e.g. 9876543210"
                value={form.mobile}
                onChange={(e) => set("mobile", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Role / Designation</label>
              <input
                className="input-field"
                placeholder="e.g. Academic Lead, HR"
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
              />
            </div>
            <div className={clsx(styles.spanFull, styles.formGroup)}>
              <label className={styles.formLabel}>Address</label>
              <textarea
                className="input-field"
                style={{ minHeight: "80px", resize: "vertical" }}
                placeholder="Enter residence address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
            <div className={styles.spanFull}>
              <PhotoUploadField
                label="Profile Photo"
                value={profilePhotoFile}
                onChange={(file) => setProfilePhotoFile(file)}
                disabled={saving}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Bank Name</label>
              <input
                className="input-field"
                placeholder="e.g. HDFC Bank"
                value={form.bank_name}
                onChange={(e) => set("bank_name", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Bank Account Number (A/C)</label>
              <input
                className="input-field font-mono"
                placeholder="Enter account number"
                value={form.account_number}
                onChange={(e) => set("account_number", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>IFSC Code</label>
              <input
                className="input-field font-mono"
                placeholder="e.g. HDFC0001234"
                value={form.ifsc_code}
                onChange={(e) => set("ifsc_code", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Assigned Salary (₹)</label>
              <input
                className="input-field font-mono text-success font-bold"
                type="number"
                placeholder="e.g. 25000"
                value={form.assigned_salary}
                onChange={(e) => set("assigned_salary", e.target.value)}
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
                  <Loader2 size={16} className="animate-spin" style={{ marginRight: "0.5rem" }} /> Onboarding...
                </div>
              ) : (
                "Onboard Employee"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Edit Employee Dialog Component
// ────────────────────────────────────────────────────────────
function EditEmployeeDialog({ employee, onClose, onSuccess }: { employee: any; onClose: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(employee.profile_photo_url || "");
  const [form, setForm] = useState({
    name: employee.name || "",
    mobile: employee.mobile || "",
    address: employee.address || "",
    role: employee.role || "",
    account_number: employee.account_number || "",
    bank_name: employee.bank_name || "",
    ifsc_code: employee.ifsc_code || "",
    assigned_salary: employee.assigned_salary?.toString() || ""
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Employee Name is required");
      return;
    }
    const salary = Number(form.assigned_salary) || 0;
    if (form.assigned_salary !== "" && isNaN(salary)) {
      toast.error("Assigned salary must be a valid number");
      return;
    }

    setSaving(true);
    try {
      let profile_photo_url = existingPhotoUrl || null;
      if (profilePhotoFile) {
        toast.loading("Uploading profile photo...", { id: "upload-toast" });
        try {
          profile_photo_url = await uploadToCloudinary(profilePhotoFile);
        } catch (uploadError) {
          toast.error("Profile photo upload failed. Please try again.", { id: "upload-toast" });
          setSaving(false);
          return;
        }
        toast.dismiss("upload-toast");
      }

      await updateEmployee(employee.employee_id, {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        address: form.address.trim(),
        role: form.role.trim(),
        account_number: form.account_number.trim(),
        bank_name: form.bank_name.trim(),
        ifsc_code: form.ifsc_code.trim(),
        assigned_salary: salary,
        profile_photo_url: profile_photo_url || undefined
      });
      toast.success("Employee updated successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to update employee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
        <div className="modal-header">
          <h2 className={styles.modalTitle}>Edit Employee</h2>
          <button className="btn-ghost" style={{ padding: "0.5rem", borderRadius: "0.5rem" }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Full Name *</label>
              <input
                className="input-field"
                placeholder="e.g. Rahul Sharma"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Mobile Number</label>
              <input
                className="input-field font-mono"
                placeholder="10-digit number"
                value={form.mobile}
                onChange={(e) => set("mobile", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Role / Designation</label>
              <input
                className="input-field"
                placeholder="e.g. Academic Lead, HR"
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
              />
            </div>
            <div className={clsx(styles.spanFull, styles.formGroup)}>
              <label className={styles.formLabel}>Address</label>
              <textarea
                className="input-field"
                style={{ minHeight: "80px", resize: "vertical" }}
                placeholder="Enter residence address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
            <div className={styles.spanFull}>
              <PhotoUploadField
                label="Profile Photo"
                value={profilePhotoFile}
                existingUrl={existingPhotoUrl}
                onChange={(file) => {
                  setProfilePhotoFile(file);
                  if (!file) {
                    setExistingPhotoUrl("");
                  }
                }}
                disabled={saving}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Bank Name</label>
              <input
                className="input-field"
                placeholder="e.g. HDFC Bank"
                value={form.bank_name}
                onChange={(e) => set("bank_name", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Bank Account Number (A/C)</label>
              <input
                className="input-field font-mono"
                placeholder="Enter account number"
                value={form.account_number}
                onChange={(e) => set("account_number", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>IFSC Code</label>
              <input
                className="input-field font-mono"
                placeholder="e.g. HDFC0001234"
                value={form.ifsc_code}
                onChange={(e) => set("ifsc_code", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Assigned Salary (₹)</label>
              <input
                className="input-field font-mono text-success font-bold"
                type="number"
                placeholder="e.g. 25000"
                value={form.assigned_salary}
                onChange={(e) => set("assigned_salary", e.target.value)}
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
                  <Loader2 size={16} className="animate-spin" style={{ marginRight: "0.5rem" }} /> Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


