import { useLocation } from "react-router-dom";
import { Menu, Search, Bell } from "lucide-react";
import { getUser } from "@/services/auth";
import styles from "./topbar.module.css";
import clsx from "clsx";

interface TopbarProps {
  onMenuToggle: () => void;
  sidebarCollapsed: boolean;
}

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/classes": "Classes",
  "/wallet": "Wallet Management",
  "/salesman": "Sales Team",
  "/payments": "Payments",
  "/analytics": "Platform Analytics",
  "/employees": "Employees",
  "/expenses": "Expenses",
};

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const location = useLocation();
  const user = getUser();

  // Find the matching title (handle nested routes like /classes/:id or /salesman/:id)
  const currentTitle =
    routeTitles[location.pathname] ||
    Object.entries(routeTitles).find(([path]) =>
      location.pathname.startsWith(path)
    )?.[1] ||
    "ACADEX CRM";

  return (
    <header className={styles.header}>
      {/* Left: Menu + Title */}
      <div className={styles.leftSection}>
        <button
          onClick={onMenuToggle}
          className={styles.menuButton}
        >
          <Menu size={20} />
        </button>
        <h1 className={styles.title}>
          {currentTitle}
        </h1>
      </div>

      {/* Right: Icons + User Pill */}
      <div className={styles.rightSection}>
        <button className={styles.iconButton}>
          <Search size={18} />
        </button>
        <button className={styles.iconButton}>
          <Bell size={18} />
          <span className={styles.badgeDot}></span>
        </button>

        {user && (
          <div className={styles.userPill}>
            <div className={styles.userDetails}>
              <span className={styles.userName}>
                {user.fullName}
              </span>
              <span
                className={clsx(
                  styles.userRole,
                  user.role === "SUPER_ADMIN" ? styles.roleAdmin : styles.roleSales
                )}
              >
                {user.role === "SUPER_ADMIN" ? "Super Admin" : "Sales Manager"}
              </span>
            </div>
            <div className={styles.userAvatar}>
              {user.fullName.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
