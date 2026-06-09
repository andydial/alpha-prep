import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Study } from './pages/Study'
import { Results } from './pages/Results'
import { Dashboard } from './pages/Dashboard'
import { Progress } from './pages/Progress'
import { ParentReport } from './pages/ParentReport'
import { Settings } from './pages/Settings'
import { Store } from './pages/Store'
import { Squad } from './pages/Squad'
import { AuthGuard } from './components/AuthGuard'
import { NavBar } from './components/NavBar'

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar />
      {children}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <AuthLayout><Dashboard /></AuthLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/study"
          element={
            <AuthGuard requireRole="student">
              <AuthLayout><Study /></AuthLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/study/results"
          element={
            <AuthGuard requireRole="student">
              <AuthLayout><Results /></AuthLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/progress"
          element={
            <AuthGuard>
              <AuthLayout><Progress /></AuthLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/progress/:topicId"
          element={
            <AuthGuard>
              <AuthLayout><Progress /></AuthLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/report"
          element={
            <AuthGuard requireRole="parent">
              <AuthLayout><ParentReport /></AuthLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <AuthGuard requireRole="parent">
              <AuthLayout><Settings /></AuthLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/store"
          element={
            <AuthGuard requireRole="student">
              <AuthLayout><Store /></AuthLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/squad"
          element={
            <AuthGuard requireRole="student">
              <AuthLayout><Squad /></AuthLayout>
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
