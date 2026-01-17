import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext"; // FIX: Import useAuth, not AuthContext
import axios from "axios";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function CheckoutScreen({ navigation, route }) {
  const { cart, clearCart, getCartTotal } = useCart();
  const { user } = useAuth(); // FIX: Use useAuth hook
  
  const [userDetails, setUserDetails] = useState({
    fullName: user?.name || "",
    phoneNumber: user?.phoneNumber || "",
    deliveryAddress: "",
    notes: "",
  });
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const BASE_URL = "http://192.168.245.72:5000";

  // Calculate total amount
  const totalAmount = getCartTotal();
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  const handleDateChange = (event, selectedDate, type) => {
    if (type === "start") {
      setShowStartPicker(false);
      if (selectedDate) {
        setStartDate(selectedDate);
        if (selectedDate > endDate) {
          setEndDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000));
        }
      }
    } else {
      setShowEndPicker(false);
      if (selectedDate && selectedDate > startDate) {
        setEndDate(selectedDate);
      }
    }
  };

  const validateInputs = () => {
    if (!userDetails.fullName.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return false;
    }
    if (!userDetails.phoneNumber.trim() || userDetails.phoneNumber.length < 10) {
      Alert.alert("Error", "Please enter a valid phone number");
      return false;
    }
    if (!userDetails.deliveryAddress.trim()) {
      Alert.alert("Error", "Please enter delivery address");
      return false;
    }
    if (totalDays < 1) {
      Alert.alert("Error", "End date must be after start date");
      return false;
    }
    if (cart.length === 0) {
      Alert.alert("Error", "Your cart is empty");
      return false;
    }
    return true;
  };

  const handleBooking = async () => {
    if (!validateInputs()) return;

    setLoading(true);

    try {
      // Book each item separately
      const bookingPromises = cart.map(async (item) => {
        const bookingData = {
          patientId: user?.userId || "guest_" + Date.now(), // Use actual patient ID or guest
          patientName: userDetails.fullName,
          equipmentId: item._id,
          equipmentName: item.equipmentName,
          providerId: item.providerId,
          providerName: item.providerName,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          pricePerDay: item.pricePerDay,
          deliveryAddress: userDetails.deliveryAddress,
          contactPhone: userDetails.phoneNumber,
          notes: userDetails.notes,
        };

        const response = await axios.post(`${BASE_URL}/booking/create`, bookingData);
        return response.data;
      });

      const results = await Promise.all(bookingPromises);
      
      Alert.alert(
        "Success",
        `Booking confirmed for ${cart.length} item(s)`,
        [
          {
            text: "OK",
            onPress: () => {
              clearCart();
              navigation.navigate("PatientBookingsScreen"); // Navigate to bookings screen
            },
          },
        ]
      );
    } catch (error) {
      console.error(error);
      Alert.alert("Error", error.response?.data?.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>Checkout</Text>
      
      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        {cart.map((item, index) => (
          <View key={index} style={styles.cartItem}>
            <Text style={styles.itemName}>{item.equipmentName}</Text>
            <Text style={styles.itemPrice}>₹{item.pricePerDay}/day × {item.quantity || 1}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total ({totalDays} days):</Text>
          <Text style={styles.totalAmount}>₹{(totalAmount * totalDays).toFixed(2)}</Text>
        </View>
      </View>

      {/* Rental Period */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rental Period</Text>
        
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>Start Date:</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>End Date:</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={styles.dateText}>{endDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.daysText}>Total rental days: {totalDays}</Text>
      </View>

      {/* User Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Details</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={userDetails.fullName}
          onChangeText={(text) => setUserDetails({...userDetails, fullName: text})}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={userDetails.phoneNumber}
          onChangeText={(text) => setUserDetails({...userDetails, phoneNumber: text})}
          keyboardType="phone-pad"
        />
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Delivery Address"
          value={userDetails.deliveryAddress}
          onChangeText={(text) => setUserDetails({...userDetails, deliveryAddress: text})}
          multiline
          numberOfLines={3}
        />
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Additional Notes (optional)"
          value={userDetails.notes}
          onChangeText={(text) => setUserDetails({...userDetails, notes: text})}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.confirmButton, loading && styles.disabledButton]}
          onPress={handleBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, date) => handleDateChange(event, date, "start")}
        />
      )}
      
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          minimumDate={startDate}
          onChange={(event, date) => handleDateChange(event, date, "end")}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 24,
    color: "#1e293b",
    textAlign: "center",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  itemName: {
    fontSize: 16,
    color: "#475569",
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#e2e8f0",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: "#10b981",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 16,
    color: "#475569",
  },
  dateButton: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  dateText: {
    fontSize: 16,
    color: "#1e293b",
  },
  daysText: {
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "600",
    marginTop: 8,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    color: "#1e293b",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 2,
    backgroundColor: "#10b981",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#94a3b8",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});