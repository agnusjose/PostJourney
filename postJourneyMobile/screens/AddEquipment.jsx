import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";

export default function AddEquipmentScreen({ route, navigation }) {
  const providerId = route?.params?.providerId;

  const [equipmentName, setEquipmentName] = useState("");
  const [category, setCategory] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);

  const BASE_URL = "http://192.168.245.72:5000";

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!res.canceled) {
      setImage(res.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!equipmentName || !category || !pricePerDay || stock === "") {
      Alert.alert("Error", "Fill all required fields");
      return;
    }

    const formData = new FormData();
    formData.append("providerId", providerId);
    formData.append("equipmentName", equipmentName);
    formData.append("category", category);
    formData.append("pricePerDay", pricePerDay);
    formData.append("stock", stock);
    formData.append("description", description);

    if (image) {
      formData.append("image", {
        uri: image.uri,
        name: "equipment.jpg",
        type: "image/jpeg",
      });
    }

    try {
      const res = await axios.post(
        `${BASE_URL}/equipment/add`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (!res.data.success) {
        Alert.alert("Error", res.data.message);
        return;
      }

      Alert.alert("Success", "Equipment added successfully");
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Server error");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add Equipment</Text>

      <TextInput
        placeholder="Equipment Name *"
        placeholderTextColor="#64748b"
        style={styles.input}
        value={equipmentName}
        onChangeText={setEquipmentName}
      />

      <TextInput
        placeholder="Category *"
        placeholderTextColor="#64748b"
        style={styles.input}
        value={category}
        onChangeText={setCategory}
      />

      <TextInput
        placeholder="Price per day *"
        placeholderTextColor="#64748b"
        keyboardType="numeric"
        style={styles.input}
        value={pricePerDay}
        onChangeText={setPricePerDay}
      />

      <TextInput
        placeholder="Stock / Quantity *"
        placeholderTextColor="#64748b"
        keyboardType="numeric"
        style={styles.input}
        value={stock}
        onChangeText={setStock}
      />

      <TextInput
        placeholder="Description"
        placeholderTextColor="#64748b"
        style={[styles.input, { height: 80 }]}
        multiline
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
        <Text style={styles.btnText}>Upload Photo (Optional)</Text>
      </TouchableOpacity>

      {image && <Image source={{ uri: image.uri }} style={styles.preview} />}

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
        <Text style={styles.btnText}>Submit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    color: "#0f172a",
  },
  imageBtn: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  preview: { height: 160, borderRadius: 10, marginBottom: 12 },
});