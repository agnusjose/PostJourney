import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Video } from "expo-av";

export default function LegRaiseDemo({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leg Strengthening Exercise</Text>

      <Video
        source={require("../../assets/exercise_demos/leg_raise_demo.mp4")}
        style={styles.video}
        resizeMode="contain"
        shouldPlay
        isLooping
      />

      <Text style={styles.instructions}>
        • Lie on your back{"\n"}
        • Keep one leg straight{"\n"}
        • Slowly raise the leg up{"\n"}
        • Hold and lower with control
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("LegRaiseMonitor")}
      >
        <Text style={styles.buttonText}>Start Exercise</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
  video: { width: "100%", height: 250, marginVertical: 20 },
  instructions: { fontSize: 16, marginVertical: 15 },
  button: {
    backgroundColor: "#1188e6",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
