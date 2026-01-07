import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import axios from "axios";

export default function OtpVerifyScreen({ route, navigation }) {
  const { email } = route.params;

  const [otp, setOtp] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [timer, setTimer] = useState(40);
  const [canResend, setCanResend] = useState(false);

  const BASE_URL = "http://192.168.245.72:5000"; // change if needed

  // ⏱️ 40-second countdown
  useEffect(() => {
    if (timer === 0) {
      setCanResend(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (!otp) {
      setErrorMessage("Please enter OTP");
      return;
    }

    try {
      const response = await axios.post(`${BASE_URL}/verify-otp`, {
        email,
        otp,
      });

      if (!response.data.success) {
        setErrorMessage(response.data.message);
        return;
      }

      // ✅ Success → go to login
      navigation.replace("LoginScreen");

    } catch (err) {
      setErrorMessage("Server error. Try again.");
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    try {
      const response = await axios.post(`${BASE_URL}/resend-otp`, { email });

      if (!response.data.success) {
        setErrorMessage(response.data.message);
        return;
      }

      setTimer(40);
      setCanResend(false);
      setErrorMessage("New OTP sent to your email");

    } catch {
      setErrorMessage("Unable to resend OTP");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>
        OTP sent to {email}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter 6-digit OTP"
        keyboardType="numeric"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
      />

      {errorMessage ? (
        <Text style={styles.error}>{errorMessage}</Text>
      ) : null}

      <TouchableOpacity style={styles.button} onPress={handleVerifyOtp}>
        <Text style={styles.buttonText}>VERIFY OTP</Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={!canResend}
        onPress={handleResendOtp}
      >
        <Text style={[styles.resend, { opacity: canResend ? 1 : 0.5 }]}>
          {canResend
            ? "Resend OTP"
            : `Resend OTP in ${timer}s`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 20,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 14,
    borderRadius: 8,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#1188e6",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  resend: {
    textAlign: "center",
    color: "#1188e6",
    fontWeight: "600",
  },
  error: {
    color: "red",
    textAlign: "center",
    marginBottom: 10,
  },
});