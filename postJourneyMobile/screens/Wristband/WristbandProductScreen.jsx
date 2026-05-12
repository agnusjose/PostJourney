import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, StatusBar, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const C = {
  primary: '#0A5F7A', secondary: '#1D8FAB', accent: '#2EC4B6',
  bg: '#F0F6F9', surface: '#FFFFFF', textDark: '#0D2535',
  textMid: '#4A6B7C', textLight: '#8BA9B8', success: '#10B981',
  cardBorder: '#DBE8EE', danger: '#EF4444',
};

const FEATURES = [
  { icon: "heart-pulse", title: "Heart Rate", desc: "Real-time BPM monitoring", color: "#EF4444", bg: "#FEF2F2" },
  { icon: "water-percent", title: "SpO2 Levels", desc: "Blood oxygen saturation", color: "#3B82F6", bg: "#EFF6FF" },
  { icon: "run-fast", title: "Accelerometer", desc: "Movement & activity tracking", color: "#8B5CF6", bg: "#F5F3FF" },
  { icon: "bluetooth", title: "BLE Connectivity", desc: "Seamless app pairing", color: "#06B6D4", bg: "#ECFEFF" },
  { icon: "battery-charging", title: "Long Battery", desc: "Up to 7 days on single charge", color: "#10B981", bg: "#ECFDF5" },
  { icon: "shield-check", title: "Medical Grade", desc: "Clinically accurate sensors", color: "#F59E0B", bg: "#FFFBEB" },
];

export default function WristbandProductScreen({ navigation, route }) {
  const { userId, userName, userEmail } = route.params || {};

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.secondary]} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>HealthMonitor Pro</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={s.imageCard}>
          <Image
            source={require("../../assets/wristband_product.png")}
            style={s.productImage}
            resizeMode="contain"
          />
          <View style={s.badgeRow}>
            <View style={s.badge}><Text style={s.badgeText}>🔥 Bestseller</Text></View>
            <View style={[s.badge, { backgroundColor: "#ECFDF5" }]}>
              <Text style={[s.badgeText, { color: C.success }]}>In Stock</Text>
            </View>
          </View>
        </View>

        {/* Product Info */}
        <View style={s.infoCard}>
          <Text style={s.productName}>HealthMonitor Pro Wristband</Text>
          <Text style={s.tagline}>Your Personal Health Companion</Text>
          <View style={s.priceRow}>
            <Text style={s.price}>₹500</Text>
            <Text style={s.mrp}>₹999</Text>
            <View style={s.discountBadge}>
              <Text style={s.discountText}>50% OFF</Text>
            </View>
          </View>
          <Text style={s.description}>
            Advanced wristband with real-time heart rate and SpO2 monitoring. 
            Connects instantly to your PostJourney app via Bluetooth to display 
            live health data on your dashboard. Perfect for post-operative recovery tracking.
          </Text>
        </View>

        {/* Features Grid */}
        <Text style={s.sectionTitle}>Features</Text>
        <View style={s.featuresGrid}>
          {FEATURES.map((f, i) => (
            <View key={i} style={s.featureCard}>
              <View style={[s.featureIcon, { backgroundColor: f.bg }]}>
                <MaterialCommunityIcons name={f.icon} size={24} color={f.color} />
              </View>
              <Text style={s.featureTitle}>{f.title}</Text>
              <Text style={s.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>

        {/* How it Works */}
        <Text style={s.sectionTitle}>How It Works</Text>
        <View style={s.stepsCard}>
          {[
            { step: "1", text: "Purchase the wristband from this page" },
            { step: "2", text: "Receive it at your doorstep" },
            { step: "3", text: "Wear it and tap 'Connect' on your dashboard" },
            { step: "4", text: "View live heart rate & SpO2 readings!" },
          ].map((item, i) => (
            <View key={i} style={s.stepRow}>
              <View style={s.stepCircle}>
                <Text style={s.stepNum}>{item.step}</Text>
              </View>
              <Text style={s.stepText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={s.bottomBar}>
        <View>
          <Text style={s.bottomPrice}>₹500</Text>
          <Text style={s.bottomSub}>Inclusive of all taxes</Text>
        </View>
        <TouchableOpacity
          style={s.buyBtn}
          onPress={() => navigation.navigate("WristbandCheckoutScreen", {
            userId, userName, userEmail,
          })}
        >
          <Text style={s.buyBtnText}>Buy Now</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const CARD_W = (width - 56) / 2;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingTop: 50, paddingBottom: 18, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },

  body: { paddingHorizontal: 22, paddingTop: 16 },

  imageCard: {
    backgroundColor: C.surface, borderRadius: 24, padding: 20, marginBottom: 16,
    alignItems: "center", elevation: 4, shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  productImage: { width: width - 100, height: 200, marginBottom: 12 },
  badgeRow: { flexDirection: "row", gap: 8 },
  badge: { backgroundColor: "#FFF7ED", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "700", color: "#DC6803" },

  infoCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 20,
    elevation: 3, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, borderWidth: 1, borderColor: C.cardBorder,
  },
  productName: { fontSize: 22, fontWeight: "800", color: C.textDark, marginBottom: 4 },
  tagline: { fontSize: 14, color: C.textMid, marginBottom: 12, fontWeight: "500" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  price: { fontSize: 28, fontWeight: "800", color: C.primary },
  mrp: { fontSize: 16, color: C.textLight, textDecorationLine: "line-through" },
  discountBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  discountText: { fontSize: 12, fontWeight: "700", color: "#16A34A" },
  description: { fontSize: 14, color: C.textMid, lineHeight: 21 },

  sectionTitle: { fontSize: 18, fontWeight: "800", color: C.textDark, marginBottom: 14, letterSpacing: 0.2 },

  featuresGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  featureCard: {
    width: CARD_W, backgroundColor: C.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.cardBorder, elevation: 2,
    shadowColor: "#0D2535", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  featureIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  featureTitle: { fontSize: 14, fontWeight: "700", color: C.textDark, marginBottom: 3 },
  featureDesc: { fontSize: 11, color: C.textLight, lineHeight: 15 },

  stepsCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 20,
    elevation: 3, borderWidth: 1, borderColor: C.cardBorder,
  },
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary,
    justifyContent: "center", alignItems: "center", marginRight: 14,
  },
  stepNum: { fontSize: 14, fontWeight: "800", color: "#fff" },
  stepText: { fontSize: 14, color: C.textDark, fontWeight: "500", flex: 1 },

  bottomBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: C.surface, paddingHorizontal: 22, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: C.cardBorder,
    elevation: 10, shadowColor: C.primary, shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  bottomPrice: { fontSize: 22, fontWeight: "800", color: C.primary },
  bottomSub: { fontSize: 11, color: C.textLight },
  buyBtn: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.primary,
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, gap: 8,
    elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  buyBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
