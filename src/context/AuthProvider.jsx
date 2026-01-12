// src/context/AuthProvider.jsx
import { useState, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import jwtDecode from "jwt-decode";
import axios from "axios";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Initialize user from token
  useEffect(() => {
    const initializeUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        return;
      }

      try {
        const decoded = jwtDecode(token); // decode JWT
        console.log("Decoded token:", decoded);

        // Fetch user info from backend
        const res = await axios.get("http://localhost:5000/api/auth/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("User data from backend:", res.data);
        console.log("User name:", res.data.name);
        console.log("User email:", res.data.email);
        setUser(res.data); // full user data from backend
      
      } catch (err) {
        console.error("Error fetching user:", err);
        localStorage.removeItem("token");
        setUser(null);
      }
    };

    initializeUser();
  }, []);

  // Logout function
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
