import { useNavigate } from "react-router-dom";
import { Home, AlertTriangle } from "lucide-react";
import styles from "./NotFoundPage.module.css";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      {/* Background elements */}
      <div className={styles.bgGrad1} />
      <div className={styles.bgGrad2} />

      <div className={`${styles.card} glass-card-elevated`}>
        <div className={styles.iconContainer}>
          <div className={styles.iconBlur} />
          <AlertTriangle size={48} style={{ position: "relative", zIndex: 10, filter: "drop-shadow(0 10px 8px rgba(0,0,0,0.15))" }} />
        </div>
        
        <h1 className={styles.title}>
          404
        </h1>
        
        <p className={styles.subtitle}>
          Page Not Found
        </p>
        
        <p className={styles.description}>
          The page you're looking for doesn't exist, has been moved, or you don't have permission to access it.
        </p>
        
        <button 
          className={`${styles.button} btn-primary`}
          onClick={() => navigate("/dashboard")}
        >
          <Home size={18} />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

