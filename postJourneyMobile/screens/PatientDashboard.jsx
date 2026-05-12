import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import UserAccountSwitcher from "../components/UserAccountSwitcher";
import { SERVER_CONFIG } from "../config/ServerConfig";
import axios from "axios";
import { connectToWristband } from "../services/WristbandBLEService";

const BASE_URL = SERVER_CONFIG.BASE_URL;

const { width } = Dimensions.get("window");

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  primary: "#0A5F7A",   // deep teal
  secondary: "#1D8FAB",   // teal
  accent: "#2EC4B6",   // mint
  surface: "#FFFFFF",
  bg: "#F0F6F9",
  textDark: "#0D2535",
  textMid: "#4A6B7C",
  textLight: "#8BA9B8",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  cardBorder: "#DBE8EE",
};

// ── YouTube helpers ────────────────────────────────────────────────────────────
const youtubeapi = "AIzaSyCmaXSuKlyQyZg8vbzq4gOkOb3IEisahD0";

// ── Quick Actions config ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    id: "videos",
    icon: "play-circle-outline",
    label: "Health Videos",
    sub: "Expert guidance",
    color: "#0A5F7A",
    bg: "#E6F3F7",
    screen: "MedicalVideos",
  },
  {
    id: "services",
    icon: "stethoscope",
    label: "Services",
    sub: "Book care services",
    color: "#7C3AED",
    bg: "#F3EEFF",
    screen: "ServiceBookingScreen",
  },
  {
    id: "consult",
    icon: "doctor",
    label: "Consult Doctor",
    sub: "Book a session",
    color: "#059669",
    bg: "#ECFDF5",
    screen: "PatientConsultations",
  },
  {
    id: "complaints",
    icon: "flag-outline",
    label: "Complaints",
    sub: "Submit feedback",
    color: "#DC6803",
    bg: "#FFF7ED",
    isComplaint: true,
  },
  {
    id: "health",
    icon: "heart-pulse",
    label: "Health History",
    sub: "Track your vitals",
    color: "#E11D48",
    bg: "#FFF1F2",
    screen: "PatientHealthHistory",
  },
];

