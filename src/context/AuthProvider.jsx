// src/context/AuthProvider.jsx
import { useState, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import jwtDecode from "jwt-decode";
import { requestNotificationPermission } from "../firebase/firebase";
import API from "../api/axios";

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
        const res = await API.get("/auth/user");
        console.log("User data from backend:", res.data);
        console.log("User name:", res.data.name);
        console.log("User email:", res.data.email);
        setUser(res.data); // full user data from backend

        // Request notification permission and save FCM token
        try {
          const fcmToken = await requestNotificationPermission();
          if (fcmToken) {
            // Save FCM token to backend
            await API.post("/notifications/fcm-token", { fcmToken });
            console.log("✅ FCM token saved to backend");
          }
        } catch (fcmError) {
          console.error("Error setting up notifications:", fcmError);
        }
      
      } catch (err) {
        console.error("Error fetching user:", err);
        localStorage.removeItem("token");
        setUser(null);
      }
    };

    initializeUser();
  }, []);

  // Logout function
  const logout = async () => {
    try {
      // Remove FCM token from backend
      await API.delete("/notifications/fcm-token");
    } catch (error) {
      console.error("Error removing FCM token:", error);
    }
    
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
