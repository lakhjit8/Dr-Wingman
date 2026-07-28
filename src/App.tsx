import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { TermsGate } from './components/TermsGate'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Terms } from './pages/Terms'
import { Privacy } from './pages/Privacy'
import { ProfileBuilder } from './pages/ProfileBuilder'
import { MatchList } from './pages/MatchList'
import { MatchThread } from './pages/MatchThread'
import { Settings } from './pages/Settings'
import { Admin } from './pages/Admin'
import { AdminUsers } from './pages/AdminUsers'
import { AdminUserDetail } from './pages/AdminUserDetail'
import { AuditLog } from './pages/AuditLog'
import { AdminFeedback } from './pages/AdminFeedback'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route
            element={
              <ProtectedRoute>
                <TermsGate>
                  <Layout />
                </TermsGate>
              </ProtectedRoute>
            }
          >
            <Route path="/profile" element={<ProfileBuilder />} />
            <Route path="/matches" element={<MatchList />} />
            <Route path="/matches/:matchId" element={<MatchThread />} />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users/:id"
              element={
                <AdminRoute>
                  <AdminUserDetail />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/audit-log"
              element={
                <AdminRoute>
                  <AuditLog />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/feedback"
              element={
                <AdminRoute>
                  <AdminFeedback />
                </AdminRoute>
              }
            />
          </Route>
          <Route path="/" element={<Navigate to="/matches" replace />} />
          <Route path="*" element={<Navigate to="/matches" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
