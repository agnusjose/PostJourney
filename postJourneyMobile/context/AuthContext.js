import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext();

const USER_STORAGE_KEY = "@PostJourney_User";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved user on app start
  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log("✅ Restored session for:", userData.email);
      } else {
        console.log("📝 No stored session found");
      }
    } catch (error) {
      console.error("Error loading stored user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData) => {
    try {
      // Save to state
      setUser(userData);
      // Persist to storage
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      console.log("✅ User logged in and saved:", userData.email);
    } catch (error) {
      console.error("Error saving user session:", error);
    }
  };

  const logout = async () => {
    try {
      // Clear state
      setUser(null);
      // Clear storage
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      console.log("✅ User logged out");
    } catch (error) {
      console.error("Error clearing user session:", error);
    }
  };

  const updateUser = async (updatedData) => {
    try {
      const newUserData = { ...user, ...updatedData };
      setUser(newUserData);
      // Update storage
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUserData));
    } catch (error) {
      console.error("Error updating user session:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
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