import React from "react";
import { View, Text, Pressable, StyleSheet, TouchableOpacity } from "react-native";

export default function PatientDashboard({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Patient Dashboard</Text>

      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate("VideoCategories")}
      >
        <Text style={styles.cardText}>Medical Demonstrations</Text>
      </Pressable>
      <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("VideoCategories")}
      >
          <Text style={styles.buttonText}>Medical Demonstrations</Text>
      </TouchableOpacity>


      {/* Add more features here */}
      {/* Example: */}
      {/* 
      <Pressable style={styles.card}>
        <Text style={styles.cardText}>Appointments</Text>
      </Pressable>
      */}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { fontSize: 26, fontWeight: "bold", marginBottom: 30, textAlign: "center" },
  card: {
    padding: 20,
    backgroundColor: "#4A90E2",
    borderRadius: 12,
    marginVertical: 10,
  },
  cardText: { fontSize: 18, color: "#fff", textAlign: "center" },
});
