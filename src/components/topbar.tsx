import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Menu, Search, Bell, Plus, ChevronRight, Activity } from "lucide-react";
import { getUser, isSuperAdmin } from "@/services/auth";
import styles from "./topbar.module.css";
import clsx from "clsx";

interface TopbarProps {
  onMenuToggle: () => void;
  sidebarCollapsed: boolean;
}

const routeTitles: Record<string, string> = {
  "/dashboard": "Executive Dashboard",
  "/classes": "Classes & Academies",
  "/classes/new": "New Class Onboarding",
  "/wallet": "Wallet & Escrow",
  "/salesman": "Sales Team & Pipeline",
  "/payments": "Payments & Billing Ledger",
  "/analytics": "Platform Analytics & Intelligence",
  "/employees": "Staff Directory",
  "/expenses": "Expense Ledger",
};

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const [searchQuery, setSearchQuery] = useState("");

  // Determine section name and breadcrumbs
  const currentTitle =
    routeTitles[location.pathname] ||
    Object.entries(routeTitles).find(([path]) =>
      location.pathname.startsWith(path)
    )?.[1] ||
    "CRM Control Panel";

  const isClassDetail = location.pathname.startsWith("/classes/") && location.pathname !== "/classes/new";
  const isSalesmanDetail = location.pathname.startsWith("/salesman/") && !location.pathname.endsWith("/classes");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/classes?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className={styles.header}>
      {/* Left: Mobile Menu + Breadcrumbs & Title */}
      <div className={styles.leftSection}>
        <button
          onClick={onMenuToggle}
          className={styles.menuButton}
          aria-label="Toggle Navigation"
        >
          <Menu size={20} />
        </button>

        <div className={styles.titleWrapper}>
          <div className={styles.breadcrumbBar}>
            <span className={styles.rootCrumb}>CRM</span>
            <ChevronRight size={12} className={styles.crumbDivider} />
            {isClassDetail ? (
              <>
                <Link to="/classes" className={styles.crumbLink}>Classes</Link>
                <ChevronRight size={12} className={styles.crumbDivider} />
                <span className={styles.activeCrumb}>Detail</span>
              </>
            ) : isSalesmanDetail ? (
              <>
                <Link to="/salesman" className={styles.crumbLink}>Sales</Link>
                <ChevronRight size={12} className={styles.crumbDivider} />
                <span className={styles.activeCrumb}>Profile</span>
              </>
            ) : (
              <span className={styles.activeCrumb}>{currentTitle}</span>
            )}
          </div>
          <h1 className={styles.title}>
            {currentTitle}
          </h1>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className={styles.centerSection}>
        <form onSubmit={handleSearchSubmit} className={styles.globalSearchForm}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search institutes, owners, staff... (Enter)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.globalSearchInput}
          />
          <kbd className={styles.searchKbd}>Ctrl+K</kbd>
        </form>
      </div>

      {/* Right: Status + Actions + User Pill */}
      <div className={styles.rightSection}>
        <div className={styles.systemStatusPill} title="Supabase Database Online">
          <span className={styles.pulseDot} />
          <span className={styles.statusText}>System Live</span>
        </div>

        {isSuperAdmin() && (
          <Link to="/classes/new" className={styles.quickAddBtn}>
            <Plus size={14} />
            <span className="hidden md:inline">Onboard Class</span>
          </Link>
        )}

        <button className={styles.iconButton} aria-label="Notifications" title="System Notifications">
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
