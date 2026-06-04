import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { getUser } from "@/services/auth";
import AppSidebar from "./app-sidebar";
import Topbar from "./topbar";
import { useMobile } from "@/hooks/use-mobile";
import styles from "./AppLayout.module.css";
import clsx from "clsx";

export default function AppLayout() {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    const user = getUser();
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const user = getUser();
  if (!user) return null;

  return (
    <div className={styles.layout}>
      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="modal-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          styles.sidebarWrapper,
          isMobile && mobileMenuOpen && styles.sidebarOpen
        )}
        style={isMobile ? { maxHeight: "85vh" } : { width: sidebarCollapsed ? 64 : 240 }}
      >
        <AppSidebar
          collapsed={isMobile ? false : sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content */}
      <main
        className={styles.mainContent}
        style={{
          marginLeft: isMobile ? 0 : sidebarCollapsed ? 64 : 240,
        }}
      >
        <Topbar
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <div className={styles.contentBody}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
