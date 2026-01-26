import React, { useState, useEffect } from "react";
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
  Modal,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GOOGLE_CLIENT_ID } from "../config/GoogleAuthConfig";
import { useAuth } from "../context/AuthContext";

// Required for web browser auth
WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("patient");
  const [loading, setLoading] = useState(false);

  // Google Auth states
  const [googleUser, setGoogleUser] = useState(null);
  const [showUserTypeModal, setShowUserTypeModal] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState("patient");

  const { login } = useAuth();

  // Google Auth Request
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID,
  });

  // Handle Google Auth Response
  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      fetchGoogleUserInfo(authentication.accessToken);
    }
  }, [response]);

  const fetchGoogleUserInfo = async (accessToken) => {
    try {
      setLoading(true);
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const userInfo = await userInfoResponse.json();
      console.log("Google User Info:", userInfo);

      // Store google user info and show user type selection
      setGoogleUser({
        name: userInfo.name,
        email: userInfo.email,
        googleId: userInfo.id,
        picture: userInfo.picture,
      });
      setShowUserTypeModal(true);
    } catch (error) {
      console.error("Error fetching Google user info:", error);
      Alert.alert("Error", "Failed to get Google user info");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    if (!googleUser) return;

    setLoading(true);
    try {
      const response = await axios.post("http://10.80.34.90:5000/auth/google", {
        name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.googleId,
        picture: googleUser.picture,
        userType: selectedUserType,
      });

      if (response.data.success) {
        setShowUserTypeModal(false);

        // Save to AuthContext
        login({
          userId: response.data.userId,
          name: response.data.name,
          email: response.data.email,
          userType: response.data.userType,
          profileCompleted: response.data.profileCompleted || false,
        });

        // Navigate based on profile completion
        if (!response.data.profileCompleted) {
          if (selectedUserType === "patient") {
            navigation.replace("PatientProfileCompletion", { email: googleUser.email });
          } else {
            navigation.replace("ServiceProviderProfileCompletion", { email: googleUser.email });
          }
        } else {
          if (selectedUserType === "patient") {
            navigation.replace("PatientDashboard", {
              userName: response.data.name,
              userId: response.data.userId,
              userEmail: response.data.email,
            });
          } else {
            navigation.replace("ServiceProviderDashboard", {
              userName: response.data.name,
              userId: response.data.userId,
              userEmail: response.data.email,
            });
          }
        }
      } else {
        Alert.alert("Error", response.data.message);
      }
    } catch (error) {
      console.error("Google register error:", error);
      Alert.alert("Error", "Failed to register with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      const response = await axios.post("http://10.80.34.90:5000/register", {
        name,
        email,
        password,
        userType,
      });

      if (response.data.success) {
        Alert.alert("Success", response.data.message);
        navigation.navigate("OtpVerifyScreen", {
          email: email,
          userType: userType
        });
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

          {/* Google Sign In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => {
              if (GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com") {
                Alert.alert(
                  "Setup Required",
                  "Please configure your Google Client ID in config/GoogleAuthConfig.js"
                );
                return;
              }
              promptAsync();
            }}
            disabled={loading || !request}
          >
            <Image
              source={{ uri: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" }}
              style={styles.googleIcon}
            />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

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

      {/* User Type Selection Modal for Google Sign-In */}
      <Modal
        visible={showUserTypeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUserTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Welcome, {googleUser?.name}!</Text>
            <Text style={styles.modalSubtitle}>Please select your account type:</Text>

            <TouchableOpacity
              style={[
                styles.userTypeOption,
                selectedUserType === "patient" && styles.userTypeSelected,
              ]}
              onPress={() => setSelectedUserType("patient")}
            >
              <Text style={styles.userTypeIcon}>🏥</Text>
              <Text style={styles.userTypeText}>Patient</Text>
              <Text style={styles.userTypeDesc}>Book equipment & consultations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.userTypeOption,
                selectedUserType === "service provider" && styles.userTypeSelected,
              ]}
              onPress={() => setSelectedUserType("service provider")}
            >
              <Text style={styles.userTypeIcon}>🛠️</Text>
              <Text style={styles.userTypeText}>Service Provider</Text>
              <Text style={styles.userTypeDesc}>Provide equipment & services</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleGoogleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.continueButtonText}>Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowUserTypeModal(false);
                setGoogleUser(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1188e6" />
          <Text style={styles.loadingText}>Please wait...</Text>
        </View>
      )}
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
    paddingTop: 50,
    paddingBottom: 60,
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  heading: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#000",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 15,
    elevation: 2,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ccc",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#666",
    fontWeight: "500",
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 25,
    width: "100%",
    maxWidth: 350,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  userTypeOption: {
    width: "100%",
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  userTypeSelected: {
    borderColor: "#1188e6",
    backgroundColor: "#e6f2ff",
  },
  userTypeIcon: {
    fontSize: 28,
    textAlign: "center",
    marginBottom: 5,
  },
  userTypeText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
  },
  userTypeDesc: {
    fontSize: 12,
    textAlign: "center",
    color: "#666",
    marginTop: 3,
  },
  continueButton: {
    width: "100%",
    backgroundColor: "#1188e6",
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 15,
    alignItems: "center",
  },
  continueButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 10,
    padding: 10,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 14,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#333",
    fontSize: 16,
  },
});