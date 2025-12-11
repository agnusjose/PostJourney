import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("patient");

  const handleRegister = async () => {
    try {
      const response = await axios.post("http://192.168.112.170:5000/register", {
        name,
        email,
        password,
        userType,
      });

      if (response.data.success) {
        Alert.alert("Success", response.data.message);
        navigation.navigate("LoginScreen");
      } else {
        Alert.alert("Error", response.data.message);
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/pjlogo_bg.png")}   
      style={styles.bg}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <Image
            source={require("../assets/postjourney_logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.heading}>Register</Text>

          {/* INPUTS */}
          <TextInput
            placeholder="Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholderTextColor="#444"
          />

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            style={styles.input}
            autoCapitalize="none"
            placeholderTextColor="#444"
          />

          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#444"
          />

          <Text style={styles.label}>User Type:</Text>

          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={userType}
              onValueChange={(v) => setUserType(v)}
              style={styles.picker}
            >
              <Picker.Item label="Patient" value="patient" />
              <Picker.Item label="Service Provider" value="service provider" />
            </Picker>
          </View>

          {/* REGISTER BUTTON */}
          <TouchableOpacity style={styles.button} onPress={handleRegister}>
            <Text style={styles.buttonText}>REGISTER</Text>
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity onPress={() => navigation.navigate("LoginScreen")}>
            <Text style={styles.loginLink}>
              Already have an account? Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AdminLoginScreen')}>
  <Text style={{ color: 'darkgreen', textAlign: 'center', marginTop: 10 }}>
    Admin Login
  </Text>
</TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
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

  logo: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },

  heading: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#000",
  },

  input: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },

  label: {
    width: "100%",
    fontSize: 15,
    marginBottom: 5,
    fontWeight: "600",
    color: "#0a3b4a",
  },

  pickerWrapper: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 8,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  picker: {
    height: 48,
    width: "100%",
  },

  button: {
    width: "100%",
    backgroundColor: "#1188e6",
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },

  loginLink: {
    marginTop: 20,
    color: "#0038a8",
    fontSize: 15,
    textDecorationLine: "underline",
  },
});
