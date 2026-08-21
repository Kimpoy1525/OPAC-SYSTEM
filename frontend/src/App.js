import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Upload from './components/Upload/upload'
import HomeF from './components/HomeF/home';
import Homepage from './components/HomepageF/homepage';
import Repository from './components/Repository/repository';
import ResearchDetails from './components/ResearchDetails/researchdetails';
import Admin from './components/AdminF/Admin';
import Reservation from './components/Reservation/reservation';
import AdminApproval from './components/AdminApproval/adminApproval';
import './App.css';
import Footer from './components/Footer/footer';


// The Gatekeeper Component
const ProtectedRoute = ({ isAllowed, children, redirectTo = "/" }) => {
  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
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
      console.error("Failed to parse user from localStorage", e);
      return null;
    }
  });
  const [sessionChecked, setSessionChecked] = useState(false);

  // Validate the backend session on app load.
  // If the session cookie is missing/expired, clear local state and force re-login.
  useEffect(() => {
    const validateSession = async () => {
      const savedUser = localStorage.getItem("user");
      if (!savedUser) {
        setSessionChecked(true);
        return;
      }
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/accounts/session/`, {
          credentials: "include",
        });
        if (!res.ok) {
          // Session is invalid/expired — clear local state so protected routes lock.
          localStorage.removeItem("user");
          setUser(null);
        }
      } catch {
        // Server unreachable — keep the user logged in locally to avoid disruption.
      } finally {
        setSessionChecked(true);
      }
    };
    validateSession();
  }, []);

  const isAuthenticated = !!user;
  const normalizedRole = user?.role?.toUpperCase();
  const isAdmin = normalizedRole === "ADMIN" || normalizedRole === "SUPERADMIN";
  const isStudent = normalizedRole === "USER";
  const authenticatedHome = isAdmin ? "/admin-approval" : "/homepage";

  // While the session is being validated, show a blank screen to avoid flashing
  // protected pages to a user whose session has expired.
  if (!sessionChecked) {
    return <div className="app-container" />;
  }

  return (
   
      <div className='app-container'>
        <Routes>
          {/* 1. Public Route - Student Google Login */}
        <Route path='/' element={
          !isAuthenticated ? <HomeF setUser={setUser} /> : <Navigate to={authenticatedHome} />
      } />

      {/* 2. Admin Login Portal */}
      <Route path='/adminsecretportal2026' element={
          <Admin setUser={setUser} user={user} />
      } />

      {/* 3. General Protected Routes (Students & Admins) */}
      <Route path='/homepage' element={
        <ProtectedRoute isAllowed={isAuthenticated}>
          <Homepage setUser={setUser} user={user} />
        </ProtectedRoute>
      } />
      
      <Route path='/repository' element={
        <ProtectedRoute isAllowed={isAuthenticated}>
          <Repository setUser={setUser} user={user} />
        </ProtectedRoute>
      } />

      <Route path='/reservation' element={
        <ProtectedRoute isAllowed={isAuthenticated && isStudent} redirectTo="/homepage">
          <Reservation setUser={setUser} user={user} />
        </ProtectedRoute>
      } />

      <Route path='/admin-approval' element={
        <ProtectedRoute isAllowed={isAuthenticated && isAdmin} redirectTo="/homepage">
          <AdminApproval setUser={setUser} user={user} />
        </ProtectedRoute>
      } />

      {/* Matches the backend lookup field 'id' */}
      <Route path='/details/:id' element={
        <ProtectedRoute isAllowed={isAuthenticated}>
          <ResearchDetails setUser={setUser} user={user} />
        </ProtectedRoute>
      } />

      {/* 4. Librarian/Admin Only Route */}
      <Route path='/upload' element={
        <ProtectedRoute isAllowed={isAuthenticated && isAdmin} redirectTo="/homepage">
          <Upload setUser={setUser} user={user} />
        </ProtectedRoute>
      } />

      {/* 5. Fallback: Redirect any unknown routes */}

      <Route path="*" element={<Navigate to={isAuthenticated ? authenticatedHome : "/"} replace />} />
      
    </Routes>
      <Footer/>
      </div>
  
   
    

  );
}

export default App;