import { useState, useEffect } from "react";
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
import {
  Users,
  School,
  Wallet,
  TrendingUp,
  Award,
  ShieldCheck,
  Percent,
  Calendar
} from "lucide-react";
import {
  getPlatformStats,
  getMonthlyRevenue,
  getStudentGrowth
} from "@/services/db";
import { toast } from "sonner";
import clsx from "clsx";
import styles from "./AnalyticsPage.module.css";

export default function AnalyticsPage() {
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [studentGrowth, setStudentGrowth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [stats, rev, growth] = await Promise.all([
        getPlatformStats(),
        getMonthlyRevenue(),
        getStudentGrowth()
      ]);
      setPlatformStats(stats);
      setMonthlyRevenue(rev);
      setStudentGrowth(growth);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      toast.error("Failed to load analytics dashboard");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={clsx("page-enter", styles.container)}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "between" }}>
          <div>
            <div className="h-6 w-32 skeleton" />
            <div className="h-4 w-64 skeleton" style={{ marginTop: "0.5rem" }} />
          </div>
        </div>
        <div className={styles.statsGrid}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: "6rem", borderRadius: "1rem" }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: "25rem", borderRadius: "1rem" }} />
      </div>
    );
  }

  return (
    <div className={clsx("page-enter", styles.container)}>
      {/* Header */}
      <div style={{ textAlign: "left" }}>
        <h1 className={styles.headerTitle}>Analytics</h1>
        <p className={styles.headerSubtitle}>Comprehensive analytics and insights for the platform.</p>
      </div>

      {/* Stats Row */}
      <div className={clsx(styles.statsGrid, "stagger-children")}>
        <div className={clsx("stat-card", styles.statCard)}>
          <div className="icon-badge icon-badge-brand">
            <Users size={20} />
          </div>
          <div>
            <div className={styles.statValue}>
              {platformStats?.totalStudents.toLocaleString() || 0}
            </div>
            <div className={styles.statTitle}>Total Students</div>
          </div>
        </div>

        <div className={clsx("stat-card", styles.statCard)}>
          <div className="icon-badge icon-badge-success">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className={styles.statValue}>
              ₹{platformStats?.totalRevenue.toLocaleString() || 0}
            </div>
            <div className={styles.statTitle}>Total Revenue</div>
          </div>
        </div>

        <div className={clsx("stat-card", styles.statCard)}>
          <div className="icon-badge icon-badge-warning">
            <Wallet size={20} />
          </div>
          <div>
            <div className={styles.statValue}>
              ₹{platformStats?.walletBalance.toLocaleString() || 0}
            </div>
            <div className={styles.statTitle}>Wallet Balance</div>
          </div>
        </div>

        <div className={clsx("stat-card", styles.statCard)}>
          <div className="icon-badge icon-badge-brand">
            <School size={20} />
          </div>
          <div>
            <div className={styles.statValue}>
              {platformStats?.activeSubscriptions || 0}
            </div>
            <div className={styles.statTitle}>Active Subscriptions</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className={styles.chartsGrid}>
        {/* Monthly Revenue Chart */}
        <div className={clsx("glass-card-elevated", styles.chartCard)}>
          <h2 className={styles.chartTitle}>
            Monthly Revenue Log (₹)
          </h2>
          {monthlyRevenue.length > 0 ? (
            <div className={styles.chartContent}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
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
                    cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                  />
                  <Bar dataKey="total" fill="url(#colorTotal)" radius={[6, 6, 0, 0]} barSize={40}>
                  </Bar>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.9}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Calendar size={48} style={{ marginBottom: "1rem", opacity: 0.2 }} />
              <span className={styles.emptyText}>No monthly revenue history logged</span>
            </div>
          )}
        </div>

        {/* Student Growth Trend Chart */}
        <div className={clsx("glass-card-elevated", styles.chartCard)}>
          <h2 className={styles.chartTitle}>
            Student Growth Trend (Cumulative)
          </h2>
          {studentGrowth.length > 0 ? (
            <div className={styles.chartContent}>
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
                  <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, fill: "#1e1e2a", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#22c55e", strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Users size={48} style={{ marginBottom: "1rem", opacity: 0.2 }} />
              <span className={styles.emptyText}>No student statistics logged</span>
            </div>
          )}
        </div>
      </div>

      {/* Platform Metrics Section */}
      <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "1.25rem", paddingTop: "1rem" }}>
        <h2 className={styles.metricsHeader}>Platform Performance Metrics</h2>
        <div className={styles.metricsGrid}>
          <div className={clsx("stat-card", styles.statCard)}>
            <div className="icon-badge icon-badge-brand">
              <Award size={20} />
            </div>
            <div>
              <div className={styles.statValue}>
                {Math.round(platformStats?.avgStudents || 0)}
              </div>
              <div className={styles.statTitle}>Average Students Per Institute</div>
            </div>
          </div>

          <div className={clsx("stat-card", styles.statCard)}>
            <div className="icon-badge icon-badge-success">
              <Percent size={20} />
            </div>
            <div>
              <div className={styles.statValue}>
                {Math.round(platformStats?.retentionRate || 0)}%
              </div>
              <div className={styles.statTitle}>Customer Retention Rate</div>
            </div>
          </div>

          <div className={clsx("stat-card", styles.statCard)}>
            <div className="icon-badge icon-badge-success">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className={styles.statValue}>
                {platformStats?.systemUptime}
              </div>
              <div className={styles.statTitle}>System Uptime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
