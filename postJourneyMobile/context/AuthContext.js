// context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext();

const SESSIONS_STORAGE_KEY = "@PostJourney_Sessions";
const ACTIVE_USER_STORAGE_KEY = "@PostJourney_ActiveUser";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [allSessions, setAllSessions] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load all saved sessions on app start
  useEffect(() => {
    loadAllSessions();
  }, []);

  const loadAllSessions = async () => {
    try {
      const storedSessions = await AsyncStorage.getItem(SESSIONS_STORAGE_KEY);
      const activeUserId = await AsyncStorage.getItem(ACTIVE_USER_STORAGE_KEY);

      let sessions = storedSessions ? JSON.parse(storedSessions) : {};
      setAllSessions(sessions);

      // Restore the active user
      if (activeUserId && sessions[activeUserId]) {
        setUser(sessions[activeUserId]);
        console.log("✅ Restored active session for:", sessions[activeUserId].email);
      } else if (Object.keys(sessions).length > 0) {
        // If no active user set, use the first available
        const firstUserId = Object.keys(sessions)[0];
        setUser(sessions[firstUserId]);
        console.log("✅ Restored session for:", sessions[firstUserId].email);
      } else {
        console.log("📝 No stored sessions found");
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData) => {
    try {
      console.log("🔑 Login called with userData:", {
        userId: userData.userId,
        email: userData.email,
        userType: userData.userType,
      });

      const userId = userData.userId;
      
      // Add this user to the sessions object
      const updatedSessions = {
        ...allSessions,
        [userId]: userData,
      };

      // Update state
      setAllSessions(updatedSessions);
      setUser(userData);

      // Persist all sessions
      await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));
      await AsyncStorage.setItem(ACTIVE_USER_STORAGE_KEY, userId);

      console.log(`✅ User ${userData.email} (${userData.userType}) logged in. Total sessions: ${Object.keys(updatedSessions).length}`);
    } catch (error) {
      console.error("❌ Error saving user session:", error);
    }
  };

  const logout = async () => {
    try {
      if (!user) return;

      const userId = user.userId;
      const updatedSessions = { ...allSessions };
      delete updatedSessions[userId];

      setAllSessions(updatedSessions);
      await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));

      // Switch to another available session if exists
      if (Object.keys(updatedSessions).length > 0) {
        const nextUserId = Object.keys(updatedSessions)[0];
        const nextUser = updatedSessions[nextUserId];
        setUser(nextUser);
        await AsyncStorage.setItem(ACTIVE_USER_STORAGE_KEY, nextUserId);
        console.log(`✅ User logged out. Switched to: ${nextUser.email}`);
      } else {
        setUser(null);
        await AsyncStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
        console.log("✅ User logged out. No other sessions available.");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // Switch to a different logged-in user WITHOUT logging out
  const switchUser = async (userId) => {
    try {
      if (allSessions[userId]) {
        setUser(allSessions[userId]);
        await AsyncStorage.setItem(ACTIVE_USER_STORAGE_KEY, userId);
        console.log(`🔄 Switched to user: ${allSessions[userId].email}`);
      } else {
        console.error("User not found in sessions");
      }
    } catch (error) {
      console.error("Error switching user:", error);
    }
  };

  const updateUser = async (updatedData) => {
    try {
      const newUserData = { ...user, ...updatedData };
      const userId = user.userId;

      const updatedSessions = {
        ...allSessions,
        [userId]: newUserData,
      };

      setUser(newUserData);
      setAllSessions(updatedSessions);
      await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));
    } catch (error) {
      console.error("Error updating user session:", error);
    }
  };

  // Get all available sessions for switching
  const getAvailableSessions = () => {
    return Object.values(allSessions).map((session) => ({
      userId: session.userId,
      email: session.email,
      name: session.name,
      userType: session.userType,
      isActive: user?.userId === session.userId,
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        allSessions,
        isLoading,
        login,
        logout,
        switchUser,
        updateUser,
        getAvailableSessions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};