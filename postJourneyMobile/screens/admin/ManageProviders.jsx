import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput
} from "react-native";
import axios from "axios";

export default function ManageProviders({ navigation }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const BASE_URL = Platform.OS === "web"
    ? "http://localhost:5000"
    : "http://192.168.115.72:5000";

  // Fetch providers function
  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching providers from:", `${BASE_URL}/admin/providers`);
      const response = await axios.get(`${BASE_URL}/admin/providers`);
      console.log("Providers response:", response.data);

      if (response.data.success) {
        setProviders(response.data.users);
      } else {
        setError("Failed to fetch providers");
      }
    } catch (err) {
      console.error("Fetch providers error:", err);
      setError(err.message);
      Alert.alert("Error", "Failed to fetch providers. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  // ✅ UPDATED: Block/Unblock provider - CORRECT ENDPOINT
  const toggleBlockProvider = async (id, isCurrentlyBlocked) => {
    try {
      const action = isCurrentlyBlocked ? "unblock" : "block";

      // CORRECT ENDPOINT: /admin/users/:id/block
      const response = await axios.patch(`${BASE_URL}/admin/users/${id}/block`, {
        isBlocked: !isCurrentlyBlocked
      });

      if (response.data.success) {
        Alert.alert("Success", `Provider ${action}ed successfully`);
        fetchProviders(); // Refresh list
      } else {
        Alert.alert("Error", response.data.message || "Failed to update provider");
      }
    } catch (err) {
      console.error("Block provider error:", err);
      Alert.alert("Error", "Unable to update provider status");
    }
  };

  // ✅ UPDATED: Delete provider - CORRECT ENDPOINT
  const deleteProvider = async (id, name) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete ${name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // CORRECT ENDPOINT: /admin/users/:id
              const response = await axios.delete(`${BASE_URL}/admin/users/${id}`);

              if (response.data.success) {
                Alert.alert("Success", "Provider deleted successfully");
                fetchProviders(); // Refresh list
              } else {
                Alert.alert("Error", response.data.message || "Failed to delete provider");
              }
            } catch (err) {
              console.error("Delete provider error:", err);
              Alert.alert("Error", "Unable to delete provider");
            }
          }
        }
      ]
    );
  };

  // ✅ UPDATED: Verify provider with strict rejection logic
  const verifyProvider = async (id, status, reason = "") => {
    try {
      // CORRECT ENDPOINT: /admin/providers/:id/verify
      const endpoint = `${BASE_URL}/admin/providers/${id}/verify`;

      if (status === "rejected") {
        // For rejection, ask if they want to delete or just reject
        Alert.alert(
          "Reject Provider",
          "Choose action:",
          [
            {
              text: "Just Reject (User stays but cannot login)",
              onPress: async () => {
                try {
                  const response = await axios.patch(endpoint, {
                    status: "rejected",
                    reason,
                    autoDelete: false
                  });

                  if (response.data.success) {
                    Alert.alert(
                      "Provider Rejected",
                      "User marked as rejected. They cannot login but account remains."
                    );
                    fetchProviders(); // Refresh list
                  }
                } catch (err) {
                  console.error("Reject error:", err);
                  Alert.alert("Error", "Unable to reject provider");
                }
              }
            },
            {
              text: "Reject & Delete (Remove from system)",
              style: "destructive",
              onPress: async () => {
                try {
                  const response = await axios.patch(endpoint, {
                    status: "rejected",
                    reason,
                    autoDelete: true
                  });

                  if (response.data.success) {
                    Alert.alert(
                      "Provider Rejected & Deleted",
                      "User has been removed from the system."
                    );
                    fetchProviders(); // Refresh list
                  }
                } catch (err) {
                  console.error("Delete error:", err);
                  Alert.alert("Error", "Unable to delete provider");
                }
              }
            },
            {
              text: "Cancel",
              style: "cancel"
            }
          ]
        );
      } else {
        // For approval
        const response = await axios.patch(endpoint, {
          status: "approved"
        });

        if (response.data.success) {
          Alert.alert("Success", "Provider approved successfully");
          fetchProviders(); // Refresh list
        } else {
          Alert.alert("Error", response.data.message || "Failed to approve provider");
        }
      }
    } catch (err) {
      console.error("Verify provider error:", err);
      console.error("Error details:", err.response?.data);
      Alert.alert(
        "Error",
        err.response?.data?.message || "Unable to update provider status"
      );
    }
  };

  // ✅ SIMPLIFIED: Approve provider function
  const approveProvider = async (id) => {
    Alert.alert(
      "Approve Provider",
      "Are you sure you want to approve this provider?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              const response = await axios.patch(
                `${BASE_URL}/admin/providers/${id}/verify`,
                { status: "approved" }
              );

              if (response.data.success) {
                Alert.alert("Success", "Provider approved successfully");
                fetchProviders(); // Refresh list
              } else {
                Alert.alert("Error", response.data.message || "Failed to approve");
              }
            } catch (err) {
              console.error("Approve error:", err);
              Alert.alert("Error", "Unable to approve provider");
            }
          }
        }
      ]
    );
  };

  // ✅ UPDATED: Reject with modal (now with option to delete or just reject)
  const openRejectModal = (provider) => {
    setSelectedProvider(provider);
    setRejectReason("");
    setModalVisible(true);
  };

  // ✅ UPDATED: Confirm rejection with options
  const confirmRejection = () => {
    if (!rejectReason.trim()) {
      Alert.alert("Error", "Please provide a reason for rejection");
      return;
    }

    Alert.alert(
      "Reject Provider",
      `Choose action for ${selectedProvider?.name}:`,
      [
        {
          text: "Just Reject (Cannot login)",
          onPress: async () => {
            try {
              const response = await axios.patch(
                `${BASE_URL}/admin/providers/${selectedProvider._id}/verify`,
                {
                  status: "rejected",
                  reason: rejectReason,
                  autoDelete: false
                }
              );

              if (response.data.success) {
                Alert.alert(
                  "Provider Rejected",
                  "User marked as rejected. They cannot login."
                );
                fetchProviders(); // Refresh list
                setModalVisible(false);
              }
            } catch (err) {
              console.error("Reject error:", err);
              Alert.alert("Error", "Unable to reject provider");
            }
          }
        },
        {
          text: "Reject & Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await axios.patch(
                `${BASE_URL}/admin/providers/${selectedProvider._id}/verify`,
                {
                  status: "rejected",
                  reason: rejectReason,
                  autoDelete: true
                }
              );

              if (response.data.success) {
                Alert.alert(
                  "Provider Rejected & Deleted",
                  "User has been removed from the system."
                );
                fetchProviders(); // Refresh list
                setModalVisible(false);
              }
            } catch (err) {
              console.error("Delete error:", err);
              Alert.alert("Error", "Unable to delete provider");
            }
          }
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const renderProvider = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        item.isBlocked && styles.blockedCard
      ]}
      onPress={() => navigation.navigate("AdminUserDetailsScreen", { userId: item._id, userType: item.userType })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.statusBadges}>
          {item.isBlocked && (
            <View style={styles.blockedBadge}>
              <Text style={styles.blockedText}>BLOCKED</Text>
            </View>
          )}
          {item.providerVerification?.status === "approved" && (
            <View style={styles.approvedBadge}>
              <Text style={styles.approvedText}>APPROVED</Text>
            </View>
          )}
          {item.providerVerification?.status === "rejected" && (
            <View style={styles.rejectedBadge}>
              <Text style={styles.rejectedText}>REJECTED</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.email}>{item.email}</Text>

      <View style={styles.detailsRow}>
        <Text style={[
          styles.status,
          {
            color: item.providerVerification?.status === "approved" ? "green" :
              item.providerVerification?.status === "rejected" ? "red" : "orange"
          }
        ]}>
          Verification: {item.providerVerification?.status?.toUpperCase() || "PENDING"}
        </Text>
        <Text style={styles.verified}>
          Email: {item.isVerified ? "Verified" : "Not Verified"}
        </Text>
      </View>

      <Text style={styles.date}>
        Joined: {new Date(item.createdAt).toLocaleDateString()}
      </Text>

      {/* ACTION BUTTONS ROW 1: Verification */}
      <View style={styles.actions}>
        {item.providerVerification?.status !== "approved" && (
          <TouchableOpacity
            style={[styles.btn, styles.verifyBtn]}
            onPress={() => approveProvider(item._id)}
          >
            <Text style={styles.btnText}>✓ Approve</Text>
          </TouchableOpacity>
        )}

        {item.providerVerification?.status !== "rejected" && (
          <TouchableOpacity
            style={[styles.btn, styles.rejectBtn]}
            onPress={() => openRejectModal(item)}
          >
            <Text style={styles.btnText}>✗ Reject & Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ACTION BUTTONS ROW 2: Block & Delete */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.btn,
            styles.blockBtn,
            item.isBlocked && styles.unblockBtn
          ]}
          onPress={() => toggleBlockProvider(item._id, item.isBlocked)}
        >
          <Text style={styles.btnText}>
            {item.isBlocked ? "Unblock" : "Block"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.deleteBtn]}
          onPress={() => deleteProvider(item._id, item.name)}
        >
          <Text style={styles.btnText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading service providers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchProviders}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Service Providers ({providers.length})</Text>
        <View style={styles.stats}>
          <Text style={[styles.statText, { color: "green" }]}>
            Approved: {providers.filter(p => p.providerVerification?.status === "approved").length}
          </Text>
          <Text style={[styles.statText, { color: "orange" }]}>
            Pending: {providers.filter(p => !p.providerVerification?.status || p.providerVerification?.status === "pending").length}
          </Text>
          <Text style={[styles.statText, { color: "red" }]}>
            Blocked: {providers.filter(p => p.isBlocked).length}
          </Text>
        </View>
      </View>

      {providers.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No service providers found</Text>
        </View>
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => item._id}
          renderItem={renderProvider}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.refreshBtn} onPress={fetchProviders}>
        <Text style={styles.refreshText}>🔄 Refresh List</Text>
      </TouchableOpacity>

      {/* Rejection Reason Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Provider</Text>
            <Text style={styles.modalSubtitle}>
              {selectedProvider?.name} ({selectedProvider?.email})
            </Text>

            <View style={styles.optionsContainer}>
              <View style={styles.optionCard}>
                <Text style={styles.optionTitle}>Option 1: Just Reject</Text>
                <Text style={styles.optionDescription}>
                  • User stays in system
                  • Cannot login
                  • Status: Rejected
                </Text>
              </View>

              <View style={[styles.optionCard, styles.deleteOption]}>
                <Text style={styles.optionTitle}>Option 2: Reject & Delete</Text>
                <Text style={styles.optionDescription}>
                  • User removed from system
                  • Cannot login
                  • Permanent deletion
                </Text>
              </View>
            </View>

            <TextInput
              style={styles.reasonInput}
              placeholder="Enter reason for rejection (required)..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.rejectBtn]}
                onPress={confirmRejection}
                disabled={!rejectReason.trim()}
              >
                <Text style={styles.modalBtnText}>Choose Action</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8f9fa"
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  header: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    elevation: 2,
  },
  statText: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  errorText: {
    color: "red",
    marginBottom: 10,
    fontSize: 16,
  },
  retryBtn: {
    backgroundColor: "#0066cc",
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  retryText: {
    color: "white",
    fontWeight: "bold",
  },
  emptyText: {
    fontSize: 16,
    color: "#777",
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  blockedCard: {
    backgroundColor: "#ffe6e6",
    borderLeftWidth: 4,
    borderLeftColor: "#dc3545",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  statusBadges: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
  },
  blockedBadge: {
    backgroundColor: "#dc3545",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  approvedBadge: {
    backgroundColor: "#28a745",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  rejectedBadge: {
    backgroundColor: "#ffc107",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  blockedText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  approvedText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  rejectedText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  email: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  status: {
    fontSize: 13,
    fontWeight: "600",
  },
  verified: {
    fontSize: 13,
    color: "#666",
  },
  date: {
    fontSize: 12,
    color: "#888",
    marginBottom: 10,
  },
  actions: {
    flexDirection: "row",
    marginTop: 8,
    gap: 8,
  },
  btn: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  verifyBtn: {
    backgroundColor: "#28a745",
  },
  rejectBtn: {
    backgroundColor: "#dc3545",
  },
  blockBtn: {
    backgroundColor: "#ffc107",
  },
  unblockBtn: {
    backgroundColor: "#17a2b8",
  },
  deleteBtn: {
    backgroundColor: "#6c757d",
  },
  refreshBtn: {
    backgroundColor: "#0066cc",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  refreshText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
    color: "#dc3545",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
  },
  warningText: {
    fontSize: 12,
    color: "#dc3545",
    textAlign: "center",
    marginBottom: 10,
    fontStyle: "italic",
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 20,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#6c757d",
  },
  confirmRejectBtn: {
    backgroundColor: "#dc3545",
  },
  modalBtnText: {
    color: "white",
    fontWeight: "bold",
  },
  optionsContainer: {
    marginBottom: 15,
  },
  optionCard: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  deleteOption: {
    backgroundColor: "#fff5f5",
    borderColor: "#f5c6cb",
  },
  optionTitle: {
    fontWeight: "bold",
    marginBottom: 4,
    fontSize: 14,
  },
  optionDescription: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
});