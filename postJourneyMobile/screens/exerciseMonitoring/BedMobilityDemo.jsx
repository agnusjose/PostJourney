import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Video } from "expo-av";

export default function BedMobilityDemo({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bed Mobility Exercise</Text>

      <Video
        source={require("../../assets/exercise_demos/leg_raise_demo.mp4")}
        style={styles.video}
        resizeMode="contain"
        shouldPlay
        isLooping
        useNativeControls={false}
      />

      <Text style={styles.instructions}>
        Watch the demo carefully.  
        Roll slowly using your shoulders and hips together.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("BedMobilityMonitor")}
      >
        <Text style={styles.buttonText}>Start Exercise</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  video: {
    width: "100%",
    height: 250,
    backgroundColor: "#000",
    borderRadius: 10,
  },
  instructions: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 20,
    color: "#333",
  },
  button: {
    backgroundColor: "#1188e6",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
