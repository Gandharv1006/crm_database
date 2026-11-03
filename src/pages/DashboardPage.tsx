import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  School,
  Users,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  TrendingDown,
  Calendar
} from "lucide-react";
import {
  getDashboardStats,
  getMonthlyRevenue,
  getStudentGrowth,
  getTopClasses,
  getRecentWalletTransactions,
} from "@/services/db";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { getUser } from "@/services/auth";
import styles from "./DashboardPage.module.css";
import clsx from "clsx";

interface StatCardProps {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  colorClass: string;
}

function StatCard({ title, value, sub, icon, trend, colorClass }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={styles.statCardContent}>
        <div className={styles.statCardHeader}>
          <div className={clsx("icon-badge", colorClass)}>
            {icon}
          </div>
          {trend && (
            <div className={styles.trendIndicator}>
              {trend === "up" && <ArrowUpRight className="text-[var(--color-success)]" size={14} />}
              {trend === "down" && <ArrowDownRight className="text-[var(--color-danger)]" size={14} />}
              <span className={trend === "up" ? "text-[var(--color-success)]" : trend === "down" ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"}>
                {sub}
              </span>
            </div>
          )}
          {!trend && (
            <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
              {sub}
            </span>
          )}
        </div>
        <div>
          <div className={styles.statValue}>{value}</div>
          <span className={styles.statLabel}>{title}</span>
        </div>
      </div>
    </div>
  );
}

function formatMonthLabel(m: any): string {
  if (!m || typeof m !== "string") return String(m ?? "");
  const parts = m.split("-");
  if (parts.length === 2) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = parseInt(parts[1], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${months[monthIdx]} '${parts[0].slice(2)}`;
    }
  }
  return m;
}

