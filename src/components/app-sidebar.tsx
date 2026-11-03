import { NavLink, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  School,
  Wallet,
  Users,
  CreditCard,
  BarChart,
  ChevronLeft,
  Briefcase,
  Receipt,
  LogOut,
  Plus,
  Sparkles
} from "lucide-react";
import { getUser, logout, isSuperAdmin } from "@/services/auth";
import { useMobile } from "@/hooks/use-mobile";
import styles from "./app-sidebar.module.css";
import clsx from "clsx";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onMobileClose?: () => void;
}

export default function AppSidebar({ collapsed, onToggle, onMobileClose }: SidebarProps) {
  const user = getUser();
  const location = useLocation();
  const isMobile = useMobile();

  const navGroups = [
    {
      title: "WORKSPACE",
      items: [
        { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
        { path: "/classes", label: "Classes & Institutes", icon: School, show: true },
      ]
    },
    {
      title: "CRM & TEAM",
      items: [
        { path: user?.role === "SUPER_ADMIN" ? "/salesman" : `/salesman/${user?.salespersonId || ""}`, label: "Sales Team", icon: Users, show: user?.role === "SUPER_ADMIN" || !!user?.salespersonId },
        { path: "/employees", label: "Employees", icon: Briefcase, show: user?.role === "SUPER_ADMIN" },
      ]
    },
    {
      title: "FINANCIALS",
      items: [
        { path: "/payments", label: "Payments & Ledger", icon: CreditCard, show: true },
        { path: "/expenses", label: "Expenses Ledger", icon: Receipt, show: user?.role === "SUPER_ADMIN" },
        { path: "/wallet", label: "Wallets & Escrow", icon: Wallet, show: user?.role === "SUPER_ADMIN" },
      ]
    },
    {
      title: "INTELLIGENCE",
      items: [
        { path: "/analytics", label: "Platform Analytics", icon: BarChart, show: user?.role === "SUPER_ADMIN" },
      ]
    }
  ];

  return (
    <aside
      className={clsx(
        styles.sidebar,
        collapsed && styles.collapsed,
        isMobile && styles.mobile
      )}
    >
      {/* Logo Area */}
      <div className={styles.logoArea}>
        <div className={styles.logoIcon}>
          A
        </div>
        {!collapsed && (
          <div className={styles.logoTextWrapper}>
            <div className="flex items-center gap-1.5">
              <span className={styles.logoTextMain}>
                ACADEX CRM
              </span>
              <span className={styles.hubBadge}>PRO</span>
            </div>
            <span className={styles.logoTextSub}>
              Enterprise Control Hub
            </span>
          </div>
        )}
      </div>

      {/* Quick Action Button for CRM Users */}
      {!collapsed && isSuperAdmin() && (
        <div className={styles.quickActionBox}>
          <Link
            to="/classes/new"
            onClick={() => isMobile && onMobileClose?.()}
            className={styles.quickActionBtn}
          >
            <Plus size={15} />
            <span>Onboard New Class</span>
          </Link>
        </div>
      )}

      {/* Nav Links */}
      <nav className={styles.navContainer}>
        <ul className={styles.navList}>
          {navGroups.map((group, idx) => {
            const visibleItems = group.items.filter(item => item.show);
            if (visibleItems.length === 0) return null;
            return (
              <li key={idx} className={styles.navGroup}>
                {!collapsed && (
                  <div className={styles.groupTitle}>
                    {group.title}
                  </div>
                )}
                {visibleItems.map(item => {
                  const isActive = location.pathname === item.path || (item.path !== "/dashboard" && location.pathname.startsWith(item.path + "/"));
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => isMobile && onMobileClose?.()}
                      className={clsx(
                        styles.navLink,
                        isActive && styles.navLinkActive
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon size={18} className={styles.navIcon} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  );
                })}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / User Profile */}
      <div className={styles.footer}>
        {user && (
          <div className={styles.profileContainer}>
            <div className={styles.userInfo}>
              <div className={styles.avatar}>
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className={styles.nameRoleWrapper}>
                  <span className={styles.fullName}>{user.fullName}</span>
                  <span className={clsx("badge", user.role === 'SUPER_ADMIN' ? 'badge-primary' : 'badge-info', styles.roleBadge)}>
                    {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Sales Manager'}
                  </span>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={() => logout()}
                className={styles.logoutButton}
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        )}

        {/* Collapse Toggle */}
        {!isMobile && (
          <button
            onClick={onToggle}
            className={styles.collapseButton}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft size={16} className={clsx(
              styles.chevronIcon,
              collapsed && styles.rotate180
            )} />
          </button>
        )}
      </div>
    </aside>
  );
}
