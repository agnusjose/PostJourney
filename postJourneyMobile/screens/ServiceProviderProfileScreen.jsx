import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import axios from "axios";

export default function ServiceProviderProfileScreen({ route, navigation }) {
  const { userEmail } = route.params;

  const [serviceName, setServiceName] = useState("");
  const [phone, setPhone] = useState("");

  const BASE_URL = "http://192.168.245.72:5000";

  const handleSubmit = async () => {
    if (!serviceName || !phone) {
      Alert.alert("Error", "All fields required");
      return;
    }

    try {
      await axios.put(`${BASE_URL}/service-provider/complete-profile`, {
        email: userEmail,
        serviceName,
        phone,
      });

      Alert.alert("Success", "Profile completed");

      navigation.replace("ServiceProviderDashboard", { userEmail });
    } catch {
      Alert.alert("Error", "Unable to save details");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete Your Profile</Text>

      <TextInput
        placeholder="Service Name"
        value={serviceName}
        onChangeText={setServiceName}
        style={styles.input}
      />

      <TextInput
        placeholder="Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={{ color: "white" }}>SAVE & CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { borderWidth: 1, padding: 12, marginBottom: 15, borderRadius: 8 },
  button: { backgroundColor: "#1188e6", padding: 14, borderRadius: 8, alignItems: "center" },
});