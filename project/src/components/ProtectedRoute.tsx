import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  getDashboardPath,
  getStoredSession,
} from '../utils/authSession';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: 'customer' | 'admin';
}

export function ProtectedRoute({
  children,
  allowedRole,
}: ProtectedRouteProps) {
  const session = getStoredSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && session.user.role !== allowedRole) {
    return (
      <Navigate
        to={getDashboardPath(session.user.role)}
        replace
      />
    );
  }

  return <>{children}</>;
}