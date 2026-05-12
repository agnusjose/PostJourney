import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, StatusBar, TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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

const PAYMENT_METHODS = [
  { id: "upi", name: "UPI", icon: "phone-portrait-outline", color: "#16A34A" },
  { id: "card", name: "Debit/Credit Card", icon: "card-outline", color: "#3B82F6" },
  { id: "netbanking", name: "Net Banking", icon: "business-outline", color: "#8B5CF6" },
  { id: "cod", name: "Cash on Delivery", icon: "cash-outline", color: "#F59E0B" },
];

export default function WristbandPaymentScreen({ navigation, route }) {
  const { orderId, amount, userId, userName, userEmail } = route.params || {};
  const [selected, setSelected] = useState("");
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    if (!selected) { Alert.alert("Error", "Please select a payment method"); return; }

    if (selected === "cod") {
      // COD - directly mark as placed
      try {
        await axios.post(`${BASE_URL}/api/wristband/payment`, {
          orderId, paymentMethod: "cod",
        });
        Alert.alert("Order Placed! 🎉", "Your wristband will be delivered soon. Pay on delivery.", [
          { text: "OK", onPress: () => navigation.navigate("WristbandOrdersScreen", { userId, userName, userEmail }) }
        ]);
      } catch (err) {
        Alert.alert("Error", "Failed to process. Try again.");
      }
      return;
    }

    setProcessing(true);
    try {
      // Simulate payment processing
      await new Promise(r => setTimeout(r, 2000));

      const res = await axios.post(`${BASE_URL}/api/wristband/payment`, {
        orderId, paymentMethod: selected,
      });

      setProcessing(false);

      if (res.data.success) {
        Alert.alert("Payment Successful! 🎉", "Your HealthMonitor Pro wristband order is confirmed!", [
          { text: "View Orders", onPress: () => navigation.navigate("WristbandOrdersScreen", { userId, userName, userEmail }) }
        ]);
      } else {
        Alert.alert("Payment Failed", res.data.message || "Try again");
      }
    } catch (err) {
      setProcessing(false);
      Alert.alert("Payment Failed", "Something went wrong. Please try again.");
    }
  };

  if (processing) {
    return (
      <View style={s.loadingC}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <ActivityIndicator size="large" color={C.secondary} />
        <Text style={s.loadingText}>Processing Payment...</Text>
        <Text style={s.loadingSubtext}>Please don't close the app</Text>
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
          <Text style={s.hdrT}>Payment</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Amount Card */}
        <View style={s.amountCard}>
          <Text style={s.amountLabel}>TOTAL PAYABLE</Text>
          <Text style={s.amountValue}>₹{amount}</Text>
          <View style={s.divider} />
          <Text style={s.amountDesc}>HealthMonitor Pro Wristband</Text>
        </View>

        {/* Payment Methods */}
        <Text style={s.sectionTitle}>Select Payment Method</Text>
        {PAYMENT_METHODS.map(m => (
          <TouchableOpacity key={m.id} style={[s.methodCard, selected === m.id && s.methodCardActive]}
            onPress={() => setSelected(m.id)}>
            <View style={[s.methodIcon, { backgroundColor: m.color }]}>
              <Ionicons name={m.icon} size={22} color="#fff" />
            </View>
            <Text style={s.methodName}>{m.name}</Text>
            <View style={[s.radio, selected === m.id && s.radioActive]}>
              {selected === m.id && <View style={s.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        {selected === "cod" && (
          <View style={s.codInfo}>
            <Ionicons name="information-circle-outline" size={18} color={C.warning} />
            <Text style={s.codText}>Pay ₹{amount} in cash when the wristband is delivered.</Text>
          </View>
        )}
      </ScrollView>

      {/* Pay Button */}
      <View style={s.footer}>
        <TouchableOpacity style={[s.payBtn, !selected && s.payBtnDisabled]}
          onPress={handlePay} disabled={!selected}>
          <Text style={s.payBtnText}>
            {selected === "cod" ? `Place Order · ₹${amount}` : `Pay ₹${amount}`}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
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

  amountCard: {
    backgroundColor: C.card, borderRadius: 20, padding: 24, alignItems: "center",
    marginBottom: 24, elevation: 4, shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  amountLabel: { fontSize: 12, color: C.textSecondary, fontWeight: "600", letterSpacing: 1 },
  amountValue: { fontSize: 36, fontWeight: "800", color: C.primary, marginVertical: 8 },
  divider: { width: '100%', height: 1, backgroundColor: C.cardBorder, marginVertical: 12 },
  amountDesc: { fontSize: 14, color: C.textSecondary },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 16 },

  methodCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.card,
    padding: 16, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.cardBorder, elevation: 2,
  },
  methodCardActive: { borderColor: C.secondary, backgroundColor: C.lightTeal },
  methodIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 16 },
  methodName: { flex: 1, fontSize: 16, fontWeight: "600", color: C.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.textMuted, justifyContent: "center", alignItems: "center" },
  radioActive: { borderColor: C.secondary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.secondary },

  codInfo: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.warningBg,
    padding: 14, borderRadius: 12, gap: 8, marginTop: 4, borderWidth: 1, borderColor: "#FFE8B3",
  },
  codText: { fontSize: 13, color: C.warning, fontWeight: "600", flex: 1 },

  footer: {
    padding: 22, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.cardBorder,
    elevation: 10,
  },
  payBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: C.primary, paddingVertical: 18, borderRadius: 15, gap: 10,
    elevation: 4,
  },
  payBtnDisabled: { backgroundColor: C.textMuted, elevation: 0 },
  payBtnText: { color: "#fff", fontSize: 18, fontWeight: "700" },

  loadingC: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },
  loadingText: { marginTop: 16, fontSize: 18, color: C.text, fontWeight: "700" },
  loadingSubtext: { marginTop: 6, fontSize: 13, color: C.textSecondary },
});
