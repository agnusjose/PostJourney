import React, { useState, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions,
  StatusBar 
} from "react-native";
import { Video } from "expo-av";
import { EXERCISES } from "../../data/exercises";

const { width } = Dimensions.get("window");

export default function ExerciseDemoScreen({ route, navigation }) {
  const { exerciseKey } = route.params;
  const exercise = EXERCISES[exerciseKey];
  
  // State to handle dynamic video height based on aspect ratio
  const [videoHeight, setVideoHeight] = useState(250); // Default fallback
  const videoRef = useRef(null); // ref to enforce muted state

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>{exercise.title}</Text>
          <View style={styles.underline} />
          <Text style={styles.subtitle}>Watch the demonstration carefully</Text>
        </View>

        {/* Dynamic Video Player Frame */}
        <View style={[styles.videoWrapper, { height: videoHeight }]}>
          <Video
            ref={videoRef}
            source={exercise.video}
            style={styles.video}
            /* 'contain' with dynamic height ensures no black bars */
            resizeMode="contain"
            shouldPlay
            isLooping
            isMuted={true}         // always muted
            volume={0}             // ensure volume is zero
            onPlaybackStatusUpdate={(status) => {
              // Reinforce muted state in case controls or status change
              if (!status.isLoaded) return;
              if (!status.isMuted) {
                videoRef.current?.setIsMutedAsync(true).catch(() => {});
              }
            }}
            onReadyForDisplay={(event) => {
              // Calculate height based on video aspect ratio
              const { width: vidWidth, height: vidHeight } = event.naturalSize;
              const calculatedHeight = (vidHeight / vidWidth) * (width - 44); // 44 is total horizontal padding
              setVideoHeight(calculatedHeight);
            }}
          />
        </View>

        {/* Instructions Section */}
        <View style={styles.instructionCard}>
          <Text style={styles.sectionHeader}>How to perform:</Text>
          {exercise.instructions.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Start Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            navigation.navigate(exercise.monitorScreen, {
              rules: exercise.rules,
            })
          }
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Start Exercise</Text>
          <View style={styles.buttonIcon}>
             <Text style={styles.arrow}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Review Exercise List</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F8FAFC" 
  },
  scrollContainer: { 
    paddingHorizontal: 22, 
    paddingTop: 60, 
    paddingBottom: 40 
  },
  header: {
    alignItems: "center",
    marginBottom: 25,
  },
  title: { 
    fontSize: 24, 
    fontWeight: "800", 
    textAlign: "center",
    color: "#2C3E50",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#5C768D",
    marginTop: 8,
    fontWeight: "500",
  },
  underline: {
    width: 40,
    height: 4,
    backgroundColor: "#7CB342",
    borderRadius: 2,
    marginTop: 8,
  },
  videoWrapper: {
    width: "100%",
    // Using a soft background instead of pure black
    backgroundColor: "rgba(44, 62, 80, 0.05)", 
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  video: { 
    width: "100%", 
    height: "100%" 
  },
  instructionCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E1E8ED",
    marginBottom: 30,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: 15,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(124, 179, 66, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: "#388E3C",
    fontWeight: "bold",
    fontSize: 14,
  },
  stepText: { 
    flex: 1,
    fontSize: 15, 
    color: "#445", 
    lineHeight: 22,
    fontWeight: "500"
  },
  primaryButton: {
    backgroundColor: "#1E88E5",
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1E88E5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "700",
    marginRight: 10 
  },
  buttonIcon: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center"
  },
  arrow: {
    color: "#FFF",
    fontWeight: "bold"
  },
  backButton: {
    marginTop: 20,
    alignItems: "center"
  },
  backButtonText: {
    color: "#5C768D",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline"
  }
});