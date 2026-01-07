import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import axios from "axios";

export default function AdminUsersScreen() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

const BASE_URL =
  Platform.OS === "web"
    ? "http://localhost:5000"
    : "http://192.168.245.72/:5000";

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/admin/users`);
      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Block / Unblock
  const toggleBlock = async (id) => {
  
  console.log("BLOCK CLICKED:", id);

    try {
      await axios.put(`${BASE_URL}/admin/block/${id}`);
      fetchUsers();
    } catch {
      Alert.alert("Error", "Unable to update user");
    }
  };

  // Delete user
  const deleteUser = (id) => {
    console.log("DELETE CLICKED:", id);
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
              await axios.delete(`${BASE_URL}/admin/delete/${id}`);
              fetchUsers();
            } catch {
              Alert.alert("Error", "Unable to delete user");
            }
          },
        },
      ]
    );
  };

  const renderUser = ({ item }) => {
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

        {item.userType !== "admin" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: item.isBlocked ? "#28a745" : "#f39c12" },
              ]}
              onPress={() => toggleBlock(item._id)}
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
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>All Users ({users.length})</Text>

      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={renderUser}
      />

      <TouchableOpacity style={styles.refreshBtn} onPress={fetchUsers}>
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Refresh List
        </Text>
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
  },
  card: {
    padding: 15,
    backgroundColor: "white",
    marginBottom: 12,
    borderRadius: 10,
    elevation: 3,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
  },
  email: {
    fontSize: 15,
    color: "#555",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
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
  actions: {
    flexDirection: "row",
    marginTop: 12,
    justifyContent: "space-between",
  },
  actionBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    marginHorizontal: 4,
  },
  actionText: {
    color: "white",
    fontWeight: "bold",
  },
  refreshBtn: {
    marginTop: 20,
    backgroundColor: "#0066cc",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
});