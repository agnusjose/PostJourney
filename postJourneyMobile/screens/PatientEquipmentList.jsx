import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import axios from "axios";
import { useCart } from "../context/CartContext";

export default function PatientEquipmentList() {
  const navigation = useNavigation();
  const { addToCart } = useCart();

  const [equipment, setEquipment] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  const BASE_URL = "http://192.168.245.72:5000";

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/equipment/all`);
      if (res.data.success) {
        setEquipment(res.data.equipment);
      }
    } catch {
      Alert.alert("Error", "Failed to load equipment");
    }
  };

  const renderItem = ({ item }) => {
    const imageUrl = item.imageUrl
      ? `${BASE_URL}${item.imageUrl}`
      : "https://via.placeholder.com/150";

    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => setSelectedImage(imageUrl)}>
          <Image source={{ uri: imageUrl }} style={styles.image} />
        </TouchableOpacity>

        <View style={styles.info}>
          <Text style={styles.name}>{item.equipmentName}</Text>

          {!!item.description && (
            <Text style={styles.desc} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <Text style={styles.price}>₹ {item.pricePerDay} / day</Text>

          {item.stock > 0 ? (
            <Text style={styles.available}>
              In Stock ({item.stock})
            </Text>
          ) : (
            <Text style={styles.out}>Out of Stock</Text>
          )}

          <TouchableOpacity
            style={[
              styles.cartBtn,
              item.stock === 0 && styles.disabled,
            ]}
            disabled={item.stock === 0}
            onPress={() => {
              addToCart(item);
              Alert.alert("Added to Cart", item.equipmentName);
            }}
          >
            <Text style={styles.cartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Equipment Booking</Text>

      <FlatList
        data={equipment}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      <TouchableOpacity
        style={styles.cartFloating}
        onPress={() => navigation.navigate("PatientCart")} // FIXED: Use "PatientCart" not "PatientCartScreen"
      >
        <Text style={styles.cartFloatingText}>🛒 View Cart</Text>
      </TouchableOpacity>

      <Modal visible={!!selectedImage} transparent>
        <TouchableOpacity
          style={styles.modal}
          onPress={() => setSelectedImage(null)}
        >
          <Image source={{ uri: selectedImage }} style={styles.fullImage} />
        </TouchableOpacity>
      </Modal>
    </View>
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
    marginBottom: 16,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    elevation: 3,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  desc: {
    fontSize: 13,
    color: "#64748b",
    marginVertical: 2,
  },
  price: {
    fontWeight: "700",
    marginTop: 4,
  },
  available: {
    color: "green",
    fontWeight: "700",
    marginTop: 2,
  },
  out: {
    color: "red",
    fontWeight: "700",
    marginTop: 2,
  },
  cartBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 6,
  },
  disabled: {
    backgroundColor: "#94a3b8",
  },
  cartText: {
    color: "#fff",
    fontWeight: "700",
  },
  cartFloating: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#16a34a",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 6,
  },
  cartFloatingText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  modal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "90%",
    height: "70%",
    resizeMode: "contain",
  },
});