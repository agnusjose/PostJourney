// PatientCartScreen.jsx
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
  const { 
    cart, 
    removeFromCart, 
    updateQuantity, 
    validateSelectedStock,
    toggleItemSelection,
    selectAllItems,
    deselectAllItems,
    getSelectedItems,
    getSelectedTotal,
    getSelectedCount,
    loading: cartLoading 
  } = useCart();
  
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [checkingStock, setCheckingStock] = useState({});
  const [outOfStockItems, setOutOfStockItems] = useState([]);
  const [allSelected, setAllSelected] = useState(false);

  // Update allSelected state
  useEffect(() => {
    if (cart.length > 0) {
      const allSelected = cart.every(item => item.selected);
      setAllSelected(allSelected);
    } else {
      setAllSelected(false);
    }
  }, [cart]);

  // Check for out of stock items
  useEffect(() => {
    const checkStock = async () => {
      if (cart.length === 0) {
        setOutOfStockItems([]);
        return;
      }

      const stockValidation = await validateSelectedStock();
      const unavailableItems = stockValidation.filter(item => !item.available);
      setOutOfStockItems(unavailableItems.map(item => item.itemId));
    };

    checkStock();
  }, [cart]);

  const handleToggleSelectAll = () => {
    if (allSelected) {
      deselectAllItems();
    } else {
      selectAllItems();
    }
  };

  const handleQuantityChange = async (itemId, change) => {
    const item = cart.find(item => item._id === itemId);
    if (!item) return;

    const currentQty = item.quantity || 1;
    const newQty = Math.max(1, currentQty + change);

    if (newQty === currentQty) return;

    setCheckingStock(prev => ({ ...prev, [itemId]: true }));

    try {
      const success = await updateQuantity(itemId, newQty);
      if (!success) {
        Alert.alert("Error", "Failed to update quantity");
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
    const selectedItems = getSelectedItems();
    
    if (selectedItems.length === 0) {
      Alert.alert("No Items Selected", "Please select items to checkout");
      return;
    }

    // Check for out of stock items
    const selectedOutOfStock = selectedItems.filter(item => 
      outOfStockItems.includes(item._id)
    );
    
    if (selectedOutOfStock.length > 0) {
      const itemNames = selectedOutOfStock.map(item => `• ${item.equipmentName}`).join('\n');
      Alert.alert(
        "Stock Issue",
        `Some selected items are no longer available:\n\n${itemNames}\n\nPlease remove them before checkout.`,
        [{ text: "OK" }]
      );
      return;
    }

    setLoading(true);
    try {
      // Validate stock with fresh data
      const stockValidation = await validateSelectedStock();
      const unavailableItems = stockValidation.filter(item => !item.available);

      if (unavailableItems.length > 0) {
        const itemNames = unavailableItems.map(item =>
          `• ${item.itemName}: Only ${item.currentStock} available, requested ${item.requested}`
        ).join('\n');

        Alert.alert(
          "Stock Issue",
          `Some items are no longer available:\n\n${itemNames}\n\nPlease update your cart.`,
          [{ text: "OK" }]
        );
        return;
      }

      // Navigate to checkout with selected items
      navigation.navigate("CheckoutScreen", {
        selectedCartItems: selectedItems
      });
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
    const currentStock = item.currentStock || 0;
    const imageUrl = item.imageUrl
      ? `http://192.168.115.72:5000${item.imageUrl}`
      : "https://via.placeholder.com/100";

    const isCheckingStock = checkingStock[item._id];
    const isOutOfStock = currentStock < quantity;
    const canIncrease = currentStock > quantity;

    return (
      <View style={[styles.cartItem, isOutOfStock && styles.outOfStockItem]}>
        {/* Selection checkbox */}
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => toggleItemSelection(item._id)}
        >
          {item.selected ? (
            <Ionicons name="checkbox" size={24} color="#3b82f6" />
          ) : (
            <Ionicons name="square-outline" size={24} color="#94a3b8" />
          )}
        </TouchableOpacity>

        <Image source={{ uri: imageUrl }} style={styles.itemImage} />

        <View style={styles.itemDetails}>
          <Text style={[styles.itemName, isOutOfStock && styles.outOfStockText]}>
            {item.equipmentName}
          </Text>
          <Text style={styles.itemProvider}>Provider: {item.providerName}</Text>

          <View style={styles.priceRow}>
            <Text style={[styles.itemPrice, isOutOfStock && styles.outOfStockText]}>
              ₹ {item.pricePerDay} / day
            </Text>
            <Text style={[styles.itemTotal, isOutOfStock && styles.outOfStockText]}>
              ₹ {item.pricePerDay * quantity} total/day
            </Text>
          </View>

          <View style={styles.stockRow}>
            <Text style={[
              styles.stockText,
              isOutOfStock && styles.outOfStockText
            ]}>
              {isOutOfStock
                ? `Currently unavailable (${currentStock} in stock)`
                : `Available: ${currentStock} units`
              }
            </Text>
          </View>

          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={[styles.qtyBtn, (quantity <= 1 || isOutOfStock || isCheckingStock) && styles.disabledQtyBtn]}
              onPress={() => handleQuantityChange(item._id, -1)}
              disabled={quantity <= 1 || isOutOfStock || isCheckingStock}
            >
              <Ionicons name="remove" size={20} color={
                quantity <= 1 || isOutOfStock || isCheckingStock ? "#cbd5e1" : "#475569"
              } />
            </TouchableOpacity>

            {isCheckingStock ? (
              <ActivityIndicator size="small" color="#3b82f6" style={styles.qtyLoader} />
            ) : (
              <Text style={[
                styles.qtyText,
                isOutOfStock && styles.outOfStockText
              ]}>
                {quantity}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.qtyBtn, (!canIncrease || isOutOfStock || isCheckingStock) && styles.disabledQtyBtn]}
              onPress={() => handleQuantityChange(item._id, 1)}
              disabled={!canIncrease || isOutOfStock || isCheckingStock}
            >
              <Ionicons name="add" size={20} color={
                !canIncrease || isOutOfStock || isCheckingStock ? "#cbd5e1" : "#475569"
              } />
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

  const selectedItems = getSelectedItems();
  const selectedTotal = getSelectedTotal();
  const selectedCount = getSelectedCount();
  const hasSelectedItems = selectedItems.length > 0;
  const hasOutOfStockSelected = selectedItems.some(item => 
    outOfStockItems.includes(item._id)
  );

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
          {/* Selection Header */}
          <View style={styles.selectionHeader}>
            <TouchableOpacity
              style={styles.selectAllBtn}
              onPress={handleToggleSelectAll}
            >
              {allSelected ? (
                <Ionicons name="checkbox" size={24} color="#3b82f6" />
              ) : (
                <Ionicons name="square-outline" size={24} color="#64748b" />
              )}
              <Text style={styles.selectAllText}>
                {allSelected ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.selectedCount}>
              {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            </Text>
          </View>

          {hasOutOfStockSelected && (
            <View style={styles.outOfStockBanner}>
              <Ionicons name="alert-circle" size={20} color="#fff" />
              <Text style={styles.outOfStockBannerText}>
                Some selected items are unavailable
              </Text>
            </View>
          )}

          <FlatList
            data={cart}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.cartList}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({selectedCount} items)</Text>
              <Text style={styles.summaryValue}>₹ {selectedTotal.toFixed(2)}/day</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={styles.summaryValue}>Free</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount/Day</Text>
              <Text style={styles.totalAmount}>₹ {selectedTotal.toFixed(2)}</Text>
            </View>

            {hasOutOfStockSelected && (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle" size={18} color="#f59e0b" />
                <Text style={styles.warningText}>
                  Remove unavailable items before checkout
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                (loading || !hasSelectedItems || hasOutOfStockSelected) && styles.disabledBtn
              ]}
              onPress={handleCheckout}
              disabled={loading || !hasSelectedItems || hasOutOfStockSelected}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={20} color="#fff" />
                  <Text style={styles.checkoutText}>
                    {!hasSelectedItems ? 'Select Items to Checkout' : 
                     hasOutOfStockSelected ? 'Fix Items First' : 'Proceed to Checkout'}
                  </Text>
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  refreshBtn: {
    padding: 4,
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
  outOfStockBanner: {
    backgroundColor: "#ef4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    gap: 8,
  },
  outOfStockBannerText: {
    color: "#fff",
    fontSize: 14,
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
    position: "relative",
  },
  outOfStockItem: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  outOfStockBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    zIndex: 1,
  },
  outOfStockBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
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
  outOfStockText: {
    color: "#ef4444",
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
  lowStockText: {
    color: "#f59e0b",
    fontWeight: "600",
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
  removeOutOfStockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    gap: 6,
  },
  removeOutOfStockText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
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
    marginBottom: 16,
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
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: "#92400e",
    flex: 1,
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
    fontSize: 16,
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
   selectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  selectAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  selectedCount: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
  checkbox: {
    marginRight: 12,
  },
});