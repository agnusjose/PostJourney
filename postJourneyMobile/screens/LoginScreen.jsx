import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ImageBackground,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import axios from "axios";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

// In LoginScreen.js, update the handleLogin function:

const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert("Error", "Please enter both email and password.");
    return;
  }

  setLoading(true);

  try {
    const response = await axios.post(
      "http://192.168.245.72:5000/login",
      { email: email.toLowerCase().trim(), password }
    );
    
    const data = response.data;
    console.log("Full login response:", data);
    
    if (data.success) {
      // ✅ Get ALL data from response
      const { userType, name, email: userEmail, userId, profileCompleted } = data;

      console.log("Received data:", { 
        userType, 
        name, 
        userEmail, 
        userId,
        profileCompleted 
      });

      // ✅ Check if profile is completed
      if (!profileCompleted) {
        Alert.alert(
          "Profile Incomplete",
          "Please complete your profile first.",
          [
            {
              text: "Complete Profile",
              onPress: () => {
                if (userType === "patient") {
                  navigation.navigate("PatientProfileCompletion", { 
                    email: userEmail 
                  });
                } else {
                  navigation.navigate("ServiceProviderProfileCompletion", { 
                    email: userEmail 
                  });
                }
              }
            }
          ]
        );
        setLoading(false);
        return;
      }

      // ✅ NAVIGATION based on user type
      console.log("Navigating to dashboard for:", userType);
      
      if (userType === "patient") {
        navigation.navigate("PatientDashboard", {
          userId: userId || userEmail, // Use email as fallback
          userName: name,
          userEmail: userEmail,
        });

      } else if (userType === "service-provider") {
        navigation.navigate("ServiceProviderDashboard", {
          userId: userId || userEmail, // Use email as fallback
          userName: name,
          userEmail: userEmail,
        });
        
      } else {
        Alert.alert("Error", "Unknown user type: " + userType);
      }
    } else {
      Alert.alert("Login Failed", data.message || "Invalid login");
    }
  } catch (err) {
    console.error("Login error details:", {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status
    });
    
    Alert.alert(
      "Error", 
      err.response?.data?.message || err.message || "Something went wrong. Try again."
    );
  } finally {
    setLoading(false);
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
        <ScrollView contentContainerStyle={styles.container}>
          <Image
            source={require("../assets/postjourney_logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Login</Text>

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#333"
            style={styles.input}
          />

          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#333"
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Logging in…" : "LOGIN"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("RegisterScreen")}
          >
            <Text style={styles.registerText}>
              Don&apos;t have an account? Register
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
    marginBottom: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#000",
  },
  input: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    elevation: 2,
  },
  button: {
    width: "100%",
    backgroundColor: "#1188e6",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    elevation: 2,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  registerText: {
    marginTop: 20,
    color: "#0038a8",
    textDecorationLine: "underline",
    fontSize: 15,
  },
});