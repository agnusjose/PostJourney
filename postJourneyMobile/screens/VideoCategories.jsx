import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
} from "react-native";

export default function VideoCategories({ navigation }) {
  const categories = [
    { label: "First Aid", value: "first-aid" },
    { label: "Physiotherapy", value: "physiotherapy" },
    { label: "Recovery", value: "recovery" },
    { label: "Mental Health", value: "mental-health" },
    { label: "Cardiology", value: "cardiology" },
  ];

  return (
    <ImageBackground
      source={require("../assets/pjlogo_bg.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Medical Demonstrations</Text>

        {categories.map((cat, index) => (
          <TouchableOpacity
            key={index}
            style={styles.button}
            onPress={() =>
              navigation.navigate("VideoList", { category: cat.value })
            }
          >
            <Text style={styles.buttonText}>{cat.label}</Text>
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