function getRelativeTime(dateStr: string) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function getGreeting() {
  const hr = new Date().getHours();
  if (hr < 12) return "Good morning";
  if (hr < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const user = getUser();
  const [stats, setStats] = useState<any>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [studentGrowth, setStudentGrowth] = useState<any[]>([]);
  const [topClasses, setTopClasses] = useState<any[]>([]);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [s, rev, growth, top, tx] = await Promise.all([
        getDashboardStats(),
        getMonthlyRevenue(),
        getStudentGrowth(),
        getTopClasses(5),
        getRecentWalletTransactions(5),
      ]);
      setStats(s);
      setMonthlyRevenue(rev);
      setStudentGrowth(growth);
      setTopClasses(top);
      setRecentTx(tx);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={clsx("page-enter", styles.container)}>
        <div className={styles.headerRow}>
          <div className={styles.loadingHeader}>
            <div className={clsx("skeleton", styles.skeletonTitle)} />
            <div className={clsx("skeleton", styles.skeletonSubtitle)} />
          </div>
          <div className={clsx("skeleton", styles.skeletonSubtitle)} style={{ height: "2.5rem", width: "10rem" }} />
        </div>
        <div className={styles.statsGrid}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={clsx("skeleton", styles.skeletonStatCard)} />
          ))}
        </div>
        <div className={styles.chartsGrid}>
          <div className={clsx("skeleton", styles.skeletonStatCard)} style={{ height: "340px" }} />
          <div className={clsx("skeleton", styles.skeletonStatCard)} style={{ height: "340px" }} />
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("page-enter", styles.container)}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.mainTitle}>
            {getGreeting()}, {user?.fullName.split(' ')[0]} 👋
          </h1>
          <p className={styles.mainSubtitle}>Here's what's happening today.</p>
        </div>
        <Link to="/classes/new" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <Plus size={16} />
          Register New Class
        </Link>
      </div>

      {/* Stats Cards Row */}
      <div className={clsx("stagger-children", styles.statsGrid)}>
        <StatCard
          title="Total Registered"
          value={stats?.totalRegistered || 0}
          sub="Institutes on platform"
          icon={<School size={20} />}
          colorClass="icon-badge-brand"
        />
        <StatCard
          title="Active Classes"
          value={stats?.activeClasses || 0}
          sub={`${stats?.totalRegistered ? Math.round(((stats.activeClasses || 0) / stats.totalRegistered) * 100) : 100}% Active rate`}
          icon={<School size={20} />}
          trend="up"
          colorClass="icon-badge-success"
        />
        <StatCard
          title="Total Students"
          value={stats?.totalStudents || 0}
          sub="Enrolled in batches"
          icon={<Users size={20} />}
          trend="up"
          colorClass="icon-badge-info"
        />
        <StatCard
          title="Escrow Balance"
          value={stats?.totalWalletBalance ? `₹${Number(stats.totalWalletBalance).toLocaleString()}` : "₹0"}
          sub="Total wallet funds"
          icon={<Wallet size={20} />}
          colorClass="icon-badge-warning"
        />
        <StatCard
          title="Gross Revenue"
          value={stats?.grossRevenue ? `₹${Number(stats.grossRevenue).toLocaleString()}` : "₹0"}
          sub="Projected revenue"
          icon={<TrendingUp size={20} />}
          trend="up"
          colorClass="icon-badge-brand"
        />
        <StatCard
          title="Net Revenue"
          value={stats?.netRevenue ? `₹${Number(stats.netRevenue).toLocaleString()}` : "₹0"}
          sub={(stats?.netRevenue || 0) >= 0 ? "Profit" : "Loss"}
          icon={(stats?.netRevenue || 0) >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          trend={(stats?.netRevenue || 0) >= 0 ? "up" : "down"}
          colorClass={(stats?.netRevenue || 0) >= 0 ? "icon-badge-success" : "icon-badge-danger"}
        />
      </div>

      {/* Charts Section */}
      <div className={clsx("stagger-children", styles.chartsGrid)}>
        {/* Monthly Revenue Analytics */}
        <div className={clsx("glass-card-elevated", styles.chartCard)}>
          <h2 className={styles.cardTitle}>
            Monthly Revenue
          </h2>
          {monthlyRevenue.length > 0 ? (
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={formatMonthLabel} tick={{ fill: "#55556a", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: "#55556a", fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(value) => `₹${Number(value).toLocaleString()}`} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.02)" }}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, "Revenue"]}
                    labelFormatter={formatMonthLabel}
                    contentStyle={{
                      background: "#1e1e2a",
                      border: "1px solid #ffffff18",
                      borderRadius: "10px",
                      color: "#f0f0f8",
                      fontSize: "0.8125rem",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
                    }}
                    itemStyle={{ color: "#818cf8" }}
                  />
                  <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className={styles.chartEmptyState}>
              <Calendar size={36} className={styles.emptyIcon} />
              <span className="text-sm">No revenue data available</span>
            </div>
          )}
        </div>

        {/* Student Growth Chart */}
        <div className={clsx("glass-card-elevated", styles.chartCard)}>
          <h2 className={styles.cardTitle}>
            Student Growth
          </h2>
          {studentGrowth.length > 0 ? (
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={studentGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={formatMonthLabel} tick={{ fill: "#55556a", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: "#55556a", fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip
                    formatter={(value: any) => [`${Number(value).toLocaleString()} students`, "Total Students"]}
                    labelFormatter={formatMonthLabel}
                    contentStyle={{
                      background: "#1e1e2a",
                      border: "1px solid #ffffff18",
                      borderRadius: "10px",
                      color: "#f0f0f8",
                      fontSize: "0.8125rem",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
                    }}
                    itemStyle={{ color: "#22c55e" }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: "#1e1e2a", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#6366f1", strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.chartEmptyState}>
              <Users size={36} className={styles.emptyIcon} />
              <span className="text-sm">No student growth data available</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Layout: Top Classes & Recent Activity */}
      <div className={clsx("stagger-children", styles.bottomGrid)}>
        {/* Top Performing Classes Table */}
        <div className={clsx("glass-card-elevated", styles.largeCard)}>
          <div className={styles.tableHeaderRow}>
            <h2 className={styles.cardTitle} style={{ margin: 0, padding: 0, border: "none" }}>
              Top Performing Classes
            </h2>
            <Link to="/classes" className={styles.viewAllLink}>
              View All Classes
            </Link>
          </div>
          <div className={styles.tableContainer}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Institute</th>
                  <th>Enrolled</th>
                  <th>Revenue</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {topClasses.length > 0 ? (
                  topClasses.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className={styles.tableInstituteCell}>
                          {item.class_logo_url ? (
                            <img
                              src={item.class_logo_url}
                              alt={item.institute_name}
                              className={styles.tableClassLogo}
                            />
                          ) : (
                            <div className={styles.tableClassLogoFallback}>
                              <School size={15} />
                            </div>
                          )}
                          <div className={styles.tableInstituteDetails}>
                            <Link to={`/classes/${item.owner_id}`} className={styles.tableInstituteName} title={item.institute_name}>
                              {item.institute_name}
                            </Link>
                            <span className={styles.tableInstituteOwner}>{item.owner_name}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.studentCountValue}>{item.student_count}</span>
                        <span className={styles.studentCountLabel}>students</span>
                      </td>
                      <td>
                        <span className={styles.revenueValue}>
                          ₹{Number(item.revenue || 0).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${(item.status || "active").toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          to={`/classes/${item.owner_id}`}
                          className={clsx("btn-ghost", styles.viewButton)}
                        >
                          <span>View</span>
                          <ArrowUpRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className={styles.tableEmptyRow}>
                      No classes registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activities Feed */}
        <div className={clsx("glass-card-elevated", styles.smallCard)}>
          <div className={styles.activityHeader}>
            <h2 className={styles.activityTitle}>
              Recent Activity
            </h2>
            <Link to="/payments" className={styles.viewAllLink}>
              View All
            </Link>
          </div>
          <div className={styles.activityFeed}>
            {recentTx.length > 0 ? (
              recentTx.map((tx, idx) => (
                <div key={idx} className={styles.activityItem}>
                  <div className={clsx(
                    styles.activityDot,
                    tx.transaction_type === "DEPOSIT" ? styles.depositDot : styles.deductionDot
                  )} />
                  <div className={styles.activityInfo}>
                    <p className={styles.activityInstituteName}>
                      {tx.class_owners?.institute_name || "Academy"}
                    </p>
                    <p className={styles.activityDesc}>
                      {tx.description}
                    </p>
                    <p className={styles.activityTime}>
                      {getRelativeTime(tx.created_at)}
                    </p>
                  </div>
                  <div className={styles.activityAmount}>
                    <span className={tx.transaction_type === "DEPOSIT" ? styles.depositAmount : styles.deductionAmount}>
                      {tx.transaction_type === "DEPOSIT" ? "+" : "-"}₹{Math.abs(Number(tx.amount)).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.activityEmptyState}>
                <Wallet size={32} className={styles.emptyIcon} />
                <span className="text-xs">No recent activity</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
