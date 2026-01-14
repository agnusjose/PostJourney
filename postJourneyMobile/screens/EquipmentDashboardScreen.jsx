import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import axios from "axios";

export default function EquipmentDashboardScreen({ route, navigation }) {
  const { providerId } = route.params;
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);

  const BASE_URL = "http://192.168.245.72:5000";

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/equipment/provider/${providerId}`
      );

      if (!res.data.success) {
        throw new Error();
      }

      setEquipmentList(res.data.equipment);
    } catch (err) {
      Alert.alert("Error", "Failed to load equipment");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
   <View style={styles.card}>
  <Text style={styles.name}>{item.equipmentName}</Text>
  <Text>{item.description}</Text>
  <Text>Stock: {item.stock}</Text>

  {item.stock > 0 ? (
    <Text style={{ color: "green", fontWeight: "700" }}>
      Available
    </Text>
  ) : (
    <Text style={{ color: "red", fontWeight: "700" }}>
      Out of Stock
    </Text>
  )}

  <Text style={styles.price}>₹ {item.pricePerDay} / day</Text>
</View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Equipment</Text>

      {equipmentList.length === 0 && !loading && (
        <Text style={styles.empty}>No equipment added yet</Text>
      )}

      <FlatList
        data={equipmentList}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* ➕ ADD EQUIPMENT BUTTON */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() =>
          navigation.navigate("AddEquipment", {
            providerId,
          })
        }
      >
        <Text style={styles.addText}>+ Add Equipment</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc" },
  header: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
  },
  name: { fontSize: 16, fontWeight: "700" },
  price: { marginTop: 6, fontWeight: "700" },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#64748b",
  },
  addBtn: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  addText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});