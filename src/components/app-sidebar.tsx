import { NavLink, useLocation } from "react-router-dom";
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
  LogOut
} from "lucide-react";
import { getUser, logout } from "@/services/auth";
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
      title: "PLATFORM",
      items: [
        { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
        { path: "/classes", label: "Classes", icon: School, show: true },
        { path: "/employees", label: "Employees", icon: Briefcase, show: user?.role === "SUPER_ADMIN" },
      ]
    },
    {
      title: "SALES",
      items: [
        { path: user?.role === "SUPER_ADMIN" ? "/salesman" : `/salesman/${user?.salespersonId || ""}`, label: "Salesman", icon: Users, show: user?.role === "SUPER_ADMIN" || !!user?.salespersonId },
      ]
    },
    {
      title: "FINANCE",
      items: [
        { path: "/expenses", label: "Expenses", icon: Receipt, show: user?.role === "SUPER_ADMIN" },
        { path: "/wallet", label: "Wallet", icon: Wallet, show: user?.role === "SUPER_ADMIN" },
      ]
    },
    {
      title: "SYSTEM",
      items: [
        { path: "/analytics", label: "Analytics", icon: BarChart, show: user?.role === "SUPER_ADMIN" },
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
            <span className={styles.logoTextMain}>
              ACADEX CRM
            </span>
            <span className={styles.logoTextSub}>
              Control Panel
            </span>
          </div>
        )}
      </div>

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
                  <span className={clsx("badge badge-info", styles.roleBadge)}>{user.role === 'SUPER_ADMIN' ? 'Admin' : 'Sales'}</span>
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
