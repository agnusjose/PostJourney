import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, SafeAreaView } from "react-native";
import { CameraView, Camera } from "expo-camera";

export default function LegRaiseMonitor() {
  const cameraRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [feedback, setFeedback] = useState("Align your full leg in view");
  const [angle, setAngle] = useState(null);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync();
  }, []);

  useEffect(() => {
    if (!ready || !cameraRef.current) return;

    const interval = setInterval(async () => {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.30, // Optimized for faster transmission
          skipProcessing: true,
        });

        if (!photo?.base64) return;

        const res = await fetch("http://192.168.245.72.1:8000/pose/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: photo.base64,
            exercise: "leg_raise",
          }),
        });

        const data = await res.json();

        if (data.feedback) setFeedback(data.feedback);
        if (data.angle !== null) setAngle(data.angle);
      } catch (e) {
        // Silent catch for production feel, or use a toast for debugging
      }
    }, 900);

    return () => clearInterval(interval);
  }, [ready]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />
      
      <CameraView
        ref={cameraRef}
        facing="front"
        style={StyleSheet.absoluteFillObject}
        onCameraReady={() => setReady(true)}
      />

      {/* AI HUD Overlay */}
      <SafeAreaView style={styles.hudContainer}>
        <View style={styles.feedbackCard}>
          <View style={styles.statusBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.statusText}>AI MONITORING ACTIVE</Text>
          </View>
          
          <Text style={styles.feedbackText}>{feedback}</Text>
          
          {angle !== null && (
            <View style={styles.angleContainer}>
              <Text style={styles.angleLabel}>LEG ANGLE</Text>
              <Text style={styles.angleValue}>{angle}°</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Loading State */}
      {!ready && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#7CB342" />
          <Text style={styles.loadingText}>Initializing AI Vision...</Text>
        </View>
      )}

      {/* Alignment Guide (Subtle corner brackets) */}
      <View style={styles.guideContainer} pointerEvents="none">
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  hudContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  feedbackCard: {
    backgroundColor: "rgba(44, 62, 80, 0.85)", // PostJourney Navy Transparent
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#7CB342", // Leaf Green
    marginRight: 8,
  },
  statusText: {
    color: "#7CB342",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  feedbackText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  angleContainer: {
    marginTop: 15,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    width: "100%",
    paddingTop: 10,
  },
  angleLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  angleValue: {
    color: "#1E88E5", // Sky Blue
    fontSize: 32,
    fontWeight: "900",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1C2833",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFF",
    marginTop: 15,
    fontSize: 16,
    fontWeight: "600",
  },
  guideContainer: {
    ...StyleSheet.absoluteFillObject,
    margin: 40,
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "rgba(124, 179, 66, 0.5)",
  },
  topLeft: { top: 0, left: 0, borderLeftWidth: 3, borderTopWidth: 3 },
  topRight: { top: 0, right: 0, borderRightWidth: 3, borderTopWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderLeftWidth: 3, borderBottomWidth: 3 },
  bottomRight: { bottom: 0, right: 0, borderRightWidth: 3, borderBottomWidth: 3 },
});