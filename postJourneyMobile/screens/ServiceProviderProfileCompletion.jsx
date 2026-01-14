import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";

export default function ServiceProviderProfileCompletion({ route, navigation }) {
  const { email } = route.params;
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    agencyName: "",
    serviceType: "equipment",
    phoneNumber: "",
    city: "",
  });

  const handleSubmit = async () => {
    if (!formData.agencyName || !formData.phoneNumber || !formData.city) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (formData.phoneNumber.length !== 10) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    
    try {
      const response = await axios.post(
        "http://192.168.245.72:5000/api/service-provider/complete-profile",
        {
          email,
          agencyName: formData.agencyName,
          serviceType: formData.serviceType,
          phoneNumber: formData.phoneNumber,
          city: formData.city,
        }
      );

      console.log("Profile response:", response.data);

      if (response.data.success) {
        Alert.alert(
          "Profile Completed!",
          "You can now login to your account.",
          [
            {
              text: "Go to Login",
              onPress: () => navigation.replace("LoginScreen"),
            },
          ]
        );
      } else {
        Alert.alert("Error", response.data.message || "Failed to save profile");
      }
    } catch (error) {
      console.error("Submit error:", error);
      Alert.alert(
        "Error", 
        error.response?.data?.message || 
        error.message || 
        "Failed to save profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Welcome! Please provide a few details</Text>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Agency/Company Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your agency name"
          value={formData.agencyName}
          onChangeText={(text) => setFormData({...formData, agencyName: text})}
        />

        <Text style={styles.label}>Service Type *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.serviceType}
            onValueChange={(value) => setFormData({...formData, serviceType: value})}
            style={styles.picker}
          >
            <Picker.Item label="Medical Equipment Provider" value="equipment" />
            <Picker.Item label="Caregiver Service Provider" value="caregiver" />
          </Picker>
        </View>

        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="10-digit phone number"
          keyboardType="phone-pad"
          maxLength={10}
          value={formData.phoneNumber}
          onChangeText={(text) => setFormData({...formData, phoneNumber: text})}
        />

        <Text style={styles.label}>City *</Text>
        <TextInput
          style={styles.input}
          placeholder="Your city"
          value={formData.city}
          onChangeText={(text) => setFormData({...formData, city: text})}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Saving...' : 'Complete Profile'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        After completing your profile, you will be redirected to login.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
  },
  formSection: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  submitButton: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  submitButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  note: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 20,
  },
});