// CheckoutScreen.jsx
import React, { useState, useEffect, useCallback } from "react";
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
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRoute, useNavigation } from "@react-navigation/native";

export default function CheckoutScreen({ route, navigation }) {
  const { 
    cart, 
    clearCart, 
    getSelectedTotal, 
    validateSelectedStock,
    removeSelectedItems 
  } = useCart();
  
  const { user } = useAuth();

  // Get items from either route params or cart
  const { immediateBookingItem, selectedCartItems } = route.params || {};
  
  // Determine items to book
  const itemsToBook = immediateBookingItem 
    ? [immediateBookingItem] 
    : (selectedCartItems || cart.filter(item => item.selected));

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
  const [validatingStock, setValidatingStock] = useState(false);

  const BASE_URL = "http://192.168.115.72:5000";

  // Calculate total amount
  const totalAmount = getSelectedTotal();
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const totalItems = itemsToBook.reduce((sum, item) => sum + (item.quantity || 1), 0);

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
    if (itemsToBook.length === 0) {
      Alert.alert("Error", "No items to book");
      return false;
    }

    if (!user?.userId) {
      Alert.alert("Error", "Please login to book equipment");
      return false;
    }

    return true;
  };

  const validateStockBeforeBooking = async () => {
    try {
      setValidatingStock(true);
      
      // For immediate booking, check stock individually
      if (immediateBookingItem) {
        const response = await axios.get(`${BASE_URL}/equipment/${immediateBookingItem._id}`);
        if (response.data.success) {
          const equipment = response.data.equipment;
          if (equipment.stock < immediateBookingItem.quantity) {
            Alert.alert(
              "Stock Unavailable",
              `Only ${equipment.stock} unit(s) of "${equipment.equipmentName}" available`,
              [{ text: "OK" }]
            );
            return false;
          }
        }
      } else {
        // For cart items, use existing validation
        const stockValidation = await validateSelectedStock();
        const outOfStockItems = stockValidation.filter(item => !item.available);

        if (outOfStockItems.length > 0) {
          const itemNames = outOfStockItems.map(item =>
            `• ${item.itemName}: Only ${item.currentStock} available, requested ${item.requested}`
          ).join('\n');

          Alert.alert(
            "Stock Issue",
            `Some items are no longer available:\n\n${itemNames}\n\nPlease update your cart.`,
            [{ text: "OK", onPress: () => navigation.navigate("PatientCartScreen") }]
          );
          return false;
        }
      }
      return true;
    } catch (error) {
      Alert.alert("Error", "Failed to validate stock availability");
      return false;
    } finally {
      setValidatingStock(false);
    }
  };

  const handleBooking = async () => {
    if (!validateInputs()) return;

    const isStockValid = await validateStockBeforeBooking();
    if (!isStockValid) return;

    setLoading(true);

    try {
      // Prepare cart items with fixed providerId
      const fixedItems = itemsToBook.map(item => {
        const fixedItem = { ...item };

        // Fix providerId if it's an object
        if (item.providerId && typeof item.providerId === 'object') {
          fixedItem.providerId = item.providerId._id;
          if (!fixedItem.providerName && item.providerId.name) {
            fixedItem.providerName = item.providerId.name;
          }
        }

        return fixedItem;
      });

      console.log("📋 Items to book:", fixedItems);

      // Book each item
      const bookingPromises = fixedItems.map(async (item) => {
        const bookingData = {
          patientId: user.userId,
          patientName: userDetails.fullName || user?.name,
          equipmentId: item._id,
          equipmentName: item.equipmentName,
          providerId: item.providerId,
          providerName: item.providerName,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          pricePerDay: item.pricePerDay,
          quantity: item.quantity || 1,
          deliveryAddress: userDetails.deliveryAddress,
          contactPhone: userDetails.phoneNumber,
          notes: userDetails.notes || "",
        };

        console.log("📤 Booking data for", item.equipmentName, ":", bookingData);

        try {
          const response = await axios.post(`${BASE_URL}/booking/create`, bookingData);
          console.log("✅ Booking response:", response.data);
          return response.data;
        } catch (error) {
          console.error("❌ Booking failed for", item.equipmentName, ":", error.response?.data || error.message);
          throw error;
        }
      });

      const results = await Promise.all(bookingPromises);

      // Check for failures
      const failedResults = results.filter(r => !r?.success);
      if (failedResults.length > 0) {
        throw new Error(failedResults[0].message || "Booking failed");
      }

      console.log("🎉 All bookings successful:", results);

      // Clear appropriate items from cart
      if (immediateBookingItem) {
        // For immediate booking, nothing to clear from cart
      } else {
        // For cart checkout, remove selected items
        removeSelectedItems();
      }

      Alert.alert(
        "Success!",
        `Booking confirmed for ${itemsToBook.length} item(s)`,
        [
          {
            text: "View My Bookings",
            onPress: () => {
              navigation.navigate("PatientBookingsScreen", {
                patientId: user.userId,
                refresh: true
              });
            },
          },
          {
            text: "OK",
            style: "default",
            onPress: () => {
              navigation.navigate("Home");
            }
          }
        ]
      );
    } catch (error) {
      console.error("❌ Booking error:", error);
      
      let errorMessage = "Failed to create booking. Please try again.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message.includes("Only") && error.message.includes("available")) {
        errorMessage = error.message;
      }

      Alert.alert("Booking Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Render order summary based on booking type
  const renderOrderSummary = () => {
    const isImmediateBooking = !!immediateBookingItem;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isImmediateBooking ? "Booking Summary" : `Order Summary (${totalItems} items)`}
        </Text>
        
        {itemsToBook.map((item, index) => (
          <View key={index} style={styles.cartItem}>
            <View>
              <Text style={styles.itemName}>{item.equipmentName}</Text>
              <Text style={styles.itemQuantity}>Quantity: {item.quantity || 1}</Text>
              <Text style={styles.itemProvider}>Provider: {item.providerName}</Text>
            </View>
            <Text style={styles.itemPrice}>
              ₹{item.pricePerDay} × {item.quantity || 1} = ₹{(item.pricePerDay * (item.quantity || 1)).toFixed(2)}/day
            </Text>
          </View>
        ))}
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total ({totalDays} days):</Text>
          <Text style={styles.totalAmount}>₹{(totalAmount * totalDays).toFixed(2)}</Text>
        </View>
        
        {isImmediateBooking && (
          <Text style={styles.noteText}>
            Note: This is an immediate booking. Item will not be added to cart.
          </Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.header}>Checkout</Text>

      {renderOrderSummary()}

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
          onChangeText={(text) => setUserDetails({ ...userDetails, fullName: text })}
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={userDetails.phoneNumber}
          onChangeText={(text) => setUserDetails({ ...userDetails, phoneNumber: text })}
          keyboardType="phone-pad"
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Delivery Address"
          value={userDetails.deliveryAddress}
          onChangeText={(text) => setUserDetails({ ...userDetails, deliveryAddress: text })}
          multiline
          numberOfLines={3}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Additional Notes (optional)"
          value={userDetails.notes}
          onChangeText={(text) => setUserDetails({ ...userDetails, notes: text })}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading || validatingStock}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmButton, (loading || validatingStock) && styles.disabledButton]}
          onPress={handleBooking}
          disabled={loading || validatingStock}
        >
          {loading || validatingStock ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Stock Validation Status */}
      {validatingStock && (
        <View style={styles.validationContainer}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.validationText}>Checking stock availability...</Text>
        </View>
      )}

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
    fontWeight: "600",
  },
  itemQuantity: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  itemStock: {
    fontSize: 11,
    color: "#10b981",
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "right",
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
  validationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  validationText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#0369a1",
  },
  noteText: {
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
    marginTop: 8,
    padding: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
  },
});