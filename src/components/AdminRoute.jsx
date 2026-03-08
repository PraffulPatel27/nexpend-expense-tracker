import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * A wrapper for routes that should only be accessible by Admin users.
 */
const AdminRoute = ({ children }) => {
    const { currentUser, isAdmin, userData } = useAuth();

    // While waiting for AuthContext to fetch userData, don't redirect yet
    if (currentUser && !userData) {
        return <div className="flex justify-center items-center min-h-screen">Verifying Admin Access...</div>;
    }

    if (!currentUser || !isAdmin) {
        // Not an admin? Send them back to the dashboard or login
        return <Navigate to="/" replace />;
    }

    return children;
};

export default AdminRoute;