// ── Main component ─────────────────────────────────────────────────────────────
export default function PatientDashboard({ navigation, route }) {
  const [videos, setVideos] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const { userName, userId, userEmail } = route.params;
  const { logout } = useAuth();

  // ── Wristband state ────────────────────────────────────────────
  const [hasDevice, setHasDevice] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [deviceLoading, setDeviceLoading] = useState(true);
  const [bleConnected, setBleConnected] = useState(false);
  const [bleScanning, setBleScanning] = useState(false);
  const [healthData, setHealthData] = useState({ heartRate: 0, spo2: 0, ax: 0, ay: 0, az: 0 });
  const [lastUpdated, setLastUpdated] = useState(null);
  const bleRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Throttle: hold latest raw reading, flush to UI every 5 seconds
  const latestRawData = useRef(null);
  const throttleTimer = useRef(null);

  // Pulse animation for heart rate
  useEffect(() => {
    if (bleConnected && healthData.heartRate > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 300, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [bleConnected, healthData.heartRate]);

  // Check if patient has a delivered wristband or active order
  const checkDevice = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/wristband/has-device/${userId}`);
      if (res.data.success) {
        setHasDevice(res.data.hasDevice);
        setActiveOrder(res.data.activeOrder || null);
      }
    } catch (e) {
      console.log("Device check error:", e.message);
    } finally {
      setDeviceLoading(false);
    }
  };

  const handleCancelOrder = () => {
    if (!activeOrder) return;
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this wristband order?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await axios.put(`${BASE_URL}/api/wristband/order/${activeOrder._id}/cancel`, {
                reason: "Cancelled by patient from dashboard",
              });
              if (res.data.success) {
                Alert.alert("Cancelled", "Your order has been cancelled.");
                setActiveOrder(null);
                checkDevice();
              } else {
                Alert.alert("Error", res.data.message);
              }
            } catch (e) {
              Alert.alert("Error", "Failed to cancel order.");
            }
          },
        },
      ]
    );
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending": return "Order Placed";
      case "confirmed": return "Confirmed";
      case "shipped": return "Shipped";
      case "out-for-delivery": return "Out for Delivery";
      default: return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending": return "clock-outline";
      case "confirmed": return "check-circle-outline";
      case "shipped": return "truck-delivery-outline";
      case "out-for-delivery": return "bike-fast";
      default: return "clock-outline";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "#F59E0B";
      case "confirmed": return "#10B981";
      case "shipped": return "#3B82F6";
      case "out-for-delivery": return "#8B5CF6";
      default: return "#F59E0B";
    }
  };

  const getActivityLevel = (ax = 0, ay = 0, az = 0) => {
    // Magnitude of acceleration vector. At rest ≈ 1g (gravity).
    const magnitude = Math.sqrt(ax * ax + ay * ay + az * az);
    if (magnitude < 1.15) return { label: "Resting", color: "#10B981", bg: "#ECFDF5", icon: "sleep" };
    if (magnitude < 2.2)  return { label: "Light Activity", color: "#F59E0B", bg: "#FFFBEB", icon: "walk" };
    return                       { label: "Active", color: "#EF4444", bg: "#FEF2F2", icon: "run-fast" };
  };

  const handleBLEConnect = () => {
    if (bleConnected || bleScanning) {
      if (bleRef.current) {
        bleRef.current.disconnect();
        bleRef.current = null;
      }
      // Clear throttle timer
      if (throttleTimer.current) {
        clearInterval(throttleTimer.current);
        throttleTimer.current = null;
      }
      latestRawData.current = null;
      setBleConnected(false);
      setBleScanning(false);
      setHealthData({ heartRate: 0, spo2: 0, ax: 0, ay: 0, az: 0 });
      setLastUpdated(null);
      return;
    }

    // Start 2-second interval to flush buffered readings to UI
    // Every 3rd tick (6s), also POST to backend for doctor visibility
    const saveCount = { value: 0 };
    throttleTimer.current = setInterval(() => {
      if (latestRawData.current) {
        const data = latestRawData.current;
        setHealthData({
          heartRate: data.heartRate,
          spo2: data.spo2,
          ax: data.ax,
          ay: data.ay,
          az: data.az,
        });
        setLastUpdated(new Date());

        // Save to backend every ~6s
        saveCount.value++;
        if (saveCount.value >= 3) {
          saveCount.value = 0;
          axios.post(`${BASE_URL}/api/health-reading`, {
            patientId: userId,
            heartRate: data.heartRate,
            spo2: data.spo2,
            ax: data.ax,
            ay: data.ay,
            az: data.az,
          }).catch(() => {}); // fire-and-forget
        }

        latestRawData.current = null;
      }
    }, 1000);

    bleRef.current = connectToWristband(
      (data) => {
        // Buffer the latest reading — UI updates every 5s via the interval
        latestRawData.current = data;
        // Show first reading immediately so user doesn't wait
        if (!healthData.heartRate) {
          setHealthData({ heartRate: data.heartRate, spo2: data.spo2, ax: data.ax, ay: data.ay, az: data.az });
          setLastUpdated(new Date());
        }
      },
      (status) => {
        setBleConnected(status.connected);
        setBleScanning(status.scanning);
        if (!status.connected && !status.scanning) {
          // Disconnected — clear timer
          if (throttleTimer.current) {
            clearInterval(throttleTimer.current);
            throttleTimer.current = null;
          }
        }
        if (status.error) {
          Alert.alert("Wristband", status.message);
        }
      }
    );
  };

  // Cleanup BLE + throttle timer on unmount
  useEffect(() => {
    return () => {
      if (bleRef.current) bleRef.current.disconnect();
      if (throttleTimer.current) clearInterval(throttleTimer.current);
    };
  }, []);

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Good Morning" : currentHour < 16 ? "Good Afternoon" : "Good Evening";

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/notifications/${userId}`);
      if (res.data.success) {
        setNotifCount(res.data.unreadCount);
        setNotifications(res.data.notifications);
      }
    } catch (e) {
      console.log(
        "Notification fetch error:",
        e?.response?.status,
        e?.response?.config?.url || e?.message
      );
    }
  };

  const markRead = async (id) => {
    try {
      await axios.put(`${BASE_URL}/api/notifications/${id}/read`);
      fetchNotifications();
    } catch (e) { }
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${BASE_URL}/api/notifications/${userId}/read-all`);
      fetchNotifications();
    } catch (e) { }
  };

  useEffect(() => {
    fetchVideoTitles();
    fetchNotifications();
    checkDevice();
    const notifInterval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(notifInterval);
  }, []);

  const fetchVideoTitles = async () => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&videoDuration=medium&q=medical+rehabilitation+exercise+demonstration&key=${youtubeapi}`
      );
      const data = await response.json();
      if (!data.items) return;
      const shuffled = data.items.sort(() => 0.5 - Math.random()).slice(0, 5);
      setVideos(
        shuffled.map((item) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high.url,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        }))
      );
    } catch (error) {
      console.log("YouTube fetch error:", error);
    }
  };

  const openYoutube = async (url) => {
    try { await Linking.openURL(url); }
    catch { Alert.alert("Error", "Cannot open this video"); }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          navigation.replace("LoginScreen");
        },
      },
    ]);
  };

  const handleAction = (action) => {
    if (action.isComplaint) {
      navigation.navigate("ComplaintsScreen", { userId, userName, userType: "patient" });
    } else {
      navigation.navigate(action.screen, { userId, userName, userEmail });
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
        {/* top row */}
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.heroName}>{userName || "Patient"}</Text>
          </View>
          <View style={styles.heroRight}>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => { setNotifModalVisible(true); fetchNotifications(); }}
            >
              <View>
                <MaterialCommunityIcons name="bell-outline" size={26} color="#fff" />
                {notifCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>
                      {notifCount > 9 ? "9+" : notifCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() =>
                navigation.navigate("PatientProfileScreen", { userId, userEmail })
              }
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>
                  {(userName || "P").charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.profileBtnLabel}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Switcher */}
        <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
          <UserAccountSwitcher />
        </View>

        {/* Health status strip */}
        <View style={styles.statusStrip}>
          <View style={styles.statusItem}>
            <MaterialCommunityIcons name="heart-pulse" size={18} color={C.accent} />
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={styles.statusValue}>Active</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <MaterialCommunityIcons name="calendar-check" size={18} color={C.accent} />
            <Text style={styles.statusLabel}>Plan</Text>
            <Text style={styles.statusValue}>Recovery</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <MaterialCommunityIcons name="shield-check" size={18} color={C.accent} />
            <Text style={styles.statusLabel}>Care</Text>
            <Text style={styles.statusValue}>Verified</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Notifications Modal ──────────────────────────────────── */}
      <Modal visible={notifModalVisible} transparent animationType="slide" onRequestClose={() => setNotifModalVisible(false)}>
        <View style={styles.notifModalOverlay}>
          <View style={styles.notifModalContainer}>
            <View style={styles.notifModalHeader}>
              <Text style={styles.notifModalTitle}>Notifications</Text>
              <TouchableOpacity onPress={markAllRead}>
                <Text style={{ color: C.secondary, fontWeight: '700', fontSize: 13 }}>Mark all read</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={notifications}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.notifItem, !item.read && styles.notifItemUnread]}
                  onPress={() => markRead(item._id)}
                >
                  <MaterialCommunityIcons name={item.read ? "bell-check-outline" : "bell-ring-outline"} size={20} color={item.read ? C.textLight : C.secondary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.notifText, !item.read && { fontWeight: '700' }]}>{item.message}</Text>
                    <Text style={styles.notifTime}>{new Date(item.createdAt).toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30, color: C.textLight }}>No notifications</Text>}
            />
            <TouchableOpacity style={styles.notifCloseBtn} onPress={() => setNotifModalVisible(false)}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Wristband Section ──────────────────────────────────── */}
        {/* STATE 1: No order — Show promo banner */}
        {!deviceLoading && !hasDevice && !activeOrder && (
          <TouchableOpacity
            style={styles.wristbandBanner}
            onPress={() => navigation.navigate("WristbandProductScreen", { userId, userName, userEmail })}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#1E293B", "#334155"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.wristbandBannerGradient}
            >
              <View style={styles.wristbandBannerLeft}>
                <View style={styles.wristbandBannerIconWrap}>
                  <MaterialCommunityIcons name="watch" size={22} color="#38BDF8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wristbandBannerTitle}>HealthMonitor Pro</Text>
                  <Text style={styles.wristbandBannerSub}>
                    Track heart rate & SpO2 in real-time
                  </Text>
                </View>
              </View>
              <View style={styles.wristbandBannerRight}>
                <Text style={styles.wristbandBannerPrice}>₹500</Text>
                <View style={styles.wristbandShopBtn}>
                  <Text style={styles.wristbandShopBtnText}>Shop Now</Text>
                  <MaterialCommunityIcons name="arrow-right" size={14} color="#0A5F7A" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* STATE 2: Active order — Show order tracking card */}
        {!deviceLoading && !hasDevice && activeOrder && (
          <View style={styles.wristbandTrackingCard}>
            <View style={styles.wristbandTrackingHeader}>
              <View style={styles.wristbandReadingsHeaderLeft}>
                <MaterialCommunityIcons name="watch" size={18} color={C.primary} />
                <Text style={styles.wristbandReadingsTitle}>HealthMonitor Pro</Text>
              </View>
              <View style={[styles.wbStatusBadge, { backgroundColor: getStatusColor(activeOrder.status) }]}>
                <Text style={styles.wbStatusBadgeText}>
                  {getStatusLabel(activeOrder.status).toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Mini tracking stepper */}
            <View style={styles.wbMiniStepper}>
              {["pending", "confirmed", "shipped", "out-for-delivery", "delivered"].map((step, i) => {
                const steps = ["pending", "confirmed", "shipped", "out-for-delivery", "delivered"];
                const currentIdx = steps.indexOf(activeOrder.status);
                const isDone = i <= currentIdx;
                const isLast = i === steps.length - 1;
                return (
                  <View key={step} style={styles.wbStepContainer}>
                    <View style={[styles.wbStepDot, isDone && { backgroundColor: getStatusColor(activeOrder.status) }]}>
                      {isDone && <MaterialCommunityIcons name="check" size={10} color="#fff" />}
                    </View>
                    {!isLast && (
                      <View style={[styles.wbStepLine, i < currentIdx && { backgroundColor: getStatusColor(activeOrder.status) }]} />
                    )}
                  </View>
                );
              })}
            </View>
            <View style={styles.wbStepLabels}>
              <Text style={styles.wbStepLabelText}>Placed</Text>
              <Text style={styles.wbStepLabelText}>Confirmed</Text>
              <Text style={styles.wbStepLabelText}>Shipped</Text>
              <Text style={styles.wbStepLabelText}>On Way</Text>
              <Text style={styles.wbStepLabelText}>Delivered</Text>
            </View>

            {activeOrder.trackingInfo?.trackingNumber && (
              <View style={styles.wbTrackingRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color={C.textMid} />
                <Text style={styles.wbTrackingText}>
                  Tracking: {activeOrder.trackingInfo.trackingNumber}
                </Text>
              </View>
            )}

            <View style={styles.wbActionsRow}>
              <TouchableOpacity
                style={styles.wbOrderDetailsBtn}
                onPress={() => navigation.navigate("WristbandOrdersScreen", { userId, userName, userEmail })}
              >
                <MaterialCommunityIcons name="clipboard-text-outline" size={14} color={C.primary} />
                <Text style={styles.wbOrderDetailsBtnText}>View Details</Text>
              </TouchableOpacity>

              {["pending", "confirmed"].includes(activeOrder.status) && (
                <TouchableOpacity
                  style={styles.wbCancelBtn}
                  onPress={handleCancelOrder}
                >
                  <MaterialCommunityIcons name="close-circle-outline" size={14} color="#EF4444" />
                  <Text style={styles.wbCancelBtnText}>Cancel Order</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* STATE 3: Device delivered — Show connect + live readings */}
        {!deviceLoading && hasDevice && (
          <View style={styles.wristbandReadingsCard}>
            <View style={styles.wristbandReadingsHeader}>
              <View style={styles.wristbandReadingsHeaderLeft}>
                <MaterialCommunityIcons name="watch" size={18} color={C.primary} />
                <Text style={styles.wristbandReadingsTitle}>HealthMonitor Pro</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.bleConnectBtn,
                  bleConnected && styles.bleDisconnectBtn,
                  bleScanning && styles.bleScanningBtn,
                ]}
                onPress={handleBLEConnect}
              >
                {bleScanning ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name={bleConnected ? "bluetooth-off" : "bluetooth"}
                      size={14}
                      color={bleConnected ? "#fff" : C.primary}
                    />
                    <Text style={[
                      styles.bleConnectBtnText,
                      bleConnected && { color: "#fff" },
                    ]}>
                      {bleConnected ? "Disconnect" : "Connect"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.wristbandReadingsBody}>
              {/* Heart Rate */}
              <View style={styles.readingBox}>
                <Animated.View style={[
                  styles.readingIconWrap,
                  { backgroundColor: "#FEF2F2", transform: [{ scale: bleConnected ? pulseAnim : 1 }] },
                ]}>
                  <MaterialCommunityIcons name="heart-pulse" size={24} color="#EF4444" />
                </Animated.View>
                <Text style={styles.readingValue}>
                  {bleConnected ? (healthData.heartRate || "--") : "--"}
                </Text>
                <Text style={styles.readingUnit}>BPM</Text>
                <Text style={styles.readingLabel}>Heart Rate</Text>
              </View>

              {/* SpO2 */}
              <View style={styles.readingBox}>
                <View style={[styles.readingIconWrap, { backgroundColor: "#EFF6FF" }]}>
                  <MaterialCommunityIcons name="water-percent" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.readingValue}>
                  {bleConnected ? (healthData.spo2 || "--") : "--"}
                </Text>
                <Text style={styles.readingUnit}>%</Text>
                <Text style={styles.readingLabel}>SpO2</Text>
              </View>
            </View>

            {/* Activity Level from accelerometer */}
            {bleConnected && (() => {
              const act = getActivityLevel(healthData.ax, healthData.ay, healthData.az);
              return (
                <View style={[styles.activityRow, { backgroundColor: act.bg, borderColor: act.color + "40" }]}>
                  <View style={[styles.activityIconWrap, { backgroundColor: act.color + "20" }]}>
                    <MaterialCommunityIcons name={act.icon} size={18} color={act.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.activityLabel, { color: act.color }]}>{act.label}</Text>
                    <Text style={styles.activitySub}>
                      Activity · X:{healthData.ax?.toFixed(2)} Y:{healthData.ay?.toFixed(2)} Z:{healthData.az?.toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.activityBadge, { backgroundColor: act.color }]}>
                    <Text style={styles.activityBadgeText}>{act.label.toUpperCase()}</Text>
                  </View>
                </View>
              );
            })()}

            {/* Connection instructions (shown when not connected) */}
            {!bleConnected && !bleScanning && (
              <View style={styles.wbInstructionsBox}>
                <Text style={styles.wbInstructionsTitle}>How to Connect</Text>
                <View style={styles.wbInstructionRow}>
                  <View style={styles.wbInstructionNum}><Text style={styles.wbInstructionNumText}>1</Text></View>
                  <Text style={styles.wbInstructionText}>Turn on your HealthMonitor Pro wristband</Text>
                </View>
                <View style={styles.wbInstructionRow}>
                  <View style={styles.wbInstructionNum}><Text style={styles.wbInstructionNumText}>2</Text></View>
                  <Text style={styles.wbInstructionText}>Enable Bluetooth on your phone</Text>
                </View>
                <View style={styles.wbInstructionRow}>
                  <View style={styles.wbInstructionNum}><Text style={styles.wbInstructionNumText}>3</Text></View>
                  <Text style={styles.wbInstructionText}>Tap the "Connect" button above</Text>
                </View>
                <View style={styles.wbInstructionRow}>
                  <View style={styles.wbInstructionNum}><Text style={styles.wbInstructionNumText}>4</Text></View>
                  <Text style={styles.wbInstructionText}>Wait for pairing — readings will appear automatically</Text>
                </View>
              </View>
            )}

            {bleConnected && (
              <View style={styles.wbConnectedInfo}>
                <MaterialCommunityIcons name="check-circle" size={14} color="#10B981" />
                <Text style={styles.wbConnectedText}>
                  Connected — updates every 5s
                  {lastUpdated ? `  ·  Last: ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ""}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.wristbandOrdersLink}
              onPress={() => navigation.navigate("WristbandOrdersScreen", { userId, userName, userEmail })}
            >
              <MaterialCommunityIcons name="clipboard-list-outline" size={14} color={C.secondary} />
              <Text style={styles.wristbandOrdersLinkText}>View My Orders</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── AI Monitoring Card ───────────────────────────────────── */}
        <LinearGradient
          colors={["#0A5F7A", "#118698"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiCard}
        >
          <View style={styles.aiCardLeft}>
            <View style={styles.aiIconBadge}>
              <MaterialCommunityIcons name="brain" size={24} color="#fff" />
            </View>
            <View style={{ marginTop: 12 }}>
              <Text style={styles.aiCardTitle}>AI Exercise Monitor</Text>
              <Text style={styles.aiCardSub}>
                Real-time posture tracking & movement accuracy
              </Text>
            </View>
          </View>
          <View style={styles.aiButtonsCol}>
            <TouchableOpacity
              style={styles.aiStartBtn}
              onPress={() =>
                navigation.navigate("ExercisesDashboard", {
                  userId,
                })
              }
            >
              <MaterialCommunityIcons name="play" size={18} color={C.primary} />
              <Text style={styles.aiStartBtnText}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.aiReportBtn}
              onPress={() => navigation.navigate("DailyProgressScreen", { userId })}
            >
              <MaterialCommunityIcons name="chart-bar" size={16} color="#fff" />
              <Text style={styles.aiReportBtnText}>Reports</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── Quick Actions ────────────────────────────────────────── */}
        <SectionHeader title="Quick Actions" icon="lightning-bolt" />
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionCard}
              onPress={() => handleAction(action)}
              activeOpacity={0.82}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: action.bg }]}>
                <MaterialCommunityIcons name={action.icon} size={26} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionSub}>{action.sub}</Text>
              <View style={[styles.actionArrow, { backgroundColor: action.bg }]}>
                <MaterialCommunityIcons name="arrow-right" size={12} color={action.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Care Tip ─────────────────────────────────────────────── */}
        <View style={styles.tipCard}>
          <LinearGradient
            colors={["#E6F9F5", "#F0FBF9"]}
            style={styles.tipGradient}
          >
            <View style={styles.tipLeft}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={28} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Daily Care Tip</Text>
              <Text style={styles.tipText}>
                Perform exercises in a well-lit area. Proper lighting helps the AI track your joint angles with higher precision for better results.
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* ── Recommended Videos ───────────────────────────────────── */}
        {videos.length > 0 && (
          <>
            <SectionHeader title="Health Videos" icon="youtube" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.videoScroll}
              contentContainerStyle={{ paddingLeft: 4 }}
            >
              {videos.map((video) => (
                <TouchableOpacity
                  key={video.id}
                  style={styles.videoCard}
                  onPress={() => openYoutube(video.url)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: video.thumbnail }}
                    style={styles.videoThumb}
                  />
                  <View style={styles.playOverlay}>
                    <MaterialCommunityIcons name="play-circle" size={36} color="rgba(255,255,255,0.9)" />
                  </View>
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoText} numberOfLines={2}>
                      {video.title}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Logout ───────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout-variant" size={18} color={C.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>PostJourney Health · Your Recovery Partner</Text>
      </ScrollView>
    </View>
  );
}

// ── Small helper component ─────────────────────────────────────────────────────
function SectionHeader({ title, icon }) {
  return (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons name={icon} size={16} color={C.secondary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const CARD_W = (width - 48 - 12) / 2; // 2 cols, 24px padding each side, 12px gap

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Hero
  hero: {
    paddingTop: Platform.OS === "ios" ? 56 : StatusBar.currentHeight + 16,
    paddingBottom: 28,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  greeting: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  heroName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notifBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  profileBtn: { alignItems: "center" },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  avatarLetter: { fontSize: 18, fontWeight: "800", color: "#fff" },
  profileBtnLabel: { fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: "600" },

  // Status strip
  statusStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statusItem: { flex: 1, alignItems: "center", gap: 2 },
  statusDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  statusLabel: { fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "600", marginTop: 3 },
  statusValue: { fontSize: 12, color: "#fff", fontWeight: "700" },

  // Body
  body: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 50 },

  // AI Card
  aiCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderRadius: 20,
    padding: 20,
    marginBottom: 26,
    elevation: 6,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
  },
  aiCardLeft: { flex: 1, paddingRight: 12 },
  aiIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  aiCardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
    marginBottom: 5,
  },
  aiCardSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 17,
    fontWeight: "500",
  },
  aiStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 5,
  },
  aiStartBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: C.primary,
    letterSpacing: 0.3,
  },
  aiButtonsCol: {
    alignItems: "flex-end",
    gap: 8,
  },
  aiReportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  aiReportBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.textDark,
    letterSpacing: 0.2,
  },

  // Quick Actions grid
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 26,
  },
  actionCard: {
    width: CARD_W,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    elevation: 2,
    shadowColor: "#0D2535",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  actionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: C.textDark,
    marginBottom: 3,
    letterSpacing: 0.1,
  },
  actionSub: {
    fontSize: 11,
    color: C.textLight,
    fontWeight: "500",
    marginBottom: 12,
  },
  actionArrow: {
    width: 22,
    height: 22,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  // Tip card
  tipCard: {
    borderRadius: 18,
    marginBottom: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#C6EFE6",
  },
  tipGradient: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 14,
  },
  tipLeft: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065F46",
    marginBottom: 5,
    letterSpacing: 0.2,
  },
  tipText: {
    fontSize: 12,
    color: "#094d38",
    lineHeight: 18,
    fontWeight: "500",
  },

  // Videos
  videoScroll: { marginBottom: 26 },
  videoCard: {
    width: 200,
    backgroundColor: C.surface,
    borderRadius: 16,
    marginRight: 14,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#0D2535",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  videoThumb: { width: "100%", height: 110, backgroundColor: "#CBD5DC" },
  playOverlay: {
    position: "absolute",
    top: 37,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  videoInfo: { padding: 12 },
  videoText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textDark,
    lineHeight: 17,
  },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: "#FFF5F5",
    marginBottom: 16,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: C.danger },

  // Footer
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: C.textLight,
    fontWeight: "500",
    letterSpacing: 0.3,
  },

  // Notifications
  notifBadge: {
    position: 'absolute', top: -4, right: -6,
    backgroundColor: C.danger, borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  notifModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  notifModalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', padding: 20 },
  notifModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  notifModalTitle: { fontSize: 20, fontWeight: '800', color: C.textDark },
  notifItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  notifItemUnread: { backgroundColor: '#f0f9ff' },
  notifText: { fontSize: 13, color: C.textDark, lineHeight: 18 },
  notifTime: { fontSize: 10, color: C.textLight, marginTop: 4 },
  notifCloseBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },

  // Wristband Banner (ad for non-owners)
  wristbandBanner: { marginBottom: 18, borderRadius: 16, overflow: "hidden" },
  wristbandBannerGradient: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16,
  },
  wristbandBannerLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  wristbandBannerIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(56,189,248,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  wristbandBannerTitle: { fontSize: 14, fontWeight: "800", color: "#F8FAFC", letterSpacing: 0.2 },
  wristbandBannerSub: { fontSize: 11, color: "rgba(248,250,252,0.65)", marginTop: 2 },
  wristbandBannerRight: { alignItems: "flex-end", marginLeft: 8 },
  wristbandBannerPrice: { fontSize: 18, fontWeight: "800", color: "#38BDF8", marginBottom: 4 },
  wristbandShopBtn: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 3,
  },
  wristbandShopBtnText: { fontSize: 11, fontWeight: "700", color: "#0A5F7A" },

  // Wristband Live Readings (for owners)
  wristbandReadingsCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 18,
    borderWidth: 1, borderColor: C.cardBorder, elevation: 3,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10,
  },
  wristbandReadingsHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14,
  },
  wristbandReadingsHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  wristbandReadingsTitle: { fontSize: 15, fontWeight: "700", color: C.textDark },
  bleConnectBtn: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#E0F2F7",
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, gap: 5,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  bleDisconnectBtn: { backgroundColor: C.primary, borderColor: C.primary },
  bleScanningBtn: { backgroundColor: "#FFF7ED", borderColor: "#FDBA74" },
  bleConnectBtnText: { fontSize: 12, fontWeight: "700", color: C.primary },
  wristbandReadingsBody: { flexDirection: "row", gap: 12, marginBottom: 10 },
  readingBox: {
    flex: 1, backgroundColor: C.bg, borderRadius: 16, padding: 14,
    alignItems: "center", borderWidth: 1, borderColor: C.cardBorder,
  },
  readingIconWrap: {
    width: 44, height: 44, borderRadius: 22, justifyContent: "center",
    alignItems: "center", marginBottom: 8,
  },
  readingValue: { fontSize: 28, fontWeight: "800", color: C.textDark },
  readingUnit: { fontSize: 12, fontWeight: "600", color: C.textLight, marginTop: -2 },
  readingLabel: { fontSize: 11, fontWeight: "600", color: C.textMid, marginTop: 4 },
  wristbandHint: {
    fontSize: 11, color: C.textLight, textAlign: "center", marginTop: 4, fontStyle: "italic",
  },
  wristbandOrdersLink: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.cardBorder,
  },
  wristbandOrdersLinkText: { fontSize: 12, fontWeight: "600", color: C.secondary },

  // Wristband Order Tracking Card (STATE 2)
  wristbandTrackingCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 18,
    borderWidth: 1, borderColor: C.cardBorder, elevation: 3,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10,
  },
  wristbandTrackingHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
  },
  wbStatusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  wbStatusBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  wbMiniStepper: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginBottom: 6, paddingHorizontal: 4,
  },
  wbStepContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
  wbStepDot: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: "#E2E8F0",
    justifyContent: "center", alignItems: "center",
  },
  wbStepLine: { flex: 1, height: 3, backgroundColor: "#E2E8F0", marginHorizontal: 2, borderRadius: 2 },
  wbStepLabels: {
    flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 0,
  },
  wbStepLabelText: { fontSize: 9, color: C.textLight, fontWeight: "600", textAlign: "center", width: 52 },
  wbTrackingRow: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F0F6F9",
    padding: 10, borderRadius: 10, marginBottom: 12,
  },
  wbTrackingText: { fontSize: 12, color: C.textMid, fontWeight: "500" },
  wbActionsRow: { flexDirection: "row", gap: 10 },
  wbOrderDetailsBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#E0F2F7", paddingVertical: 11, borderRadius: 12, gap: 5,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  wbOrderDetailsBtnText: { fontSize: 13, fontWeight: "700", color: C.primary },
  wbCancelBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#FEF2F2", paddingVertical: 11, borderRadius: 12, gap: 5,
    borderWidth: 1, borderColor: "#FECACA",
  },
  wbCancelBtnText: { fontSize: 13, fontWeight: "700", color: "#EF4444" },

  // Connection Instructions (STATE 3)
  wbInstructionsBox: {
    backgroundColor: "#F0F6F9", borderRadius: 14, padding: 14, marginTop: 4, marginBottom: 6,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  wbInstructionsTitle: {
    fontSize: 13, fontWeight: "700", color: C.textDark, marginBottom: 10,
  },
  wbInstructionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  wbInstructionNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: C.primary,
    justifyContent: "center", alignItems: "center",
  },
  wbInstructionNumText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  wbInstructionText: { fontSize: 12, color: C.textMid, fontWeight: "500", flex: 1 },
  wbConnectedInfo: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ECFDF5",
    padding: 10, borderRadius: 10, marginTop: 4, marginBottom: 4,
    borderWidth: 1, borderColor: "#A7F3D0",
  },
  wbConnectedText: { fontSize: 12, color: "#059669", fontWeight: "600", flex: 1 },

  // Activity Level (Accelerometer)
  activityRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderRadius: 14, marginBottom: 8,
    borderWidth: 1,
  },
  activityIconWrap: {
    width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center",
  },
  activityLabel: { fontSize: 13, fontWeight: "700" },
  activitySub: { fontSize: 10, color: C.textLight, marginTop: 2, fontFamily: "monospace" },
  activityBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  activityBadgeText: { fontSize: 9, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
});
