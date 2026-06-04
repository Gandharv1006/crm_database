import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/services/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import styles from "./LoginPage.module.css";
import clsx from "clsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome to ACADEX CRM!");
      navigate("/dashboard", { replace: true });
    } catch {
      setErrorMsg("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Radial Gradient Glow */}
      <div className={styles.radialGlow} />

      <div className={clsx("glass-card-elevated page-enter", styles.card)}>
        {/* Logo */}
        <div className={styles.logoHeader}>
          <div className={styles.logoIcon}>
            A
          </div>
          <h1 className={styles.title}>
            Welcome back
          </h1>
          <p className={styles.subtitle}>
            Sign in to CRM
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="login-email">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              className="input-field"
              placeholder="admin@acadex.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="login-password">
              Password
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className={clsx("input-field", styles.passwordInput)}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.eyeButton}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={clsx("btn-primary", styles.submitBtn)}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              "Sign In →"
            )}
          </button>
          
          {errorMsg && (
            <p className={styles.errorMessage}>
              {errorMsg}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
