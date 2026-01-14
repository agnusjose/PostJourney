import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, StatusBar, SafeAreaView } from "react-native";
import { CameraView, Camera } from "expo-camera";
import { useNavigation } from "@react-navigation/native";

const SEQUENCE = [
  { key: "flexion", label: "Slowly lower your chin toward your chest" },
  { key: "left_rotation", label: "Turn your head to the left" },
  { key: "right_rotation", label: "Turn your head to the right" },
  { key: "extension", label: "Gently look upward" },
];

const MAX_ROUNDS = 10;

export default function NeckMobilityMonitor() {
  const cameraRef = useRef(null);
  const navigation = useNavigation();
  const [phase, setPhase] = useState("intro");
  const [ready, setReady] = useState(false);
  const [feedback, setFeedback] = useState(
    "Sit straight. Keep shoulders still.\nFollow the instructions on screen."
  );

  const stateRef = useRef({
    phase: "move",
    start_time: Date.now() / 1000,
    rounds: 0,
  });

  const stepRef = useRef(0);
  const [displayRounds, setDisplayRounds] = useState(0);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync();
    const timer = setTimeout(() => {
      setFeedback(SEQUENCE[0].label);
      setPhase("active");
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || !cameraRef.current || phase !== "active") return;

    const interval = setInterval(async () => {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.30,
          skipProcessing: true,
        });

        if (!photo?.base64) return;

        const currentStep = SEQUENCE[stepRef.current];

        const res = await fetch("http://192.168.245.72.72.1:8000/pose/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: photo.base64,
            exercise: "neck_mobility",
            expected_direction: currentStep.key,
            state: stateRef.current,
          }),
        });

        const data = await res.json();

        if (data.state) stateRef.current = data.state;
        setDisplayRounds(stateRef.current.rounds);

        if (data.feedback === null) return;

        if (data.completed) {
          stepRef.current += 1;

          if (stepRef.current >= SEQUENCE.length) {
            stepRef.current = 0;
            stateRef.current.rounds += 1;
            setDisplayRounds(stateRef.current.rounds);

            if (stateRef.current.rounds >= MAX_ROUNDS) {
              clearInterval(interval);
              navigation.replace("ExerciseCompleted");
              return;
            }
            setFeedback(`Round ${stateRef.current.rounds} complete! Continue.`);
          } else {
            setFeedback(SEQUENCE[stepRef.current].label);
          }
        } else if (data.feedback) {
          setFeedback(data.feedback);
        }
      } catch (err) {
        // Silent catch for clinical stability
      }
    }, 900);

    return () => clearInterval(interval);
  }, [ready, phase]);

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
          <View style={styles.headerRow}>
            <View style={styles.statusBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.statusText}>NECK MOBILITY AI</Text>
            </View>
            <View style={styles.roundBadge}>
              <Text style={styles.roundText}>ROUND {displayRounds}/{MAX_ROUNDS}</Text>
            </View>
          </View>
          
          <Text style={styles.feedbackText}>{feedback}</Text>

          {/* Progress Bar */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${(displayRounds / MAX_ROUNDS) * 100}%` }]} />
          </View>
        </View>
      </SafeAreaView>

      {/* Camera Loading State */}
      {!ready && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#7CB342" />
          <Text style={styles.loadingText}>Calibrating Sensors...</Text>
        </View>
      )}

      {/* Clinical Alignment Guides */}
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
  container: { flex: 1, backgroundColor: "#000" },
  hudContainer: { paddingHorizontal: 20, paddingTop: 40 },
  feedbackCard: {
    backgroundColor: "rgba(44, 62, 80, 0.85)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#7CB342",
    marginRight: 6,
  },
  statusText: {
    color: "#7CB342",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  roundBadge: {
    backgroundColor: "rgba(30, 136, 229, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(30, 136, 229, 0.4)",
  },
  roundText: {
    color: "#90CAF9",
    fontSize: 10,
    fontWeight: "bold",
  },
  feedbackText: {
    color: "#FFF",
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 26,
    minHeight: 52, // Keeps layout stable for 2 lines
  },
  progressBg: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    marginTop: 15,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: "#7CB342",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1C2833",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "#FFF", marginTop: 15, fontSize: 16, fontWeight: "600" },
  guideContainer: { ...StyleSheet.absoluteFillObject, margin: 40 },
  corner: { position: "absolute", width: 30, height: 30, borderColor: "rgba(124, 179, 66, 0.3)" },
  topLeft: { top: 0, left: 0, borderLeftWidth: 2, borderTopWidth: 2 },
  topRight: { top: 0, right: 0, borderRightWidth: 2, borderTopWidth: 2 },
  bottomLeft: { bottom: 0, left: 0, borderLeftWidth: 2, borderBottomWidth: 2 },
  bottomRight: { bottom: 0, right: 0, borderRightWidth: 2, borderBottomWidth: 2 },
});