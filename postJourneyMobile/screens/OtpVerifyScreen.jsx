import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import axios from "axios";

export default function OtpVerifyScreen({ route, navigation }) {
  const { email, userType } = route.params;

  const [otp, setOtp] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [timer, setTimer] = useState(40);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");

  const BASE_URL = "http://10.80.34.90:5000";

  useEffect(() => {
    console.log("OTP Screen loaded with params:", { email, userType });
    setDebugInfo(`Email: ${email}, UserType: ${userType}`);

    if (timer === 0) {
      setCanResend(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const handleVerifyOtp = async () => {
    console.log("Verify OTP clicked:", { email, otp, userType });
    setDebugInfo(`Verifying OTP: ${otp} for ${email}`);

    if (!otp) {
      Alert.alert("Error", "Please enter OTP");
      return;
    }

    if (otp.length !== 6) {
      Alert.alert("Error", "OTP must be 6 digits");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      console.log("Sending request to:", `${BASE_URL}/verify-otp`);
      const response = await axios.post(`${BASE_URL}/verify-otp`, {
        email,
        otp,
      });

      console.log("Server response:", response.data);
      setDebugInfo(`Response: ${JSON.stringify(response.data)}`);

      if (!response.data.success) {
        Alert.alert("Verification Failed", response.data.message || "Invalid OTP");
        setErrorMessage(response.data.message || "Invalid OTP");
        setLoading(false);
        return;
      }

      // ? SUCCESS - Navigate WITHOUT showing Alert first
      console.log("OTP verified successfully, navigating...");
      console.log("UserType for navigation:", userType);

      // Use setTimeout to ensure navigation happens after state updates
      setTimeout(() => {
        if (userType === 'patient') {
          console.log("Navigating to PatientProfileCompletion");
          navigation.replace("PatientProfileCompletion", { email });
        } else if (userType === 'service provider') {
          console.log("Navigating to ServiceProviderProfileCompletion");
          navigation.replace("ServiceProviderProfileCompletion", { email });
        } else {
          console.log("UserType not recognized, going to LoginScreen");
          navigation.replace("LoginScreen");
        }
      }, 100);

    } catch (err) {
      console.error("OTP Verification Error:", err);
      console.error("Error details:", err.response?.data || err.message);
      setDebugInfo(`Error: ${err.message}`);

      if (err.response) {
        Alert.alert("Server Error", err.response.data?.message || "Server error occurred");
        setErrorMessage(err.response.data?.message || "Server error occurred");
      } else if (err.request) {
        Alert.alert("Network Error", "Unable to connect to server. Check your internet connection.");
        setErrorMessage("Network error. Check connection.");
      } else {
        Alert.alert("Error", "Something went wrong. Please try again.");
        setErrorMessage("Something went wrong");
      }
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const response = await axios.post(`${BASE_URL}/resend-otp`, { email });

      if (!response.data.success) {
        Alert.alert("Error", response.data.message || "Failed to resend OTP");
        return;
      }

      setTimer(40);
      setCanResend(false);
      Alert.alert("Success", "New OTP sent to your email");
      setErrorMessage("");

    } catch (err) {
      console.error("Resend OTP Error:", err);
      Alert.alert("Error", "Unable to resend OTP");
    }
  };

  // Test navigation function
  const testNavigation = () => {
    console.log("Testing navigation directly...");
    if (userType === 'patient') {
      navigation.replace("PatientProfileCompletion", { email });
    } else {
      navigation.replace("ServiceProviderProfileCompletion", { email });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>
        OTP sent to {email}
      </Text>

      <Text style={styles.userType}>
        Registering as: {userType === 'patient' ? 'Patient' : 'Service Provider'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter 6-digit OTP"
        keyboardType="numeric"
        maxLength={6}
        value={otp}
        onChangeText={(text) => {
          setOtp(text.replace(/[^0-9]/g, ''));
          setErrorMessage("");
        }}
        editable={!loading}
      />

      {errorMessage ? (
        <Text style={styles.error}>{errorMessage}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerifyOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>VERIFY OTP</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.resendButton, !canResend && styles.resendDisabled]}
        onPress={handleResendOtp}
        disabled={!canResend || loading}
      >
        <Text style={[styles.resendText, { opacity: canResend ? 1 : 0.5 }]}>
          {canResend ? "Resend OTP" : `Resend OTP in ${timer}s`}
        </Text>
      </TouchableOpacity>

      {/* Debug Info */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          <Text style={styles.debugText}>{debugInfo}</Text>
          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => {
              console.log("Current state:", { email, otp, userType, loading, errorMessage });
              Alert.alert("Debug Info",
                `Email: ${email}\n` +
                `OTP: ${otp}\n` +
                `UserType: ${userType}\n` +
                `Loading: ${loading}\n` +
                `Error: ${errorMessage}`
              );
            }}
          >
            <Text style={styles.debugButtonText}>Show Debug Info</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
    color: "#1e293b",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 10,
    color: "#64748b",
    fontSize: 16,
  },
  userType: {
    textAlign: "center",
    marginBottom: 30,
    color: "#3b82f6",
    fontSize: 16,
    fontWeight: "600",
    backgroundColor: "#dbeafe",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 16,
    borderRadius: 12,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
    backgroundColor: "white",
    letterSpacing: 8,
  },
  button: {
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: "#94a3b8",
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  resendButton: {
    padding: 12,
    alignItems: "center",
  },
  resendDisabled: {
    opacity: 0.5,
  },
  resendText: {
    textAlign: "center",
    color: "#3b82f6",
    fontWeight: "600",
    fontSize: 15,
  },
  testButton: {
    backgroundColor: "#10b981",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  testButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  error: {
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 15,
    fontWeight: "500",
    backgroundColor: "#fee2e2",
    padding: 10,
    borderRadius: 8,
  },
  debugContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 5,
  },
  debugText: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 10,
  },
  debugButton: {
    backgroundColor: "#64748b",
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  debugButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});