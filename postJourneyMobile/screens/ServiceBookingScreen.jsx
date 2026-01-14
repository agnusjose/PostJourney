import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

export default function ServiceBookingScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Service Booking</Text>
      <Text style={styles.subtitle}>
        Choose the service you want to book
      </Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("PatientEquipmentList")}
      >
        <Text style={styles.cardIcon}>🧰</Text>
        <Text style={styles.cardText}>Equipment Booking</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          Alert.alert(
            "Coming Soon",
            "Caregiver booking will be available soon"
          )
        }
      >
        <Text style={styles.cardIcon}>👩‍⚕️</Text>
        <Text style={styles.cardText}>Caregiver Booking</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
    color: "#2C3E50",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 40,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 20,
    elevation: 4,
  },
  cardIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
});