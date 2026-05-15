import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute({ children, allowedRole }) {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    // Not logged in
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && userRole && userRole !== allowedRole) {
    // User is logged in but doesn't have the required role
    // Redirect them to their respective dashboard
    if (userRole === 'student') {
      return <Navigate to="/dashboard/student" replace />;
    } else if (userRole === 'teacher') {
      return <Navigate to="/dashboard/teacher" replace />;
    }
    // Fallback to home if something is weird
    return <Navigate to="/" replace />;
  }

  // Render the protected component
  return children;
}
