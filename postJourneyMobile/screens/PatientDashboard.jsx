import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  Alert,
  Dimensions,
} from "react-native";
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");

/* ===== YOUTUBE HELPERS ===== */
const youtubeapi = "AIzaSyCmaXSuKlyQyZg8vbzq4gOkOb3IEisahD0";

const getYoutubeVideoId = (url) => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const getYoutubeThumbnail = (videoId) =>
  `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

export default function PatientDashboard({ navigation, route }) {

  const [videos, setVideos] = useState([]);
  const { userName, userId, userEmail } = route.params;
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            navigation.replace("LoginScreen");
          },
        },
      ]
    );
  };

  const rawVideos = [
    "https://youtu.be/Hqe5Bk_suEA?si=-r4I3RbXwNQto7e3",
    "https://youtu.be/sFM-ip_WxTM?si=yP4-N9Z2WgeXaNz6",
  ];

  useEffect(() => {
    fetchVideoTitles();
  }, []);

  // Mock function to simulate fetching user data




  const fetchVideoTitles = async () => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&videoDuration=medium&q=medical+rehabilitation+exercise+demonstration&key=${youtubeapi}`
      );

      const data = await response.json();
      if (!data.items) return;

      // Shuffle results
      const shuffled = data.items.sort(() => 0.5 - Math.random());

      // Pick first 5
      const selected = shuffled.slice(0, 5);

      const formatted = selected.map((item) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }));

      setVideos(formatted);
    } catch (error) {
      console.log("YouTube fetch error:", error);
    }
  };

  console.log("ROUTE PARAMS:", route.params);


  const openYoutube = async (url) => {
    try { await Linking.openURL(url); }
    catch { Alert.alert("Error", "Cannot open this video"); }
  };

  return (
    <ImageBackground
      source={require("../assets/pjlogo_bg.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.welcome}>Welcome Back,</Text>
              <Text style={styles.userName}>
                {userName || "Loading..."}
              </Text>

            </View>
            <View style={styles.headerRight}>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active Plan</Text>
              </View>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => navigation.navigate("PatientProfileScreen", {
                  userId: userId,
                  userEmail: userEmail,
                })}
              >
                <Text style={styles.profileButtonText}>👤</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("MedicalVideos")}
                activeOpacity={0.7}
              >
                <View style={styles.iconCircle}>
                  <Image source={require("../assets/video1.jpeg")} style={styles.cardIcon} />
                </View>
                <Text style={styles.cardText}>Medical Videos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("ServiceBookingScreen")}
                activeOpacity={0.7}
              >



                <View style={styles.iconCircle}>
                  <Image source={require("../assets/exercise.jpeg")} style={styles.cardIcon} />
                </View>
                <Text style={styles.cardText}>Equipment Booking</Text>
              </TouchableOpacity>
            </View>

            {/* Second Row - Consult Doctor */}
            <View style={[styles.row, { marginTop: 16 }]}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("ConsultDoctor")}
                activeOpacity={0.7}
              >
                <View style={styles.iconCircle}>
                  <Image source={require("../assets/icon.png")} style={styles.cardIcon} />
                </View>
                <Text style={styles.cardText}>Consult a Doctor</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Today's Exercise */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today’s Session</Text>
            <View style={styles.previewCard}>
              <View style={styles.accentBar} />
              <Text style={styles.previewTitle}>Exercise Monitoring</Text>
              <Text style={styles.previewText}>
                AI-powered tracking for posture and movement accuracy.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate("ExercisesDashboard")}
              >
                <Text style={styles.primaryButtonText}>Start AI Monitoring</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recommended Videos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.videoList}>
              {videos.map((video) => (
                <TouchableOpacity
                  key={video.id}
                  style={styles.videoCard}
                  onPress={() => openYoutube(video.url)}
                >
                  <Image source={{ uri: video.thumbnail }} style={styles.videoThumb} />
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoText} numberOfLines={2}>{video.title}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Care Tip */}
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Text style={styles.tipTitle}>💡 Care Tip</Text>
            </View>
            <Text style={styles.tipText}>
              Perform exercises in a well-lit area. Proper lighting helps the AI track your joint angles with higher precision.
            </Text>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View >
    </ImageBackground >
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(245, 250, 255, 0.75)' },

  container: {
    paddingHorizontal: 22,
    paddingTop: 60,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },

  welcome: {
    fontSize: 15,
    color: "#5C768D", // Deep Blue-Grey
    fontWeight: "500",
  },

  userName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#2C3E50", // PostJourney Dark Navy
    letterSpacing: -0.5,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9', // Soft Green wash
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7CB342', // PostJourney Leaf Green
    marginRight: 6,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#388E3C',
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },

  profileButtonText: {
    fontSize: 18,
  },

  section: { marginBottom: 30 },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 16,
    color: "#2C3E50",
    letterSpacing: 0.2,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  card: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    shadowColor: "#2C3E50",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },

  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    resizeMode: "cover",
  },

  cardText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    color: "#34495E",
  },

  previewCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 22,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    overflow: 'hidden',
    position: 'relative',
  },

  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: '#1E88E5', // Blue accent to match logo
  },

  previewTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    color: "#2C3E50",
  },

  previewText: {
    fontSize: 14,
    color: "#5C768D",
    lineHeight: 22,
    marginBottom: 20,
  },

  primaryButton: {
    backgroundColor: "#1E88E5", // Matching the blue buttons in your screenshot
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#1E88E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  videoCard: {
    width: 210,
    backgroundColor: '#fff',
    borderRadius: 18,
    marginRight: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ECF0F1',
    elevation: 3,
  },

  videoThumb: {
    width: "100%",
    height: 115,
    backgroundColor: "#BDC3C7",
  },

  videoInfo: {
    padding: 12,
  },

  videoText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2C3E50",
    lineHeight: 19,
  },

  tipCard: {
    backgroundColor: "rgba(124, 179, 66, 0.1)", // Very light green tint
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 179, 66, 0.2)',
    borderStyle: 'dashed',
  },

  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  tipTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#388E3C",
  },

  tipText: {
    fontSize: 14,
    color: "#4F6F52",
    lineHeight: 22,
    fontWeight: "500",
  },

  logoutButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});