import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Platform 
} from "react-native";
import axios from "axios";

export default function AdminUsersScreen() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState(null);

  const BASE_URL = Platform.OS === "web" 
    ? "http://localhost:5000" 
    : "http://192.168.245.72:5000";

  // ✅ FIXED: Fetch patients function
  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching patients from:", `${BASE_URL}/admin/patients`);
      const response = await axios.get(`${BASE_URL}/admin/patients`);
      console.log("Patients response:", response.data);
      
      if (response.data.success) {
        setPatients(response.data.users);
      } else {
        setError("Failed to fetch patients");
      }
    } catch (err) {
      console.error("Fetch patients error:", err);
      setError(err.message);
      Alert.alert("Error", "Failed to fetch patients. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // ✅ FIXED: Block/Unblock function
  const toggleBlock = async (id, currentStatus) => {
    try {
      // Note: This endpoint might not exist yet - we'll create it
      await axios.patch(`${BASE_URL}/admin/users/${id}/block`, {
        isBlocked: !currentStatus,
      });
      Alert.alert("Success", "User status updated");
      fetchPatients(); // Refresh list
    } catch (err) {
      console.error("Toggle block error:", err);
      Alert.alert("Error", "Unable to update user block status. Check if endpoint exists.");
    }
  };

  // ✅ FIXED: Delete user function
  const deleteUser = (id) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this user?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Note: This endpoint might not exist yet - we'll create it
              await axios.delete(`${BASE_URL}/admin/users/${id}`);
              Alert.alert("Success", "User deleted");
              fetchPatients();
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "Unable to delete user. Check if endpoint exists.");
            }
          },
        },
      ]
    );
  };

  const renderPatient = ({ item }) => {
    const createdDate = new Date(item.createdAt).toLocaleString();

    return (
      <View style={styles.card}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.email}>{item.email}</Text>

        <View style={styles.row}>
          <Text style={styles.type}>{item.userType}</Text>
          <Text
            style={[
              styles.status,
              { color: item.isBlocked ? "red" : "green" },
            ]}
          >
            {item.isBlocked ? "Blocked" : "Active"}
          </Text>
        </View>

        <Text style={styles.date}>Registered: {createdDate}</Text>
        <Text style={styles.verified}>
          Verified: {item.isVerified ? "Yes" : "No"}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: item.isBlocked ? "#28a745" : "#f39c12" },
            ]}
            onPress={() => toggleBlock(item._id, item.isBlocked)}
          >
            <Text style={styles.actionText}>
              {item.isBlocked ? "Unblock" : "Block"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#dc3545" }]}
            onPress={() => deleteUser(item._id)}
          >
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading patients...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchPatients}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>All Patients ({patients.length})</Text>
      
      {patients.length === 0 ? (
        <View style={styles.center}>
          <Text>No patients found</Text>
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item._id}
          renderItem={renderPatient}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <TouchableOpacity style={styles.refreshBtn} onPress={fetchPatients}>
        <Text style={styles.refreshText}>Refresh List</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
    color: "#333",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  errorText: {
    color: "red",
    marginBottom: 10,
  },
  retryBtn: {
    backgroundColor: "#0066cc",
    padding: 10,
    borderRadius: 5,
  },
  retryText: {
    color: "white",
    fontWeight: "bold",
  },
  card: {
    padding: 15,
    backgroundColor: "white",
    marginBottom: 12,
    borderRadius: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  email: {
    fontSize: 15,
    color: "#555",
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  type: {
    fontSize: 14,
    color: "#0066cc",
    fontWeight: "600",
  },
  status: {
    fontSize: 14,
    fontWeight: "600",
  },
  date: {
    fontSize: 13,
    color: "#777",
    marginTop: 6,
  },
  verified: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    marginTop: 12,
    justifyContent: "space-between",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  actionText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  refreshBtn: {
    marginTop: 20,
    backgroundColor: "#0066cc",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  refreshText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});