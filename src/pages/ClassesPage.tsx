import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Search,
  Plus,
  School,
  Users,
  Wallet,
  TrendingUp,
  MapPin,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { getAllClasses, getDashboardStats } from "@/services/db";
import { getUser, isSuperAdmin } from "@/services/auth";
import styles from "./ClassesPage.module.css";
import clsx from "clsx";

export default function ClassesPage() {
  const navigate = useNavigate();
  const user = getUser();
  const [classes, setClasses] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [cls, stats] = await Promise.all([
        getAllClasses(),
        getDashboardStats()
      ]);
      setClasses(cls);
      setDashboardStats(stats);
    } catch (err) {
      console.error("Failed to load classes:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter classes
  const filteredClasses = classes.filter((c) => {
    const matchesSearch =
      !search ||
      c.institute_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase()) ||
      c.owner_mobile?.includes(search);

    const matchesStatus = statusFilter === "All" || c.status === statusFilter;

    // SALES_MANAGER role restricts classes to their assignments
    const matchesRole =
      user?.role === "SUPER_ADMIN" ||
      (c.salesperson_ids && c.salesperson_ids.includes(user?.salespersonId));

    return matchesSearch && matchesStatus && matchesRole;
  });

  // Calculate stats from class data & dashboard stats
  const totalStudents = filteredClasses.reduce((s, c) => s + (c.student_count || 0), 0);
  const totalRevenue = dashboardStats?.totalRevenue || 0;
  const totalWalletBalance = filteredClasses.reduce((s, c) => s + (c.wallet_balance || 0), 0);
  const activePremiumCount = filteredClasses.filter((c) => c.plan_type === "Premium").length;

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClasses = filteredClasses.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Reset page to 1 when search/filter changes
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const formatClassId = (regId: number | null) => {
    if (!regId) return "#CLS-0000";
    return `#CLS-${String(regId).padStart(4, "0")}`;
  };

  if (loading) {
    return (
      <div className={clsx("page-enter", styles.container)}>
        <div className={styles.headerRow}>
          <div className={styles.loadingHeader}>
            <div className="h-6 w-32 skeleton" />
            <div className="h-4 w-64 skeleton" />
          </div>
          <div className="h-10 w-32 skeleton" />
        </div>
        <div className={styles.statsGrid}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className={clsx("page-enter", styles.container)}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.mainTitle}>All Classes</h1>
          <p className={styles.mainSubtitle}>Manage and monitor all registered coaching institutes.</p>
        </div>
        
        <div className={styles.headerControls}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              className="input-field pl-9"
              placeholder="Search classes..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          {isSuperAdmin() && (
            <Link to="/classes/new" className="btn-primary shrink-0 flex items-center gap-2">
              <Plus size={16} />
              New Class
            </Link>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className={clsx("stagger-children", styles.statsGrid)}>
        <div className="stat-card flex items-center gap-4 !py-4 !px-5">
          <div className="icon-badge icon-badge-brand shrink-0">
            <Users size={20} />
          </div>
          <div className={styles.statCardDetails}>
            <div className={styles.statCardValue}>{totalStudents.toLocaleString()}</div>
            <div className={styles.statCardLabel}>Total Students</div>
          </div>
        </div>

        <div className="stat-card flex items-center gap-4 !py-4 !px-5">
          <div className="icon-badge icon-badge-success shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className={styles.statCardDetails}>
            <div className={styles.statCardValue}>₹{totalRevenue.toLocaleString()}</div>
            <div className={styles.statCardLabel}>Total Revenue</div>
          </div>
        </div>

        <div className="stat-card flex items-center gap-4 !py-4 !px-5">
          <div className="icon-badge icon-badge-warning shrink-0">
            <Wallet size={20} />
          </div>
          <div className={styles.statCardDetails}>
            <div className={styles.statCardValue}>₹{totalWalletBalance.toLocaleString()}</div>
            <div className={styles.statCardLabel}>Wallet Balance</div>
          </div>
        </div>

        <div className="stat-card flex items-center gap-4 !py-4 !px-5">
          <div className="icon-badge icon-badge-info shrink-0">
            <School size={20} />
          </div>
          <div className={styles.statCardDetails}>
            <div className={styles.statCardValue}>{activePremiumCount}</div>
            <div className={styles.statCardLabel}>Premium Plans</div>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className={clsx("tab-bar", styles.filterBar)}>
        <button 
          className={clsx("tab-item", statusFilter === "All" && "active")}
          onClick={() => handleStatusChange("All")}
        >
          All
        </button>
        <button 
          className={clsx("tab-item", statusFilter === "ACTIVE" && "active")}
          onClick={() => handleStatusChange("ACTIVE")}
        >
          Active
        </button>
        <button 
          className={clsx("tab-item", statusFilter === "INACTIVE" && "active")}
          onClick={() => handleStatusChange("INACTIVE")}
        >
          Inactive
        </button>
        <button 
          className={clsx("tab-item", statusFilter === "SUSPENDED" && "active")}
          onClick={() => handleStatusChange("SUSPENDED")}
        >
          Suspended
        </button>
      </div>

      {/* Classes Table Panel */}
      <div className="glass-card overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="data-table">
            <thead>
              <tr>
                <th>Institute</th>
                <th>Location & Plan</th>
                <th>Students</th>
                <th>Wallet Balance</th>
                <th>Salesperson</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClasses.length > 0 ? (
                paginatedClasses.map((cls, idx) => {
                  const balance = cls.wallet_balance || 0;
                  const balanceColor = balance < 500 ? "text-[var(--color-warning)]" : "text-[var(--color-success)]";
                  
                  return (
                    <tr key={idx} className="group cursor-pointer" onClick={() => navigate(`/classes/${cls.owner_id}`)}>
                      <td>
                        {(() => {
                          let classImg = "";
                          try {
                            if (cls.notes) {
                              const notesObj = JSON.parse(cls.notes);
                              classImg = notesObj.classLogoUrl || notesObj.classPhotoUrl || notesObj.ownerPhotoUrl || "";
                            }
                          } catch (e) {
                            // Ignore json parsing errors
                          }
                          return (
                            <div className="flex items-center gap-3">
                              {classImg ? (
                                <img
                                  src={classImg}
                                  alt={cls.institute_name}
                                  className={styles.classLogo}
                                />
                              ) : (
                                <div className={styles.classLogoPlaceholder}>
                                  <School size={18} />
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className={styles.className}>{cls.institute_name}</span>
                                <span className={styles.classId}>
                                  {formatClassId(cls.registration_id)}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <div className={styles.locationContainer}>
                          <div className={styles.locationWrapper}>
                            <MapPin size={12} className={styles.locationIcon} />
                            <span className={styles.locationText}>{cls.city || "—"}</span>
                          </div>
                          <span className={`badge badge-info`}>
                            {cls.plan_type}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="font-bold text-[var(--color-text-primary)]">{cls.student_count}</span>
                      </td>
                      <td>
                        <span className={clsx("font-semibold font-mono tracking-tight", balanceColor)}>
                          ₹{balance.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                          {cls.salesperson_name || "Unassigned"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${(cls.status || "active").toLowerCase()}`}>
                          {cls.status}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionCell}>
                          <ChevronRight size={18} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-brand-400)] transition-colors" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <School size={48} className="text-[var(--color-text-muted)] opacity-20 mb-4" />
                      <p className="text-sm text-[var(--color-text-secondary)] mb-4">No classes found matching search criteria.</p>
                      {isSuperAdmin() && (
                        <Link to="/classes/new" className="btn-primary flex items-center gap-2">
                          Onboard your first class →
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <span className={styles.paginationText}>
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredClasses.length)} of {filteredClasses.length}
            </span>
            <div className={styles.paginationControls}>
              <button
                className="btn-ghost !p-2 !rounded-md"
                disabled={currentPage === 1}
                onClick={handlePrevPage}
              >
                <ChevronLeft size={16} />
              </button>
              <span className={styles.paginationPage}>
                {currentPage} / {totalPages}
              </span>
              <button
                className="btn-ghost !p-2 !rounded-md"
                disabled={currentPage === totalPages}
                onClick={handleNextPage}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
