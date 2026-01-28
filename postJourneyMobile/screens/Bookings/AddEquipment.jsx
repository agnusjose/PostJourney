import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";

export default function AddEquipment({ route, navigation }) {
  const { providerId } = route.params;
  const BASE_URL = "http://192.168.115.72:5000";

  // If you have auth context, get user info from there
  // const { user } = useContext(AuthContext);

  const [form, setForm] = useState({
    equipmentName: "",
    description: "",
    pricePerDay: "",
    stock: "1",
    category: "other",
  });

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const categories = [
    { label: "Mobility Aids", value: "mobility" },
    { label: "Respiratory", value: "respiratory" },
    { label: "Daily Living", value: "daily-living" },
    { label: "Therapeutic", value: "therapeutic" },
    { label: "Monitoring", value: "monitoring" },
    { label: "Other", value: "other" },
  ];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to gallery");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!form.equipmentName.trim()) {
      Alert.alert("Error", "Please enter equipment name");
      return;
    }
    if (!form.description.trim()) {
      Alert.alert("Error", "Please enter description");
      return;
    }
    if (!form.pricePerDay || parseFloat(form.pricePerDay) <= 0) {
      Alert.alert("Error", "Please enter valid price per day");
      return;
    }
    if (!form.stock || parseInt(form.stock) < 1) {
      Alert.alert("Error", "Please enter valid stock quantity");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("equipmentName", form.equipmentName);
      formData.append("description", form.description);
      formData.append("pricePerDay", form.pricePerDay);
      formData.append("stock", form.stock);
      formData.append("providerId", providerId);
      formData.append("providerName", "Agnus Jose"); // Hardcoded for now
      formData.append("category", form.category);

      if (image) {
        formData.append("image", {
          uri: image.uri,
          type: "image/jpeg",
          name: `equipment_${Date.now()}.jpg`,
        });
      }

      console.log("📤 Sending equipment data...");
      console.log("Provider ID:", providerId);

      const response = await axios.post(`${BASE_URL}/equipment/add`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("📥 Response:", response.data);

      if (response.data.success) {
        Alert.alert("Success", "Equipment added successfully");
        navigation.goBack();
      } else {
        Alert.alert("Error", response.data.message || "Failed to add equipment");
      }
    } catch (error) {
      console.error("❌ Error:", error);
      console.error("❌ Error response:", error.response?.data);
      Alert.alert("Error", error.response?.data?.message || "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <Text style={styles.header}>Add New Equipment</Text>

      {/* Equipment Image */}
      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image.uri }} style={styles.previewImage} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>+ Add Photo</Text>
            <Text style={styles.placeholderSubtext}>Tap to select image</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Equipment Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Equipment Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Wheelchair, Oxygen Concentrator"
          value={form.equipmentName}
          onChangeText={(text) => setForm({ ...form, equipmentName: text })}
        />
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the equipment features, condition, specifications..."
          value={form.description}
          onChangeText={(text) => setForm({ ...form, description: text })}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Price & Stock */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Price per Day (₹) *</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={form.pricePerDay}
            onChangeText={(text) => setForm({ ...form, pricePerDay: text })}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Stock Quantity *</Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            value={form.stock}
            onChangeText={(text) => setForm({ ...form, stock: text })}
            keyboardType="number-pad"
          />
        </View>
      </View>

      {/* Category */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryBtn,
                form.category === cat.value && styles.categoryBtnActive,
              ]}
              onPress={() => setForm({ ...form, category: cat.value })}
            >
              <Text
                style={[
                  styles.categoryText,
                  form.category === cat.value && styles.categoryTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitText}>
          {loading ? "Adding..." : "Add Equipment"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 20,
    color: "#1e293b",
  },
  imagePicker: {
    height: 180,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  placeholder: {
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 18,
    color: "#2563eb",
    fontWeight: "600",
  },
  placeholderSubtext: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#475569",
  },
  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  categoryBtnActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  categoryText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  categoryTextActive: {
    color: "#fff",
  },
  submitBtn: {
    backgroundColor: "#16a34a",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnDisabled: {
    backgroundColor: "#94a3b8",
  },
  submitText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});