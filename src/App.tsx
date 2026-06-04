import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ClassesPage from "@/pages/ClassesPage";
import ClassOnboardingPage from "@/pages/ClassOnboardingPage";
import ClassDetailPage from "@/pages/ClassDetailPage";
import SalesmanPage from "@/pages/SalesmanPage";
import SalesmanDetailPage from "@/pages/SalesmanDetailPage";
import SalesmanClassDetailPage from "@/pages/SalesmanClassDetailPage";
import WalletPage from "@/pages/WalletPage";
import PaymentsPage from "@/pages/PaymentsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import NotFoundPage from "@/pages/NotFoundPage";
import EmployeePage from "@/pages/EmployeePage";
import ExpensePage from "@/pages/ExpensePage";
import { getUser } from "@/services/auth";

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--color-surface-2)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border-subtle)",
            fontSize: "0.875rem",
          },
        }}
        richColors
      />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes with AppLayout */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/classes/new" element={<ClassOnboardingPage />} />
          <Route path="/classes/:id" element={<ClassDetailPage />} />

          {/* Salesman routes */}
          <Route
            path="/salesman"
            element={
              <ProtectedRoute requiredRole="SUPER_ADMIN">
                <SalesmanPage />
              </ProtectedRoute>
            }
          />
          <Route path="/salesman/:id" element={<SalesmanDetailPage />} />
          <Route path="/salesman/:salesmanId/classes/:classId" element={<SalesmanClassDetailPage />} />

          {/* Employee & Expense routes */}
          <Route
            path="/employees"
            element={
              <ProtectedRoute requiredRole="SUPER_ADMIN">
                <EmployeePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute requiredRole="SUPER_ADMIN">
                <ExpensePage />
              </ProtectedRoute>
            }
          />

          {/* Wallet and Transactions */}
          <Route
            path="/wallet"
            element={
              <ProtectedRoute requiredRole="SUPER_ADMIN">
                <WalletPage />
              </ProtectedRoute>
            }
          />
          <Route path="/payments" element={<PaymentsPage />} />

          {/* Platform Analytics */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute requiredRole="SUPER_ADMIN">
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
