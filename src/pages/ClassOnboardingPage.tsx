import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  School,
  Lock,
  CheckCircle,
  FileText,
  Loader2
} from "lucide-react";
import { getAllSalespeople, addNewClass } from "@/services/db";
import { getUser } from "@/services/auth";
import { toast } from "sonner";
import PhotoUploadField from "@/components/PhotoUploadField";
import { uploadToCloudinary } from "@/services/cloudinary";
import styles from "./ClassOnboardingPage.module.css";
import clsx from "clsx";

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Lakshadweep", "Puducherry"
];

export default function ClassOnboardingPage() {
  const navigate = useNavigate();
  const currentUser = getUser();
  const [salespeople, setSalespeople] = useState<any[]>([]);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [enablePaymentBoard, setEnablePaymentBoard] = useState(false);

  // Form State
  const [form, setForm] = useState({
    // Step 1: Basic & Location & Academic Details
    instituteName: "",
    ownerFullName: "",
    ownerMobile: "",
    alternateMobile: "",
    ownerEmail: "",
    salespersonId: "",
    classPhotoFile: null as File | null,
    ownerPhotoFile: null as File | null,
    classLogoFile: null as File | null,
    classPhotoUrl: "",
    ownerPhotoUrl: "",
    classLogoUrl: "",
    officeAddress: "",
    city: "",
    state: "Maharashtra",
    pincode: "",
    deviceId: "",
    deductionPerStudent: 270,
    notes: "",

    // Step 2: Credentials - Section A (Class Admin)
    username: "",
    password: "",
    confirmPassword: "",

    // Step 2: Credentials - Section B (Payment Board)
    paymentBoardUsername: "",
    paymentBoardPassword: "",
    paymentBoardConfirmPassword: ""
  });

  useEffect(() => {
    getAllSalespeople().then(setSalespeople).catch(console.error);
  }, []);

  const handleChange = (k: string, v: any) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  // Generate credentials automatically based on owner name / institute name if needed
  useEffect(() => {
    if (form.ownerFullName) {
      if (!form.username) {
        const suggestedUsername = form.ownerFullName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .substring(0, 10) + Math.floor(100 + Math.random() * 900);
        handleChange("username", suggestedUsername);
      }
      if (!form.password) {
        const generatedPassword = `Acadex@${Math.floor(1000 + Math.random() * 9000)}`;
        handleChange("password", generatedPassword);
        handleChange("confirmPassword", generatedPassword);
      }
    }
  }, [form.ownerFullName]);

  // Basic validation per step
  const validateStep = () => {
    if (step === 1) {
      if (!form.instituteName.trim()) {
        toast.error("Class Name is required");
        return false;
      }
      if (!form.ownerFullName.trim()) {
        toast.error("Owner Name is required");
        return false;
      }
      if (!form.deviceId.trim()) {
        toast.error("Device ID is required");
        return false;
      }
      if (!form.ownerEmail.trim()) {
        toast.error("Email Address is required");
        return false;
      }
      if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
        toast.error("Pincode must be a 6-digit number");
        return false;
      }
      if (Number(form.deductionPerStudent) <= 0) {
        toast.error("Deduction Per Student must be greater than 0");
        return false;
      }
    } else if (step === 2) {
      // Section A validation (MANDATORY)
      if (!form.username.trim()) {
        toast.error("Class Admin Login Username is required");
        return false;
      }
      if (!form.password) {
        toast.error("Class Admin Login Password is required");
        return false;
      }
      if (form.password !== form.confirmPassword) {
        toast.error("Class Admin Login Passwords do not match");
        return false;
      }

      // Section B validation (OPTIONAL, validated only if enabled)
      if (enablePaymentBoard) {
        if (!form.paymentBoardUsername.trim()) {
          toast.error("Payment Board Username is required");
          return false;
        }
        if (!form.paymentBoardPassword) {
          toast.error("Payment Board Password is required");
          return false;
        }
        if (form.paymentBoardPassword !== form.paymentBoardConfirmPassword) {
          toast.error("Payment Board Passwords do not match");
          return false;
        }
      }
    }
    return true;
  };

  const uploadPhotos = async (
    classFile: File | null,
    ownerFile: File | null,
    logoFile: File | null
  ) => {
    let classUrl = form.classPhotoUrl;
    let ownerUrl = form.ownerPhotoUrl;
    let logoUrl = form.classLogoUrl;

    try {
      if (classFile) {
        toast.loading("Uploading class photo...", { id: "upload-toast" });
        classUrl = await uploadToCloudinary(classFile);
      }
      if (ownerFile) {
        toast.loading("Uploading owner photo...", { id: "upload-toast" });
        ownerUrl = await uploadToCloudinary(ownerFile);
      }
      if (logoFile) {
        toast.loading("Uploading class logo...", { id: "upload-toast" });
        logoUrl = await uploadToCloudinary(logoFile);
      }
    } catch (uploadError: any) {
      toast.error("Photo upload failed. Please try again.", { id: "upload-toast" });
      throw uploadError;
    }

    toast.dismiss("upload-toast");

    setForm(prev => ({
      ...prev,
      classPhotoUrl: classUrl,
      ownerPhotoUrl: ownerUrl,
      classLogoUrl: logoUrl,
      classPhotoFile: classFile ? null : prev.classPhotoFile,
      ownerPhotoFile: ownerFile ? null : prev.ownerPhotoFile,
      classLogoFile: logoFile ? null : prev.classLogoFile,
    }));

    return { classUrl, ownerUrl, logoUrl };
  };

  const handleNext = async () => {
    if (validateStep()) {
      if (step === 1) {
        setSaving(true);
        try {
          await uploadPhotos(form.classPhotoFile, form.ownerPhotoFile, form.classLogoFile);
          setStep((s) => s + 1);
        } catch (err) {
          console.error(err);
          // Toast is shown in uploadPhotos
        } finally {
          setSaving(false);
        }
      } else {
        setStep((s) => s + 1);
      }
    }
  };

  const handlePrev = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSaving(true);
    try {
      const { classUrl, ownerUrl, logoUrl } = await uploadPhotos(
        form.classPhotoFile,
        form.ownerPhotoFile,
        form.classLogoFile
      );

      // Address and other extra fields serialized inside notes
      const serializedNotes = JSON.stringify({
        officeAddress: form.officeAddress,
        state: form.state,
        pincode: form.pincode,
        alternateMobile: form.alternateMobile,
        notes: form.notes,
        paymentBoardEnabled: enablePaymentBoard,
        classPhotoUrl: classUrl,
        ownerPhotoUrl: ownerUrl,
        classLogoUrl: logoUrl,
        ...(enablePaymentBoard ? {
          paymentBoardUsername: form.paymentBoardUsername.trim().toLowerCase(),
          paymentBoardPassword: form.paymentBoardPassword
        } : {})
      });

      // Generate Institute ID (INST-XXXXXX-TIMESTAMP)
      const instituteId = `INST-${Math.random().toString(36).substr(2, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      // Submit Section A credentials to addNewClass
      await addNewClass({
        instituteName: form.instituteName,
        ownerFullName: form.ownerFullName,
        ownerEmail: form.ownerEmail,
        ownerMobile: form.ownerMobile,
        username: form.username.trim().toLowerCase(),
        password: form.password,
        city: form.city,
        deductionPerStudent: Number(form.deductionPerStudent),
        salespersonId: form.salespersonId ? Number(form.salespersonId) : undefined,
        notes: serializedNotes,
        registeredBy: currentUser!.userId,
        classAdminUsername: form.username.trim().toLowerCase(),
        classAdminPassword: form.password,
        paymentBoardEnabled: enablePaymentBoard,
        paymentBoardUsername: enablePaymentBoard ? form.paymentBoardUsername.trim().toLowerCase() : null,
        paymentBoardPassword: enablePaymentBoard ? form.paymentBoardPassword : null,
        deviceId: form.deviceId,
        instituteId: instituteId,
        classPhotoUrl: classUrl,
        ownerPhotoUrl: ownerUrl,
        classLogoUrl: logoUrl,
      });

      toast.success("Class registered successfully!");
      navigate("/classes");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to onboard class");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={clsx("page-enter", styles.container)}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[0.65rem] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
        <Link to="/dashboard" className="hover:text-[var(--color-brand-400)] transition-colors">Dashboard</Link>
        <span>&gt;</span>
        <Link to="/classes" className="hover:text-[var(--color-brand-400)] transition-colors">Classes</Link>
        <span>&gt;</span>
        <span className="text-[var(--color-text-primary)]">Add New Class</span>
      </div>

      {/* Header */}
      <div>
        <h1 className={styles.mainTitle}>Class Onboarding</h1>
        <p className={styles.mainSubtitle}>
          Register a new institute and set up their management portal in a few easy steps.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="glass-card p-5 mb-6">
        <div className={styles.stepIndicatorRow}>
          {/* Connecting Line */}
          <div className={styles.stepLineBacking} />
          <div
            className={styles.stepLineActive}
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          />

          {/* Steps */}
          {[
            { num: 1, label: "Basic Details", icon: <School size={16} /> },
            { num: 2, label: "Credentials", icon: <Lock size={16} /> },
            { num: 3, label: "Verification", icon: <CheckCircle size={16} /> }
          ].map((s) => (
            <div key={s.num} className={styles.stepNode}>
              <div
                className={clsx(
                  styles.stepCircle,
                  step === s.num && styles.stepCircleActive,
                  step > s.num && styles.stepCircleCompleted
                )}
              >
                {step > s.num ? <CheckCircle size={16} /> : s.icon}
              </div>
              <span
                className={clsx(
                  styles.stepLabel,
                  step === s.num && styles.stepLabelActive
                )}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Form Card */}
      <div className="glass-card-elevated p-8 min-h-[400px] flex flex-col justify-between">
        {/* Step 1: Basic & Subscription Details */}
        {step === 1 && (
          <div className="space-y-8 animate-fade-in text-left">
            <div>
              <h3 className={styles.cardTitle}>
                Primary Information
              </h3>
              <div className={styles.grid2Col}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Class Name *</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Newton Academy"
                    value={form.instituteName}
                    onChange={(e) => handleChange("instituteName", e.target.value)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Owner Name *</label>
                  <input
                    className="input-field"
                    placeholder="Owner's full name"
                    value={form.ownerFullName}
                    onChange={(e) => handleChange("ownerFullName", e.target.value)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Owner Mobile</label>
                  <input
                    className="input-field"
                    placeholder="10-digit number"
                    value={form.ownerMobile}
                    onChange={(e) => handleChange("ownerMobile", e.target.value)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Contact Number (Alternate)</label>
                  <input
                    className="input-field"
                    placeholder="Alternate phone number"
                    value={form.alternateMobile}
                    onChange={(e) => handleChange("alternateMobile", e.target.value)}
                  />
                </div>
                <div className={clsx(styles.fieldGroup, styles.colSpan2)}>
                  <label className={styles.fieldLabel}>Email Address * (Will be login email)</label>
                  <input
                    className="input-field"
                    type="email"
                    placeholder="e.g. info@newtonacademy.in"
                    value={form.ownerEmail}
                    onChange={(e) => handleChange("ownerEmail", e.target.value)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Device ID *</label>
                  <input
                    className="input-field"
                    placeholder="Enter Device ID"
                    value={form.deviceId}
                    onChange={(e) => handleChange("deviceId", e.target.value)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Assign Salesman</label>
                  <select
                    className="form-select"
                    value={form.salespersonId}
                    onChange={(e) => handleChange("salespersonId", e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {salespeople.map((sp) => (
                      <option key={sp.salesperson_id} value={sp.salesperson_id}>
                        {sp.full_name} ({sp.area || "No Area"})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={clsx(styles.grid3Col, styles.colSpan2)}>
                  <PhotoUploadField
                    label="Class / Institute Photo"
                    value={form.classPhotoFile}
                    onChange={(file) => handleChange("classPhotoFile", file)}
                    disabled={saving}
                  />
                  <PhotoUploadField
                    label="Owner Photo"
                    value={form.ownerPhotoFile}
                    onChange={(file) => handleChange("ownerPhotoFile", file)}
                    disabled={saving}
                  />
                  <PhotoUploadField
                    label="Class Logo"
                    value={form.classLogoFile}
                    onChange={(file) => handleChange("classLogoFile", file)}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className={styles.cardTitle}>
                Subscription & Academic Details
              </h3>
              <div className={styles.grid2Col}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Deduction Per Student (₹) *</label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="270"
                    value={form.deductionPerStudent}
                    onChange={(e) => handleChange("deductionPerStudent", Number(e.target.value))}
                  />
                </div>
                <div className={clsx(styles.fieldGroup, styles.colSpan2)}>
                  <label className={styles.fieldLabel}>Notes / Comments (Optional)</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    placeholder="Any additional remarks about this onboarding"
                    value={form.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    style={{ resize: "vertical" }}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className={styles.cardTitle}>
                Location Details
              </h3>
              <div className={styles.grid3Col}>
                <div className={clsx(styles.fieldGroup, styles.colSpan3)}>
                  <label className={styles.fieldLabel}>Office Address</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    placeholder="Full office address details"
                    value={form.officeAddress}
                    onChange={(e) => handleChange("officeAddress", e.target.value)}
                    style={{ resize: "none" }}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>City</label>
                  <input
                    className="input-field"
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>State</label>
                  <select
                    className="form-select"
                    value={form.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                  >
                    {indianStates.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Pincode</label>
                  <input
                    className="input-field"
                    placeholder="6-digit code"
                    value={form.pincode}
                    onChange={(e) => handleChange("pincode", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Credentials */}
        {step === 2 && (
          <div className="space-y-8 animate-fade-in text-left">
            {/* Section A — Class Admin Login Credentials */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Section A — Class Admin Login Credentials (MANDATORY)</h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  These credentials are required. The class admin will use these to log in to the ACADEX Class Admin panel.
                </p>
              </div>
              
              <div className={clsx(styles.grid2Col, "max-w-xl")}>
                <div className={clsx(styles.fieldGroup, styles.colSpan2)}>
                  <label className={styles.fieldLabel}>Login Username *</label>
                  <div className={styles.usernameInputGroup}>
                    <input
                      className={clsx("input-field", styles.usernameInput)}
                      placeholder="username"
                      value={form.username}
                      onChange={(e) => handleChange("username", e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                    />
                    <span className={styles.usernameSuffix}>
                      @acadex.in
                    </span>
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Login Password *</label>
                  <input
                    className="input-field font-mono"
                    type="text"
                    placeholder="Set login password"
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Confirm Password *</label>
                  <input
                    className="input-field font-mono"
                    type="password"
                    placeholder="Re-type password to confirm"
                    value={form.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <hr className="border-[var(--color-border-subtle)]" />

            {/* Section B — Payment Board Credentials (Optional) */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Section B — Payment Board Credentials (OPTIONAL)</h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  If the class admin wants a separate login for the Payment Board on their side, enable this and provide credentials. These are for the class admin's payment board access — not managed by us.
                </p>
              </div>

              <div className={styles.toggleCard}>
                <input
                  type="checkbox"
                  id="enablePaymentBoard"
                  className="switch-toggle"
                  checked={enablePaymentBoard}
                  onChange={(e) => setEnablePaymentBoard(e.target.checked)}
                />
                <label htmlFor="enablePaymentBoard" className={styles.toggleLabel}>
                  Enable Payment Board Credentials
                </label>
              </div>

              {enablePaymentBoard && (
                <div className={clsx(styles.grid2Col, "max-w-xl animate-fade-in")}>
                  <div className={clsx(styles.fieldGroup, styles.colSpan2)}>
                    <label className={styles.fieldLabel}>Payment Board Username *</label>
                    <input
                      className="input-field"
                      placeholder="payment_username"
                      value={form.paymentBoardUsername}
                      onChange={(e) => handleChange("paymentBoardUsername", e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ""))}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Payment Board Password *</label>
                    <input
                      className="input-field font-mono"
                      type="text"
                      placeholder="Set payment board password"
                      value={form.paymentBoardPassword}
                      onChange={(e) => handleChange("paymentBoardPassword", e.target.value)}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Confirm Payment Board Password *</label>
                    <input
                      className="input-field font-mono"
                      type="password"
                      placeholder="Re-type password to confirm"
                      value={form.paymentBoardConfirmPassword}
                      onChange={(e) => handleChange("paymentBoardConfirmPassword", e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Verification */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in text-left">
            <h3 className={styles.cardTitle}>
              Verification & Review
            </h3>
            <div className={styles.reviewGrid}>
              {/* Card 1 */}
              <div className={styles.reviewCard}>
                <h4 className={styles.reviewCardTitle}>
                  Academy & Location
                </h4>
                <div className={styles.reviewList}>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Institute Name:</span>
                    <span className={styles.reviewValue}>{form.instituteName}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Owner Name:</span>
                    <span className={styles.reviewValue}>{form.ownerFullName}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Owner Contact:</span>
                    <span className={styles.reviewValue}>{form.ownerMobile || "—"}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Email Address:</span>
                    <span className={styles.reviewValueTruncate}>{form.ownerEmail}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>City / State:</span>
                    <span className={styles.reviewValue}>{form.city}, {form.state}</span>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className={styles.reviewCard}>
                <h4 className={styles.reviewCardTitle}>
                  Academic & Credentials
                </h4>
                <div className={styles.reviewList}>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Deduction Per Student:</span>
                    <span className={styles.reviewValue}>₹{form.deductionPerStudent}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Login Username:</span>
                    <span className={clsx(styles.reviewValue, "font-mono text-xs")}>{form.username}@acadex.in</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Password:</span>
                    <span className="font-mono text-xs text-[var(--color-text-primary)]">{form.password}</span>
                  </div>
                  {enablePaymentBoard && (
                    <>
                      <div className={clsx(styles.reviewRow, "border-t border-[var(--color-border-subtle)] pt-2 mt-2")}>
                        <span className={styles.reviewLabel}>Payment Board User:</span>
                        <span className={clsx(styles.reviewValue, "font-mono text-xs")}>{form.paymentBoardUsername}</span>
                      </div>
                      <div className={styles.reviewRow}>
                        <span className={styles.reviewLabel}>Payment Board Pass:</span>
                        <span className="font-mono text-xs text-[var(--color-text-primary)]">{form.paymentBoardPassword}</span>
                      </div>
                    </>
                  )}
                  <div className={clsx(styles.reviewRow, "border-t border-[var(--color-border-subtle)] pt-2 mt-2")}>
                    <span className={styles.reviewLabel}>Salesman Assigned:</span>
                    <span className={styles.reviewValue}>
                      {salespeople.find((sp) => String(sp.salesperson_id) === form.salespersonId)?.full_name || "None"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className={styles.actionRow}>
          <button
            type="button"
            className="btn-ghost flex items-center gap-2"
            onClick={step === 1 ? () => navigate("/classes") : handlePrev}
            disabled={saving}
          >
            <ChevronLeft size={16} />
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 3 ? (
            <button type="button" className="btn-primary flex items-center gap-2" onClick={handleNext}>
              Continue
              <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" className="btn-primary flex items-center gap-2" onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Submit & Register
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
