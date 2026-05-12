import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { SERVER_CONFIG } from "../../config/ServerConfig";
import axios from "axios";

const BASE_URL = SERVER_CONFIG.BASE_URL;

const C = {
  primary: '#0A5F7A', secondary: '#1D8FAB', bg: '#F0F6F9', card: '#FFFFFF',
  cardBorder: '#D7E5ED', text: '#0A3D52', textSecondary: '#4A7A8C',
  textMuted: '#8AACB8', success: '#1A8C5B', danger: '#C0392B',
  lightTeal: '#E0F2F7',
};

export default function WristbandCheckoutScreen({ navigation, route }) {
  const { userId, userName, userEmail } = route.params || {};
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [details, setDetails] = useState({
    fullName: userName || user?.name || "",
    phone: "",
    address: "",
    notes: "",
  });

  const unitPrice = 500;
  const total = unitPrice * quantity;

  const validate = () => {
    if (!details.fullName.trim()) { Alert.alert("Error", "Please enter your name"); return false; }
    if (!details.phone.trim() || !/^[6-9]\d{9}$/.test(details.phone)) {
      Alert.alert("Error", "Please enter a valid 10-digit mobile number"); return false;
    }
    if (!details.address.trim()) { Alert.alert("Error", "Please enter delivery address"); return false; }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/wristband/order`, {
        patientId: userId || user?.userId,
        patientName: details.fullName,
        email: userEmail || user?.email,
        quantity,
        deliveryAddress: details.address,
        contactPhone: details.phone,
        notes: details.notes,
      });
      if (res.data.success) {
        navigation.navigate("WristbandPaymentScreen", {
          orderId: res.data.orderId,
          amount: total,
          userId, userName, userEmail,
        });
      } else {
        Alert.alert("Error", res.data.message || "Failed to place order");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to place order. Try again.");
      console.error("Wristband order error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={s.hdr}>
        <View style={s.hdrRow}>
          <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.hdrT}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={s.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Order Summary</Text>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>HealthMonitor Pro Wristband</Text>
            <Text style={s.summaryPrice}>₹{unitPrice}</Text>
          </View>
          <View style={s.qtyRow}>
            <Text style={s.qtyLabel}>Quantity:</Text>
            <View style={s.qtyControls}>
              <TouchableOpacity style={s.qtyBtn} onPress={() => quantity > 1 && setQuantity(q => q - 1)}>
                <Text style={s.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.qtyValue}>{quantity}</Text>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setQuantity(q => q + 1)}>
                <Text style={s.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.summaryRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>₹{total}</Text>
          </View>
        </View>

        {/* Delivery Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Delivery Details</Text>
          <View style={s.inputC}>
            <Ionicons name="person-outline" size={20} color={C.textMuted} style={s.inputIcon} />
            <TextInput style={s.input} placeholder="Full Name" value={details.fullName}
              onChangeText={t => setDetails({ ...details, fullName: t })} placeholderTextColor={C.textMuted} />
          </View>
          <View style={s.inputC}>
            <Ionicons name="call-outline" size={20} color={C.textMuted} style={s.inputIcon} />
            <TextInput style={s.input} placeholder="Phone Number (10 digits)" value={details.phone}
              onChangeText={t => setDetails({ ...details, phone: t.replace(/[^0-9]/g, '').slice(0, 10) })}
              keyboardType="phone-pad" maxLength={10} placeholderTextColor={C.textMuted} />
          </View>
          <View style={[s.inputC, { alignItems: 'flex-start' }]}>
            <Ionicons name="location-outline" size={20} color={C.textMuted} style={[s.inputIcon, { marginTop: 14 }]} />
            <TextInput style={[s.input, { minHeight: 80, textAlignVertical: "top" }]} placeholder="Delivery Address"
              value={details.address} onChangeText={t => setDetails({ ...details, address: t })}
              multiline numberOfLines={3} placeholderTextColor={C.textMuted} />
          </View>
          <View style={[s.inputC, { alignItems: 'flex-start' }]}>
            <Ionicons name="document-text-outline" size={20} color={C.textMuted} style={[s.inputIcon, { marginTop: 14 }]} />
            <TextInput style={[s.input, { minHeight: 60, textAlignVertical: "top" }]} placeholder="Notes (optional)"
              value={details.notes} onChangeText={t => setDetails({ ...details, notes: t })}
              multiline placeholderTextColor={C.textMuted} />
          </View>
        </View>

        {/* Place Order */}
        <TouchableOpacity style={[s.orderBtn, loading && s.orderBtnDisabled]}
          onPress={handlePlaceOrder} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={s.orderBtnText}>Place Order · ₹{total}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  hdr: { paddingTop: 50, paddingBottom: 18, paddingHorizontal: 20 },
  hdrRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  hdrT: { fontSize: 20, fontWeight: "800", color: "#fff" },
  content: { paddingHorizontal: 22, paddingTop: 16 },

  section: {
    backgroundColor: C.card, borderRadius: 18, padding: 20, marginBottom: 18,
    elevation: 3, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, borderWidth: 1, borderColor: C.cardBorder,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 16 },

  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontSize: 15, color: C.text, fontWeight: "500" },
  summaryPrice: { fontSize: 15, color: C.text, fontWeight: "600" },
  qtyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  qtyLabel: { fontSize: 15, color: C.textSecondary },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.lightTeal,
    justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: C.cardBorder,
  },
  qtyBtnText: { fontSize: 18, fontWeight: "700", color: C.primary },
  qtyValue: { fontSize: 18, fontWeight: "700", color: C.text, minWidth: 30, textAlign: "center" },
  divider: { height: 1, backgroundColor: C.cardBorder, marginVertical: 10 },
  totalLabel: { fontSize: 18, fontWeight: "700", color: C.text },
  totalValue: { fontSize: 22, fontWeight: "800", color: C.success },

  inputC: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.cardBorder, borderRadius: 12, marginBottom: 14, paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: C.text },

  orderBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: C.primary, paddingVertical: 18, borderRadius: 15, gap: 10,
    elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  orderBtnDisabled: { backgroundColor: C.textMuted, elevation: 0 },
  orderBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
