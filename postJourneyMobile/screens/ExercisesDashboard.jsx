import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
} from "react-native";

export default function ExercisesDashboard({ navigation }) {
  const exercises = [
    { label: "Walking Exercise", value: "walking" },
    { label: "Breathing Exercise", value: "breathing" },
    { label: "Arm Mobility Exercise", value: "arm-mobility" },
    { label: "Leg Strengthening Exercise", value: "leg-strength" },
    { label: "Neck & Shoulder Rotation", value: "neck-rotation" },
    { label: "Bed Mobility Exercise", value: "bed-mobility" },
    { label: "Posture Correction Exercise", value: "posture" },
  ];

  const handleNavigation = (exercise) => {
    if (exercise === "bed-mobility") {
      navigation.navigate("BedMobilityDemo");
    }
    if (exercise === "leg-strength") {
      navigation.navigate("LegRaiseDemo");
    } else {
      // Placeholder for future exercises
      alert("This exercise will be added soon.");
    }
  };

  return (
    <ImageBackground
      source={require("../assets/pjlogo_bg.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Exercise Monitoring</Text>

        {exercises.map((ex, index) => (
          <TouchableOpacity
            key={index}
            style={styles.button}
            onPress={() => handleNavigation(ex.value)}
          >
            <Text style={styles.buttonText}>{ex.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    paddingHorizontal: 25,
    paddingTop: 70,
    paddingBottom: 60,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#000",
    textAlign: "center",
  },
  button: {
    width: "100%",
    backgroundColor: "#1188e6",
    paddingVertical: 16,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
