import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { CameraView, Camera } from "expo-camera";

export default function BedMobilityMonitor() {
  const cameraRef = useRef(null);
  const intervalRef = useRef(null);

  const [hasPermission, setHasPermission] = useState(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Initializing camera…");
  const [feedback, setFeedback] = useState("Waiting for posture…");
  const [error, setError] = useState(null);

  /* ---------- Camera permission ---------- */
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === "granted");
      } catch {
        setError("Camera permission failed");
      }
    })();
  }, []);

  /* ---------- Frame capture + backend loop ---------- */
  useEffect(() => {
    if (!ready || !cameraRef.current) return;

    const sendFrame = async () => {
      try {
        if (Platform.OS === "web") {
          setStatus("Web mode active");
          setFeedback("Real-time pose runs on backend");
          return;
        }

        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.4,
          skipProcessing: true,
        });

        if (!photo?.base64) return;

        const res = await fetch("http://192.168.146.170:8000/pose/bed-mobility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: photo.base64,
            exercise: "bed_mobility",
          }),
        });

        const data = await res.json();

        if (!data.detected) {
          setStatus("No body detected");
          setFeedback("Please align your body in frame");
          return;
        }

        setStatus(`Stage: ${data.stage}`);
        setFeedback(data.feedback);
      } catch (e) {
        console.warn("Frame send error:", e.message);
      }
    };

    intervalRef.current = setInterval(sendFrame, 800);
    return () => clearInterval(intervalRef.current);
  }, [ready]);

  /* ---------- Permission states ---------- */
  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Requesting camera permission…</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>
          Camera permission denied. Enable it in settings.
        </Text>
      </View>
    );
  }

  /* ---------- Camera UI ---------- */
  return (
    <View style={{ flex: 1 }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="front"
        onCameraReady={() => {
          setReady(true);
          setStatus("Camera ready");
        }}
      />

      {!ready && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", marginTop: 10 }}>
            Initializing exercise monitor…
          </Text>
        </View>
      )}

      <View style={styles.overlay}>
        <Text style={styles.overlayText}>{status}</Text>
        <Text style={styles.overlaySub}>{feedback}</Text>
      </View>
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlay: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingVertical: 10,
  },
  overlayText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  overlaySub: {
    color: "#fff",
    fontSize: 14,
    marginTop: 4,
  },
});
