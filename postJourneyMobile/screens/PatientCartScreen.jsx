import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useCart } from "../context/CartContext";

export default function PatientCartScreen() {
  const { cart, removeFromCart, clearCart } = useCart();

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.pricePerDay,
    0
  );

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert("Cart Empty", "Add equipment before checkout");
      return;
    }

    Alert.alert(
      "Booking Confirmed",
      "Your equipment booking has been placed successfully"
    );

    clearCart();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Cart</Text>

      {cart.length === 0 ? (
        <Text style={styles.empty}>Your cart is empty</Text>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View>
                  <Text style={styles.name}>{item.equipmentName}</Text>
                  <Text>₹ {item.pricePerDay} / day</Text>
                </View>

                <TouchableOpacity
                  onPress={() => removeFromCart(item._id)}
                >
                  <Text style={styles.remove}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          />

          <Text style={styles.total}>Total: ₹ {totalAmount}</Text>

          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={handleCheckout}
          >
            <Text style={styles.checkoutText}>Confirm Booking</Text>
          </TouchableOpacity>
        </>
      )}
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
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#64748b",
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  name: {
    fontWeight: "700",
    fontSize: 16,
  },
  remove: {
    color: "red",
    fontWeight: "700",
  },
  total: {
    fontSize: 18,
    fontWeight: "800",
    marginVertical: 12,
    textAlign: "right",
  },
  checkoutBtn: {
    backgroundColor: "#16a34a",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  checkoutText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});