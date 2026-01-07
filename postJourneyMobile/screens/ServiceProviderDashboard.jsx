import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_BASE = "http://192.168.1.7:5000/api/provider/services"; // CHANGE IP ONLY

const ServiceProviderDashboard = () => {
  const [token, setToken] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    serviceName: "",
    category: "Physiotherapy",
    description: "",
    pricePerSession: "",
  });

  /* LOAD TOKEN FIRST */
  useEffect(() => {
    const init = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        if (!storedToken) {
          Alert.alert("Auth Error", "Login again");
          return;
        }
        setToken(storedToken);
      } catch (err) {
        console.log("Token load error:", err);
      }
    };
    init();
  }, []);

  /* FETCH SERVICES AFTER TOKEN */
  useEffect(() => {
    if (token) fetchServices();
  }, [token]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/my-services`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServices(res.data || []);
    } catch (err) {
      console.log("Fetch services error:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const addService = async () => {
    if (!form.serviceName || !form.pricePerSession) {
      Alert.alert("Validation", "Service name and price required");
      return;
    }

    try {
      await axios.post(`${API_BASE}/add`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setForm({
        serviceName: "",
        category: "Physiotherapy",
        description: "",
        pricePerSession: "",
      });

      fetchServices();
    } catch (err) {
      console.log("Add service error:", err.response?.data || err.message);
      Alert.alert("Error", "Unable to add service");
    }
  };

  const deleteService = async (id) => {
    try {
      await axios.delete(`${API_BASE}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchServices();
    } catch (err) {
      console.log("Delete service error:", err.response?.data || err.message);
      Alert.alert("Error", "Unable to delete service");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Service Provider Dashboard</Text>

      {/* ADD SERVICE */}
      <View style={styles.card}>
        <Text style={styles.subtitle}>Add Service</Text>

        <TextInput
          style={styles.input}
          placeholder="Service Name"
          value={form.serviceName}
          onChangeText={(v) => setForm({ ...form, serviceName: v })}
        />

        <TextInput
          style={styles.input}
          placeholder="Category"
          value={form.category}
          onChangeText={(v) => setForm({ ...form, category: v })}
        />

        <TextInput
          style={styles.input}
          placeholder="Description"
          value={form.description}
          onChangeText={(v) => setForm({ ...form, description: v })}
        />

        <TextInput
          style={styles.input}
          placeholder="Price per session"
          keyboardType="numeric"
          value={form.pricePerSession}
          onChangeText={(v) =>
            setForm({ ...form, pricePerSession: v })
          }
        />

        <TouchableOpacity style={styles.button} onPress={addService}>
          <Text style={styles.buttonText}>Add Service</Text>
        </TouchableOpacity>
      </View>

      {/* SERVICE LIST */}
      <View style={styles.card}>
        <Text style={styles.subtitle}>My Services</Text>

        {loading && <Text>Loading...</Text>}

        {!loading && services.length === 0 && (
          <Text>No services added yet</Text>
        )}

        {services.map((s) => (
          <View key={s._id} style={styles.row}>
            <View>
              <Text style={styles.serviceName}>{s.serviceName}</Text>
              <Text>₹ {s.pricePerSession}</Text>
            </View>

            <TouchableOpacity onPress={() => deleteService(s._id)}>
              <Text style={styles.delete}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  subtitle: { fontSize: 18, fontWeight: "600", marginBottom: 10 },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  serviceName: { fontWeight: "600" },
  delete: { color: "red" },
});

export default ServiceProviderDashboard;
