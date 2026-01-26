import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { useCart } from "../../context/CartContext";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';

export default function PatientCartScreen() {
  const { cart, removeFromCart, clearCart, updateQuantity, validateCartStock, checkStockAvailability } = useCart();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [checkingStock, setCheckingStock] = useState({});

  const calculateTotal = () => {
    return cart.reduce((sum, item) => {
      const quantity = item.quantity || 1;
      return sum + (item.pricePerDay * quantity);
    }, 0);
  };

  const handleQuantityChange = async (itemId, change) => {
    const item = cart.find(item => item._id === itemId);
    if (!item) return;

    const currentQty = item.quantity || 1;
    const newQty = Math.max(1, currentQty + change);

    // Don't update if quantity doesn't change
    if (newQty === currentQty) return;

    setCheckingStock(prev => ({ ...prev, [itemId]: true }));

    try {
      const success = await updateQuantity(itemId, newQty);
      if (!success) {
        Alert.alert("Stock Update Failed", "Failed to update quantity");
      }
    } catch (error) {
      Alert.alert("Stock Limit", error.message);
    } finally {
      setCheckingStock(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleRemoveItem = (itemId) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item from cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeFromCart(itemId)
        }
      ]
    );
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert("Cart Empty", "Add equipment before checkout");
      return;
    }

    setLoading(true);
    try {
      // Validate stock before checkout
      const stockValidation = await validateCartStock();
      const outOfStockItems = stockValidation.filter(item => !item.available);

      if (outOfStockItems.length > 0) {
        const itemNames = outOfStockItems.map(item =>
          `• ${item.itemName}: Only ${item.currentStock} available, requested ${item.requested}`
        ).join('\n');

        Alert.alert(
          "Stock Issue",
          `Some items in your cart are no longer available:\n\n${itemNames}\n\nPlease update your cart.`,
          [{ text: "OK" }]
        );
        return;
      }

      // Navigate to checkout
      navigation.navigate("CheckoutScreen");
    } catch (error) {
      Alert.alert("Error", "Failed to validate cart items");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueShopping = () => {
    navigation.navigate("PatientEquipmentList");
  };

  const renderItem = ({ item }) => {
    const quantity = item.quantity || 1;
    const imageUrl = item.imageUrl
      ? `http://10.80.34.90:5000${item.imageUrl}`
      : "https://via.placeholder.com/100";

    const isCheckingStock = checkingStock[item._id];

    return (
      <View style={styles.cartItem}>
        <Image source={{ uri: imageUrl }} style={styles.itemImage} />

        <View style={styles.itemDetails}>
          <Text style={styles.itemName}>{item.equipmentName}</Text>
          <Text style={styles.itemProvider}>Provider: {item.providerName}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.itemPrice}>₹ {item.pricePerDay} / day</Text>
            <Text style={styles.itemTotal}>₹ {item.pricePerDay * quantity} total</Text>
          </View>

          <View style={styles.stockRow}>
            <Text style={styles.stockText}>
              Available: {item.currentStock || 0} units
            </Text>
          </View>

          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={[styles.qtyBtn, quantity <= 1 && styles.disabledQtyBtn]}
              onPress={() => handleQuantityChange(item._id, -1)}
              disabled={quantity <= 1 || isCheckingStock}
            >
              <Ionicons name="remove" size={20} color={quantity <= 1 ? "#cbd5e1" : "#475569"} />
            </TouchableOpacity>

            {isCheckingStock ? (
              <ActivityIndicator size="small" color="#3b82f6" style={styles.qtyLoader} />
            ) : (
              <Text style={styles.qtyText}>{quantity}</Text>
            )}

            <TouchableOpacity
              style={[styles.qtyBtn, quantity >= (item.currentStock || 0) && styles.disabledQtyBtn]}
              onPress={() => handleQuantityChange(item._id, 1)}
              disabled={quantity >= (item.currentStock || 0) || isCheckingStock}
            >
              <Ionicons name="add" size={20} color={quantity >= (item.currentStock || 0) ? "#cbd5e1" : "#475569"} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemoveItem(item._id)}
              disabled={isCheckingStock}
            >
              <Ionicons name="trash" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const totalAmount = calculateTotal();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        <TouchableOpacity onPress={() => navigation.navigate("PatientEquipmentList")}>
          <Ionicons name="add" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {cart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#cbd5e1" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySubtext}>
            Add equipment to get started
          </Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={handleContinueShopping}
          >
            <Text style={styles.shopBtnText}>Browse Equipment</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.cartList}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹ {totalAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={styles.summaryValue}>Free</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>₹ {totalAmount.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.checkoutBtn, loading && styles.disabledBtn]}
              onPress={handleCheckout}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={20} color="#fff" />
                  <Text style={styles.checkoutText}>Proceed to Checkout</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueBtn}
              onPress={handleContinueShopping}
              disabled={loading}
            >
              <Text style={styles.continueText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 20,
    color: "#64748b",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
  },
  shopBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  shopBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cartList: {
    padding: 16,
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  itemProvider: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  itemTotal: {
    fontSize: 14,
    color: "#10b981",
    fontWeight: "600",
  },
  stockRow: {
    marginBottom: 8,
  },
  stockText: {
    fontSize: 12,
    color: "#64748b",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  disabledQtyBtn: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  qtyLoader: {
    marginHorizontal: 16,
    minWidth: 30,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: "center",
  },
  removeBtn: {
    marginLeft: "auto",
    padding: 8,
  },
  summaryContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  summaryValue: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: "800",
    color: "#16a34a",
  },
  checkoutBtn: {
    flexDirection: "row",
    backgroundColor: "#16a34a",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
  disabledBtn: {
    backgroundColor: "#94a3b8",
  },
  checkoutText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  continueBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2563eb",
  },
  continueText: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: "600",
  },
});