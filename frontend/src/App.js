import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Upload from './components/Upload/upload'
import HomeF from './components/HomeF/home';
import Homepage from './components/HomepageF/homepage';
import Repository from './components/Repository/repository';
import ResearchDetails from './components/ResearchDetails/researchdetails';
import Admin from './components/AdminF/Admin';
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

  const isAuthenticated = !!user;
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  return (
   
      <div className='app-container'>
        <Routes>
          {/* 1. Public Route - Student Google Login */}
        <Route path='/' element={
          !isAuthenticated ? <HomeF setUser={setUser} /> : <Navigate to="/homepage" />
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

      <Route path="*" element={<Navigate to={isAuthenticated ? "/homepage" : "/"} replace />} />
      
    </Routes>
      <Footer/>
      </div>
  
   
    
    


  );
}

export default App;