import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Alert,
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
  warning: '#D4880A', warningBg: '#FFF8E7', danger: '#C0392B',
  lightTeal: '#E0F2F7',
};

const STATUS_STEPS = ["pending", "confirmed", "shipped", "out-for-delivery", "delivered"];

const getStepLabel = (step) => {
  switch (step) {
    case "pending": return "Order Placed";
    case "confirmed": return "Confirmed";
    case "shipped": return "Shipped";
    case "out-for-delivery": return "Out for Delivery";
    case "delivered": return "Delivered";
    default: return step;
  }
};

const getStepIcon = (step) => {
  switch (step) {
    case "pending": return "receipt-outline";
    case "confirmed": return "checkmark-circle-outline";
    case "shipped": return "cube-outline";
    case "out-for-delivery": return "bicycle-outline";
    case "delivered": return "home-outline";
    default: return "ellipse-outline";
  }
};

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

export default function WristbandOrdersScreen({ navigation, route }) {
  const { userId } = route.params || {};
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/wristband/orders/${userId}`);
      if (res.data.success) setOrders(res.data.orders || []);
    } catch (err) {
      console.error("Fetch wristband orders error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchOrders(); }, [userId]));

  const renderTracking = (order) => {
    if (order.status === "cancelled") {
      return (
        <View style={s.cancelledC}>
          <Ionicons name="close-circle" size={40} color={C.danger} />
          <Text style={s.cancelledT}>Order Cancelled</Text>
          {order.cancellationReason && <Text style={s.cancelR}>{order.cancellationReason}</Text>}
        </View>
      );
    }

    const currentIdx = STATUS_STEPS.indexOf(order.status);
    return (
      <View style={s.trackingC}>
        {STATUS_STEPS.map((step, i) => {
          const isDone = i <= currentIdx;
          const isCurrent = i === currentIdx;
          const isLast = i === STATUS_STEPS.length - 1;
          return (
            <View key={step} style={s.stepC}>
              <View style={s.stepLeftCol}>
                <View style={[s.stepDot, isDone && s.stepDotDone, isCurrent && s.stepDotCur]}>
                  {isDone && <Ionicons name={isCurrent ? "radio-button-on" : "checkmark"} size={14} color="#fff" />}
                </View>
                {!isLast && <View style={[s.stepLine, i < currentIdx && s.stepLineDone]} />}
              </View>
              <View style={s.stepInfo}>
                <Text style={[s.stepLabel, isDone && s.stepLabelDone, isCurrent && s.stepLabelCur]}>
                  {getStepLabel(step)}
                </Text>
                {step === "shipped" && order.trackingInfo?.trackingNumber && isDone && (
                  <Text style={s.trackingNum}>Tracking: {order.trackingInfo.trackingNumber}</Text>
                )}
                {step === "delivered" && order.trackingInfo?.deliveredAt && isDone && (
                  <Text style={s.trackingNum}>
                    Delivered: {new Date(order.trackingInfo.deliveredAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderOrder = ({ item }) => {
    const isExpanded = expandedOrder === item._id;
    return (
      <View style={s.orderCard}>
        <TouchableOpacity onPress={() => setExpandedOrder(isExpanded ? null : item._id)} activeOpacity={0.9}>
          <View style={s.orderHeader}>
            <View>
              <Text style={s.orderTitle}>HealthMonitor Pro</Text>
              <Text style={s.orderId}>Order #{item._id?.slice(-8).toUpperCase()}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={s.statusText}>{item.status?.toUpperCase().replace("-", " ")}</Text>
            </View>
          </View>
          <View style={s.orderMeta}>
            <View style={s.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={C.textSecondary} />
              <Text style={s.metaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={s.orderAmt}>₹{item.totalAmount}</Text>
          </View>
          <View style={s.payRow}>
            <Ionicons name={item.paymentStatus === "paid" ? "checkmark-circle" : "time-outline"}
              size={14} color={item.paymentStatus === "paid" ? C.success : C.warning} />
            <Text style={[s.payText, { color: item.paymentStatus === "paid" ? C.success : C.warning }]}>
              Payment: {item.paymentStatus || "pending"}
            </Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={s.expandedSection}>
            <View style={s.divider} />
            <Text style={s.trackTitle}>Delivery Tracking</Text>
            {renderTracking(item)}
            <View style={s.divider} />
            <View style={s.detailRow}>
              <Ionicons name="location-outline" size={16} color={C.textSecondary} />
              <Text style={s.detailText}>{item.deliveryAddress}</Text>
            </View>
            <View style={s.detailRow}>
              <Ionicons name="call-outline" size={16} color={C.textSecondary} />
              <Text style={s.detailText}>{item.contactPhone}</Text>
            </View>
            <View style={s.detailRow}>
              <Ionicons name="cube-outline" size={16} color={C.textSecondary} />
              <Text style={s.detailText}>Quantity: {item.quantity}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={s.expandBtn} onPress={() => setExpandedOrder(isExpanded ? null : item._id)}>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.secondary]} style={s.hdr}>
          <View style={s.hdrRow}>
            <View style={{ width: 40 }} />
            <Text style={s.hdrT}>My Wristband Orders</Text>
            <View style={{ width: 40 }} />
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
          <Text style={s.hdrT}>My Wristband Orders</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {orders.length === 0 ? (
        <View style={s.centerC}>
          <Ionicons name="watch-outline" size={80} color={C.textMuted} />
          <Text style={s.emptyText}>No wristband orders yet</Text>
          <TouchableOpacity style={s.shopBtn}
            onPress={() => navigation.navigate("WristbandProductScreen", route.params)}>
            <Text style={s.shopBtnText}>Shop Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList data={orders} renderItem={renderOrder} keyExtractor={i => i._id}
          contentContainerStyle={s.list} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} colors={[C.secondary]} />} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hdr: { paddingTop: 50, paddingBottom: 18, paddingHorizontal: 20 },
  hdrRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  hdrT: { fontSize: 20, fontWeight: "800", color: "#fff" },
  list: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 40 },
  centerC: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  emptyText: { fontSize: 20, fontWeight: "700", color: C.text, marginTop: 16, marginBottom: 20 },
  shopBtn: { backgroundColor: C.primary, paddingHorizontal: 30, paddingVertical: 14, borderRadius: 14, elevation: 4 },
  shopBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  orderCard: {
    backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 16,
    elevation: 3, borderWidth: 1, borderColor: C.cardBorder,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10,
  },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  orderTitle: { fontSize: 17, fontWeight: "700", color: C.text },
  orderId: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  orderMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13, color: C.textSecondary },
  orderAmt: { fontSize: 20, fontWeight: "800", color: C.text },
  payRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  payText: { fontSize: 12, fontWeight: "600" },
  expandBtn: { alignItems: "center", paddingTop: 8 },

  expandedSection: { marginTop: 8 },
  divider: { height: 1, backgroundColor: C.cardBorder, marginVertical: 12 },
  trackTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  detailText: { fontSize: 13, color: C.textSecondary, flex: 1 },

  cancelledC: { alignItems: "center", paddingVertical: 16 },
  cancelledT: { fontSize: 16, fontWeight: "700", color: C.danger, marginTop: 8 },
  cancelR: { fontSize: 13, color: C.textSecondary, marginTop: 4 },

  trackingC: { marginLeft: 4 },
  stepC: { flexDirection: "row", alignItems: "flex-start" },
  stepLeftCol: { alignItems: "center", width: 30 },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.lightTeal, borderWidth: 2, borderColor: C.cardBorder, justifyContent: "center", alignItems: "center" },
  stepDotDone: { backgroundColor: C.success, borderColor: C.success },
  stepDotCur: { backgroundColor: C.secondary, borderColor: C.secondary },
  stepLine: { width: 2, height: 28, backgroundColor: C.cardBorder, marginVertical: 2 },
  stepLineDone: { backgroundColor: C.success },
  stepInfo: { flex: 1, paddingLeft: 12, paddingTop: 2 },
  stepLabel: { fontSize: 13, color: C.textMuted, fontWeight: "500" },
  stepLabelDone: { color: C.success, fontWeight: "600" },
  stepLabelCur: { color: C.secondary, fontWeight: "700" },
  trackingNum: { fontSize: 11, color: C.textMuted, marginTop: 2 },
});
