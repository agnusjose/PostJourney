import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
} from "react-native";

export default function PatientDashboard({ navigation }) {
  return (
    <ImageBackground
      source={require("../assets/pjlogo_bg.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Patient Dashboard</Text>

        {/* Medical Demonstrations */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("MedicalVideos")}
        >
          <Text style={styles.buttonText}>Medical Demonstrations</Text>
        </TouchableOpacity>

        {/* NEW: Exercise Monitoring */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("ExercisesDashboard")}
        >
          <Text style={styles.buttonText}>Exercise Monitoring</Text>
        </TouchableOpacity>

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