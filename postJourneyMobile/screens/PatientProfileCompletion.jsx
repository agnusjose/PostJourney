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

export default function PatientProfileCompletion({ route, navigation }) {
  const { email } = route.params;
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    gender: "male",
    phoneNumber: "",
    city: "",
    primaryCondition: "",
  });

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.age || !formData.phoneNumber || !formData.city || !formData.primaryCondition) {
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
        "http://192.168.245.72:5000/api/patient/complete-profile",
        {
          email,
          fullName: formData.fullName,
          age: formData.age,
          gender: formData.gender,
          phoneNumber: formData.phoneNumber,
          city: formData.city,
          primaryCondition: formData.primaryCondition,
        }
      );

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
        Alert.alert("Error", response.data.message);
      }
    } catch (error) {
      console.error("Submit error:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete Your Health Profile</Text>
        <Text style={styles.subtitle}>Help us provide better care</Text>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={formData.fullName}
          onChangeText={(text) => setFormData({...formData, fullName: text})}
        />

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Age *</Text>
            <TextInput
              style={styles.input}
              placeholder="Age"
              keyboardType="numeric"
              value={formData.age}
              onChangeText={(text) => setFormData({...formData, age: text})}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Gender *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.gender}
                onValueChange={(value) => setFormData({...formData, gender: value})}
                style={styles.picker}
              >
                <Picker.Item label="Male" value="male" />
                <Picker.Item label="Female" value="female" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View>
          </View>
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

        <Text style={styles.label}>Primary Health Condition *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Knee pain, Back pain, Stroke recovery"
          value={formData.primaryCondition}
          onChangeText={(text) => setFormData({...formData, primaryCondition: text})}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Saving...' : 'Complete Profile & Continue to Login'}
        </Text>
      </TouchableOpacity>
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
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
    marginTop: 15,
  },
  inputGroup: {
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
  },
  row: {
    flexDirection: "row",
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
    backgroundColor: "#3b82f6",
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
});