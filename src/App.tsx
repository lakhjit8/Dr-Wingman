import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { ProfileBuilder } from './pages/ProfileBuilder'
import { MatchList } from './pages/MatchList'
import { MatchThread } from './pages/MatchThread'
import { Settings } from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/profile" element={<ProfileBuilder />} />
            <Route path="/matches" element={<MatchList />} />
            <Route path="/matches/:matchId" element={<MatchThread />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="/" element={<Navigate to="/matches" replace />} />
          <Route path="*" element={<Navigate to="/matches" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
