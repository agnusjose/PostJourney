import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export default function ServiceProviderDashboard({ route, navigation }) {
  const { userId, userName, userEmail } = route.params || {};
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            navigation.replace("LoginScreen");
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!userId) {
      Alert.alert("Error", "User ID not found. Please login again.");
      navigation.replace("LoginScreen");
      return;
    }

    console.log("Dashboard loaded with:", { userId, userName, userEmail });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Service Provider Dashboard</Text>

      <View style={styles.card}>
        <Text style={styles.name}>Welcome, {userName || "User"}!</Text>
        <Text>Email: {userEmail || "N/A"}</Text>
        <Text>User ID: {userId?.substring(0, 8)}...</Text>
        <Text style={styles.approved}>✔ Account Verified</Text>
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() =>
          navigation.navigate("EquipmentDashboardScreen", {
            providerId: userId,
          })
        }
      >
        <Text style={styles.btnText}>Go to Equipment Dashboard</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate("ServiceProviderProfileCompletion", {
          email: userEmail,
        })}
      >
        <Text style={styles.btnText}>View/Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
      >
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>
      // In ServiceProviderDashboard.js, add this button:
      <TouchableOpacity
        style={styles.bookingBtn}
        onPress={() =>
          navigation.navigate("ProviderBookingsScreen", {
            providerId: userId,
          })
        }
      >
        <Text style={styles.btnText}>View Booking Requests</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8fafc",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
    color: "#1e293b",
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1e293b",
  },
  approved: {
    color: "green",
    marginTop: 8,
    fontWeight: "600",
  },
  primaryBtn: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
    elevation: 2,
  },
  secondaryBtn: {
    backgroundColor: "#10b981",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
    elevation: 2,
  },
  logoutBtn: {
    backgroundColor: "#dc2626",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    elevation: 2,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  // Add to styles:
  bookingBtn: {
    backgroundColor: "#8b5cf6",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
    elevation: 2,
  },
});