import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from "react-native";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

export default function ProviderBookingsScreen({ route, navigation }) {
  const { providerId } = route.params;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const BASE_URL = "http://10.80.34.90:5000";

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/booking/provider/${providerId}`);
      if (res.data.success) {
        setBookings(res.data.bookings || []);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      Alert.alert("Error", "Failed to load bookings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchBookings();
    }, [providerId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const res = await axios.put(`${BASE_URL}/booking/update-status/${bookingId}`, {
        status
      });

      if (res.data.success) {
        Alert.alert("Success", `Booking ${status} successfully`);
        fetchBookings();
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update booking status");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed": return "#16a34a";
      case "pending": return "#f59e0b";
      case "in-progress": return "#3b82f6";
      case "completed": return "#10b981";
      case "cancelled": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.equipmentName}>{item.equipmentName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.patient}>Patient: {item.patientName}</Text>
      <Text style={styles.contact}>Phone: {item.contactPhone}</Text>
      <Text style={styles.address}>Address: {item.deliveryAddress}</Text>

      <View style={styles.datesContainer}>
        <Text style={styles.dateText}>
          {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
        </Text>
        <Text style={styles.amount}>₹ {item.totalAmount}</Text>
      </View>

      {/* Action Buttons based on status */}
      <View style={styles.actionButtons}>
        {item.status === "pending" && (
          <>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => updateBookingStatus(item._id, "confirmed")}
            >
              <Text style={styles.btnText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => updateBookingStatus(item._id, "cancelled")}
            >
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === "confirmed" && (
          <TouchableOpacity
            style={styles.inProgressBtn}
            onPress={() => updateBookingStatus(item._id, "in-progress")}
          >
            <Text style={styles.btnText}>Mark as In Progress</Text>
          </TouchableOpacity>
        )}

        {item.status === "in-progress" && (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={() => updateBookingStatus(item._id, "completed")}
          >
            <Text style={styles.btnText}>Mark Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Booking Requests</Text>

      {bookings.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No booking requests yet</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2563eb"]}
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 20,
    color: "#1e293b",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  equipmentName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  patient: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 4,
  },
  contact: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 8,
    fontStyle: "italic",
  },
  datesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dateText: {
    fontSize: 13,
    color: "#6b7280",
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16a34a",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  confirmBtn: {
    backgroundColor: "#10b981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
  },
  rejectBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
  },
  inProgressBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
  },
  completeBtn: {
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    color: "#64748b",
  },
});