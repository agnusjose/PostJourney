import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Alert, Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { SERVER_CONFIG } from "../../config/ServerConfig";
import axios from "axios";

const BASE_URL = SERVER_CONFIG.BASE_URL;

const C = {
  primary: '#0A5F7A', secondary: '#1D8FAB', bg: '#F0F6F9', card: '#FFFFFF',
  cardBorder: '#D7E5ED', text: '#0A3D52', textSecondary: '#4A7A8C',
  textMuted: '#8AACB8', success: '#1A8C5B', successBg: '#E6F7EE',
  warning: '#D4880A', warningBg: '#FFF8E7', danger: '#C0392B', dangerBg: '#FDEDED',
  lightTeal: '#E0F2F7',
};

const ALL_STATUSES = ["pending", "confirmed", "shipped", "out-for-delivery", "delivered", "cancelled"];

const getStatusColor = (status) => {
  switch (status) {
    case "confirmed": return C.success;
    case "shipped": return "#3B82F6";
    case "out-for-delivery": return "#F59E0B";
    case "delivered": return "#8B5CF6";
    case "cancelled": return C.danger;
    default: return C.warning;
  }
};

export default function AdminWristbandOrders({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/admin/wristband/orders`);
      if (res.data.success) setOrders(res.data.orders || []);
    } catch (err) {
      console.error("Admin fetch wristband orders error:", err);
      Alert.alert("Error", "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchOrders(); }, []));

  const updateStatus = async (orderId, newStatus) => {
    setUpdating(true);
    try {
      const res = await axios.put(`${BASE_URL}/admin/wristband/order/${orderId}/status`, {
        status: newStatus,
      });
      if (res.data.success) {
        Alert.alert("Success", `Order status updated to ${newStatus}`);
        setStatusModalVisible(false);
        setSelectedOrder(null);
        fetchOrders();
      } else {
        Alert.alert("Error", res.data.message);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const getNextStatuses = (currentStatus) => {
    const idx = ALL_STATUSES.indexOf(currentStatus);
    if (currentStatus === "cancelled" || currentStatus === "delivered") return [];
    return ALL_STATUSES.filter((_, i) => i > idx);
  };

  const renderOrder = ({ item }) => {
    const nextStatuses = getNextStatuses(item.status);
    return (
      <View style={s.orderCard}>
        <View style={s.orderHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.orderTitle}>Order #{item._id?.slice(-8).toUpperCase()}</Text>
            <Text style={s.patientName}>{item.patientName}</Text>
            <Text style={s.email}>{item.email}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={s.statusText}>{item.status?.toUpperCase().replace("-", " ")}</Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.detailsGrid}>
          <View style={s.detailItem}>
            <Ionicons name="calendar-outline" size={14} color={C.textMuted} />
            <Text style={s.detailText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={s.detailItem}>
            <Ionicons name="cube-outline" size={14} color={C.textMuted} />
            <Text style={s.detailText}>Qty: {item.quantity}</Text>
          </View>
          <View style={s.detailItem}>
            <Ionicons name="cash-outline" size={14} color={C.textMuted} />
            <Text style={s.detailText}>₹{item.totalAmount}</Text>
          </View>
          <View style={s.detailItem}>
            <Ionicons name={item.paymentStatus === "paid" ? "checkmark-circle" : "time-outline"}
              size={14} color={item.paymentStatus === "paid" ? C.success : C.warning} />
            <Text style={[s.detailText, { color: item.paymentStatus === "paid" ? C.success : C.warning }]}>
              {item.paymentStatus?.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={s.addressRow}>
          <Ionicons name="location-outline" size={14} color={C.textMuted} />
          <Text style={s.addressText} numberOfLines={2}>{item.deliveryAddress}</Text>
        </View>

        {nextStatuses.length > 0 && (
          <TouchableOpacity style={s.updateBtn}
            onPress={() => { setSelectedOrder(item); setStatusModalVisible(true); }}>
            <Ionicons name="sync-outline" size={16} color="#fff" />
            <Text style={s.updateBtnText}>Update Status</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.secondary]} style={s.hdr}>
          <View style={s.hdrRow}>
            <View style={{ width: 40 }} /><Text style={s.hdrT}>Wristband Orders</Text><View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={s.centerC}><ActivityIndicator size="large" color={C.secondary} /></View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={s.hdr}>
        <View style={s.hdrRow}>
          <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.hdrT}>Wristband Orders</Text>
          <View style={s.countBadge}><Text style={s.countText}>{orders.length}</Text></View>
        </View>
      </LinearGradient>

      {orders.length === 0 ? (
        <View style={s.centerC}>
          <Ionicons name="watch-outline" size={80} color={C.textMuted} />
          <Text style={s.emptyText}>No wristband orders yet</Text>
        </View>
      ) : (
        <FlatList data={orders} renderItem={renderOrder} keyExtractor={i => i._id}
          contentContainerStyle={s.list} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchOrders(); }} colors={[C.secondary]} />} />
      )}

      {/* Status Update Modal */}
      <Modal visible={statusModalVisible} transparent animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalC}>
            <Text style={s.modalTitle}>Update Order Status</Text>
            <Text style={s.modalSub}>
              Order #{selectedOrder?._id?.slice(-8).toUpperCase()} · {selectedOrder?.patientName}
            </Text>
            <Text style={s.modalCurrent}>
              Current: {selectedOrder?.status?.toUpperCase().replace("-", " ")}
            </Text>

            {selectedOrder && getNextStatuses(selectedOrder.status).map(status => (
              <TouchableOpacity key={status} style={s.statusOption}
                onPress={() => {
                  Alert.alert("Confirm", `Update status to "${status.toUpperCase().replace("-", " ")}"?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Yes", onPress: () => updateStatus(selectedOrder._id, status) },
                  ]);
                }}>
                <View style={[s.statusDot, { backgroundColor: getStatusColor(status) }]} />
                <Text style={s.statusOptionText}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={C.textMuted} />
              </TouchableOpacity>
            ))}

            {updating && <ActivityIndicator style={{ marginTop: 12 }} color={C.secondary} />}

            <TouchableOpacity style={s.modalClose} onPress={() => setStatusModalVisible(false)}>
              <Text style={s.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hdr: { paddingTop: 50, paddingBottom: 18, paddingHorizontal: 20 },
  hdrRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  hdrT: { fontSize: 20, fontWeight: "800", color: "#fff" },
  countBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  countText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  list: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 40 },
  centerC: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 18, fontWeight: "700", color: C.text, marginTop: 16 },

  orderCard: {
    backgroundColor: C.card, borderRadius: 18, padding: 18, marginBottom: 14,
    elevation: 3, borderWidth: 1, borderColor: C.cardBorder,
  },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderTitle: { fontSize: 14, fontWeight: "700", color: C.text },
  patientName: { fontSize: 16, fontWeight: "700", color: C.primary, marginTop: 2 },
  email: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: C.cardBorder, marginVertical: 12 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 10 },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailText: { fontSize: 13, color: C.textSecondary, fontWeight: "500" },
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 4, marginBottom: 12 },
  addressText: { fontSize: 12, color: C.textSecondary, flex: 1 },
  updateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: C.primary, paddingVertical: 12, borderRadius: 12, gap: 6,
  },
  updateBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalC: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '60%' },
  modalTitle: { fontSize: 20, fontWeight: "800", color: C.text, marginBottom: 4 },
  modalSub: { fontSize: 14, color: C.textSecondary, marginBottom: 4 },
  modalCurrent: { fontSize: 13, color: C.warning, fontWeight: "600", marginBottom: 16 },
  statusOption: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1,
    borderBottomColor: C.cardBorder, gap: 12,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusOptionText: { flex: 1, fontSize: 16, fontWeight: "600", color: C.text },
  modalClose: { backgroundColor: C.dangerBg, paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 16, borderWidth: 1, borderColor: '#F5C6C6' },
  modalCloseText: { color: C.danger, fontSize: 15, fontWeight: "700" },
});
