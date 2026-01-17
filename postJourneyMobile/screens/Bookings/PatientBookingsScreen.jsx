import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  RefreshControl,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

export default function PatientBookingsScreen({ navigation }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const BASE_URL = "http://192.168.245.72:5000";

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/booking/patient/${user.userId}`);
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
    }, [user.userId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
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

  const getStatusText = (status) => {
    switch (status) {
      case "confirmed": return "Confirmed";
      case "pending": return "Pending";
      case "in-progress": return "In Progress";
      case "completed": return "Completed";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate("BookingDetails", { booking: item })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.equipmentName}>{item.equipmentName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.provider}>Provider: {item.providerName}</Text>
      
      <View style={styles.datesContainer}>
        <Text style={styles.dateText}>
          From: {new Date(item.startDate).toLocaleDateString()}
        </Text>
        <Text style={styles.dateText}>
          To: {new Date(item.endDate).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.priceContainer}>
        <Text style={styles.daysText}>{item.totalDays} days</Text>
        <Text style={styles.totalAmount}>₹ {item.totalAmount}</Text>
      </View>

      {item.imageUrl && (
        <Image 
          source={{ uri: `${BASE_URL}${item.imageUrl}` }} 
          style={styles.thumbnail}
          resizeMode="cover"
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Bookings</Text>

      {bookings.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No bookings yet</Text>
          <Text style={styles.emptySubtext}>
            Book equipment to see them here
          </Text>
          <TouchableOpacity 
            style={styles.browseBtn}
            onPress={() => navigation.navigate("PatientEquipmentList")}
          >
            <Text style={styles.browseText}>Browse Equipment</Text>
          </TouchableOpacity>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  provider: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },
  datesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dateText: {
    fontSize: 13,
    color: "#475569",
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  daysText: {
    fontSize: 14,
    color: "#6b7280",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#16a34a",
  },
  thumbnail: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: "#e5e7eb",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: "#64748b",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 20,
  },
  browseBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});