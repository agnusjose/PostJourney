import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ImageBackground, Image, Platform
} from "react-native";
import axios from "axios";

export default function AdminLoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  // Choose correct base URL for your environment:
  // Android emulator -> "http://10.0.2.2:5000"
  // Real device (same WiFi) -> "http://172.16.229.212:5000"
  // iOS simulator -> "http://localhost:5000"
const BASE_URL = "http://192.168.245.72:5000";

  const handleAdminLogin = async () => {
  console.log("ADMIN LOGIN CLICKED");

  setErrorMessage(""); // clear previous errors

  if (!email || !password) {
    setErrorMessage("Email and password are required.");
    return;
  }

  try {
    const response = await axios.post(`${BASE_URL}/admin/login`, {
      secretKey: "POSTJOURNEY2024",
      email,
      password,
    });

    console.log("ADMIN LOGIN RESPONSE:", response.data);

    if (!response.data.success) {
      // SHOW ERROR ON SCREEN
      setErrorMessage(response.data.message || "Invalid credentials");
      return;
    }

    // SUCCESS — navigate to admin panel
navigation.reset({
  index: 0,
  routes: [{ name: "AdminStackNavigator" }],
});

  } catch (err) {
    console.log("ADMIN LOGIN ERROR:", err);
    setErrorMessage("Server error. Unable to connect.");
  }
};



  return (
    <ImageBackground source={require("../assets/pjlogo_bg.png")} style={styles.bg} resizeMode="cover">
      <View style={styles.container}>
        <Image source={require("../assets/postjourney_logo.png")} style={styles.logo} />
        <Text style={styles.title}>Admin Login</Text>

        <TextInput
          placeholder="Admin Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          style={styles.input}
          placeholderTextColor="#555"
        />

        <TextInput
          placeholder="Admin Password"
          value={password}
          secureTextEntry
          onChangeText={setPassword}
          style={styles.input}
          placeholderTextColor="#555"
        />
        {errorMessage ? (
  <Text style={{ color: "red", marginBottom: 10, fontSize: 14 }}>
    {errorMessage}
  </Text>
) : null}

        <TouchableOpacity style={styles.button} onPress={handleAdminLogin}>
          <Text style={styles.buttonText}>LOGIN</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 20, alignItems: "center" },
  logo: { width: 140, height: 140, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  input: { width: "100%", backgroundColor: "rgba(255,255,255,0.9)", padding: 12, borderRadius: 8, marginBottom: 15, fontSize: 16, elevation: 2 },
  button: { width: "100%", backgroundColor: "#0066cc", paddingVertical: 15, borderRadius: 8, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
});