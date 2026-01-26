import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

export default function PatientBookingsScreen({ navigation }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const BASE_URL = "http://10.80.34.90:5000";

  const fetchBookings = async () => {
    try {
      console.log("📡 Fetching bookings for user:", user?.userId);
      const response = await axios.get(`${BASE_URL}/booking/patient/${user?.userId}`);
      console.log("📊 Bookings data:", response.data);

      if (response.data.success) {
        setBookings(response.data.bookings || []);
      } else {
        Alert.alert("Error", response.data.message || "Failed to fetch bookings");
      }
    } catch (error) {
      console.error("❌ Fetch bookings error:", error);
      Alert.alert("Error", "Failed to load bookings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.userId) {
      fetchBookings();
    }
  }, [user?.userId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const renderBookingItem = ({ item }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => navigation.navigate("EquipmentDetailScreen", {
        equipmentId: item.equipmentId?._id || item.equipmentId
      })}
    >
      <View style={styles.bookingHeader}>
        <Text style={styles.equipmentName}>
          {item.equipmentName || item.equipmentId?.equipmentName || "Equipment"}
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(item.status) }
        ]}>
          <Text style={styles.statusText}>
            {item.status?.toUpperCase() || "PENDING"}
          </Text>
        </View>
      </View>

      <Text style={styles.providerText}>
        Provider: {item.providerName || "N/A"}
      </Text>

      <View style={styles.datesContainer}>
        <Text style={styles.dateText}>
          📅 {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
        </Text>
        <Text style={styles.daysText}>({item.totalDays || 0} days)</Text>
      </View>

      <View style={styles.bookingFooter}>
        <Text style={styles.amountText}>
          ₹{item.totalAmount?.toFixed(2) || "0.00"}
        </Text>
        <Text style={styles.paymentStatus}>
          Payment: {item.paymentStatus || "pending"}
        </Text>
      </View>

      {item.status === "completed" && (
        <TouchableOpacity
          style={styles.reviewButton}
          onPress={() => navigation.navigate("EquipmentReviews", {
            equipmentId: item.equipmentId?._id || item.equipmentId,
            equipmentName: item.equipmentName
          })}
        >
          <Text style={styles.reviewButtonText}>Write Review</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed": return "#10b981";
      case "in-progress": return "#3b82f6";
      case "completed": return "#8b5cf6";
      case "cancelled": return "#ef4444";
      default: return "#f59e0b";
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading your bookings...</Text>
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No bookings found</Text>
        <Text style={styles.emptySubtext}>
          You haven't booked any equipment yet
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate("PatientEquipmentList")}
        >
          <Text style={styles.browseButtonText}>Browse Equipment</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Bookings</Text>

      <FlatList
        data={bookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#10b981"]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    padding: 20,
    color: "#1e293b",
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listContainer: {
    padding: 16,
  },
  bookingCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  equipmentName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  providerText: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },
  datesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  dateText: {
    fontSize: 14,
    color: "#475569",
  },
  daysText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
  bookingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#10b981",
  },
  paymentStatus: {
    fontSize: 14,
    color: "#64748b",
    fontStyle: "italic",
  },
  reviewButton: {
    marginTop: 12,
    backgroundColor: "#f1f5f9",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  reviewButtonText: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  emptyText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  browseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});