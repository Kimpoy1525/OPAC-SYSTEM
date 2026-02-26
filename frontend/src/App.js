import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Upload from './components/Upload/upload'
import HomeF from './components/HomeF/home';
import Homepage from './components/HomepageF/homepage';
import Repository from './components/Repository/repository';
import ResearchDetails from './components/ResearchDetails/researchdetails';
import Admin from './components/AdminF/Admin';
import './App.css';

// The Gatekeeper Component
const ProtectedRoute = ({ isAllowed, children }) => {
  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  // Initializing state from localStorage safely
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });

  return (
    <Routes>
      {/* Public Route - Student Google Login */}
      <Route path='/' element={<HomeF setUser={setUser} />} />

      {/* Admin Login Portal - Keep this separate */}
      <Route path='/adminsecretportal2026' element={
          <Admin setUser={setUser} user={user} />
      } />

      {/* General Protected Routes (Any logged in user) */}
      <Route path='/homepage' element={
        <ProtectedRoute isAllowed={!!user}>
          <Homepage setUser={setUser} user={user} />
        </ProtectedRoute>
      } />
      
      <Route path='/repository' element={
        <ProtectedRoute isAllowed={!!user}>
          <Repository setUser={setUser} user={user} />
        </ProtectedRoute>
      } />

      <Route path='/details/:id' element={
        <ProtectedRoute isAllowed={!!user}>
          <ResearchDetails setUser={setUser} user={user} />
        </ProtectedRoute>
      } />

      {/* Librarian/Admin Only Route - Updated Role Check */}
      <Route path='/upload' element={
        <ProtectedRoute isAllowed={!!user && (user.role === "ADMIN" || user.role === "SUPERADMIN")}>
          <Upload setUser={setUser} user={user} />
        </ProtectedRoute>
      } />

      {/* Fallback: Redirect any unknown routes */}
      <Route path="*" element={<Navigate to={user ? "/homepage" : "/"} replace />} />
    </Routes>
  );
}

export default App;