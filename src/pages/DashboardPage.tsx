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
  trend: "up" | "down" | "neutral";
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
          <div className={styles.trendIndicator}>
            {trend === "up" && <ArrowUpRight className="text-[var(--color-success)]" size={14} />}
            {trend === "down" && <ArrowDownRight className="text-[var(--color-danger)]" size={14} />}
            <span className={trend === "up" ? "text-[var(--color-success)]" : trend === "down" ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"}>
              {sub}
            </span>
          </div>
        </div>
        <div>
          <div className={styles.statValue}>{value}</div>
          <span className={styles.statLabel}>{title}</span>
        </div>
      </div>
    </div>
  );
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
            <div className="h-8 w-64 skeleton" />
            <div className="h-4 w-48 skeleton" />
          </div>
          <div className="h-10 w-40 skeleton" />
        </div>
        <div className={styles.statsGrid}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-36 rounded-2xl" />
          ))}
        </div>
        <div className={styles.chartsGrid}>
          <div className="skeleton h-[340px] rounded-2xl" />
          <div className="skeleton h-[340px] rounded-2xl" />
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
        <Link to="/classes/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Register New Class
        </Link>
      </div>

      {/* Stats Cards Row */}
      <div className={clsx("stagger-children", styles.statsGrid)}>
        <StatCard
          title="Total Registered"
          value={stats?.totalRegistered || 0}
          sub="+12%"
          icon={<School size={22} />}
          trend="up"
          colorClass="icon-badge-brand"
        />
        <StatCard
          title="Active Classes"
          value={stats?.activeClasses || 0}
          sub="+8%"
          icon={<School size={22} />}
          trend="up"
          colorClass="icon-badge-success"
        />
        <StatCard
          title="Gross Revenue"
          value={stats?.grossRevenue ? `₹${(stats.grossRevenue).toLocaleString()}` : "₹0"}
          sub="+24%"
          icon={<TrendingUp size={22} />}
          trend="up"
          colorClass="icon-badge-info"
        />
        <StatCard
          title="Net Revenue"
          value={stats?.netRevenue ? `₹${(stats.netRevenue).toLocaleString()}` : "₹0"}
          sub={(stats?.netRevenue || 0) >= 0 ? "Profit" : "Loss"}
          icon={(stats?.netRevenue || 0) >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          trend={(stats?.netRevenue || 0) >= 0 ? "up" : "down"}
          colorClass={(stats?.netRevenue || 0) >= 0 ? "icon-badge-success" : "icon-badge-danger"}
        />
      </div>

      {/* Charts Section */}
      <div className={clsx("stagger-children", styles.chartsGrid)}>
        {/* Monthly Revenue Analytics */}
        <div className="glass-card-elevated p-6 flex flex-col">
          <h2 className={styles.cardTitle}>
            Monthly Revenue
          </h2>
          {monthlyRevenue.length > 0 ? (
            <div className="flex-1 min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#55556a", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: "#55556a", fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.02)" }}
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
             <div className="flex flex-col items-center justify-center flex-1 min-h-[260px] text-[var(--color-text-muted)]">
              <Calendar size={36} className="mb-3 opacity-20" />
              <span className="text-sm">No revenue data available</span>
            </div>
          )}
        </div>

        {/* Student Growth Chart */}
        <div className="glass-card-elevated p-6 flex flex-col">
          <h2 className={styles.cardTitle}>
            Student Growth
          </h2>
          {studentGrowth.length > 0 ? (
            <div className="flex-1 min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={studentGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#55556a", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fill: "#55556a", fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip
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
            <div className="flex flex-col items-center justify-center flex-1 min-h-[260px] text-[var(--color-text-muted)]">
              <Users size={36} className="mb-3 opacity-20" />
              <span className="text-sm">No student growth data available</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Layout: Top Classes & Recent Activity */}
      <div className={clsx("stagger-children", styles.bottomGrid)}>
        {/* Top Performing Classes Table */}
        <div className={clsx("glass-card-elevated", styles.largeCard)}>
          <h2 className={styles.cardTitle}>
            Top Performing Classes
          </h2>
          <div className="overflow-x-auto flex-1">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Institute Name</th>
                  <th>Owner</th>
                  <th>Students</th>
                  <th>Revenue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topClasses.length > 0 ? (
                  topClasses.map((item, idx) => (
                    <tr key={idx}>
                      <td className="font-semibold text-[var(--color-text-primary)]">
                        <Link to={`/classes/${item.owner_id}`} className="hover:text-[var(--color-brand-400)] transition-colors">
                          {item.institute_name}
                        </Link>
                      </td>
                      <td>{item.owner_name}</td>
                      <td>{item.student_count}</td>
                      <td className="font-mono text-xs">₹{item.revenue.toLocaleString()}</td>
                      <td>
                        <span className={`badge badge-${(item.status || "active").toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[var(--color-text-muted)]">
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
                    tx.transaction_type === "DEPOSIT" ? "bg-[var(--color-success)] text-[var(--color-success)]" : "bg-[var(--color-danger)] text-[var(--color-danger)]"
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
                    <span className={tx.transaction_type === "DEPOSIT" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}>
                      {tx.transaction_type === "DEPOSIT" ? "+" : "-"}₹{Number(tx.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)]">
                <Wallet size={32} className="mb-3 opacity-20" />
                <span className="text-xs">No recent activity</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
