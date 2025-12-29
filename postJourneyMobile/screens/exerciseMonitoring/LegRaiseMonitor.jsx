import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { CameraView, Camera } from "expo-camera";

export default function LegRaiseMonitor() {
  const cameraRef = useRef(null);
  const lastFeedback = useRef("");

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
          quality: 0.35,
          skipProcessing: true,
        });

        if (!photo?.base64) return;

        const res = await fetch("http://192.168.146.170:8000/pose/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: photo.base64,
            exercise: "leg_raise",
          }),
        });

        const data = await res.json();

        if (data.feedback && data.feedback !== lastFeedback.current) {
          lastFeedback.current = data.feedback;
          setFeedback(data.feedback);
        }

        if (data.angle !== null) {
          setAngle(`${data.angle}°`);
        } else {
          setAngle(null);
        }
      } catch (e) {}
    }, 900); // slower = more stable

    return () => clearInterval(interval);
  }, [ready]);

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        ref={cameraRef}
        facing="front"
        style={{ flex: 1 }}
        onCameraReady={() => setReady(true)}
      />

      {!ready && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff" }}>Starting camera…</Text>
        </View>
      )}

      <View style={styles.overlay}>
        <Text style={styles.feedback}>{feedback}</Text>
        {angle && <Text style={styles.angle}>Leg angle: {angle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 10,
  },
  feedback: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  angle: {
    color: "#fff",
    fontSize: 14,
    marginTop: 4,
  },
});
