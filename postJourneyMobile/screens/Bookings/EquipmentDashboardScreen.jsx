import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Image,
  Modal,
} from "react-native";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

export default function EquipmentDashboardScreen({ route, navigation }) {
  const { providerId } = route.params;
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  const BASE_URL = "http://192.168.245.72:5000";

  // Fetch equipment function
  const fetchEquipment = async () => {
    try {
      console.log("🔍 Fetching equipment for provider:", providerId);
      const res = await axios.get(
        `${BASE_URL}/equipment/provider/${providerId}`
      );

      console.log("📥 Equipment response:", res.data);
      
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to load equipment");
      }

      // Add full URL to image paths
      const equipmentWithFullUrls = (res.data.equipment || []).map(item => ({
        ...item,
        imageUrl: item.imageUrl 
          ? `${BASE_URL}${item.imageUrl}` 
          : null
      }));
      
      setEquipmentList(equipmentWithFullUrls);
    } catch (err) {
      console.error("❌ Error fetching equipment:", err);
      Alert.alert("Error", err.message || "Failed to load equipment");
      setEquipmentList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load equipment on focus
  useFocusEffect(
    useCallback(() => {
      fetchEquipment();
    }, [providerId])
  );

  // Manual refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchEquipment();
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* Image Section with click to view fullscreen */}
      <TouchableOpacity 
        onPress={() => {
          if (item.imageUrl) {
            setSelectedImage(item.imageUrl);
            setImageModalVisible(true);
          }
        }}
      >
        {item.imageUrl ? (
          <Image 
            source={{ uri: item.imageUrl }} 
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
      </TouchableOpacity>
      
      {/* Info Section */}
      <View style={styles.info}>
        <Text style={styles.name}>{item.equipmentName}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.row}>
          <Text style={styles.stock}>
            Stock: <Text style={styles.stockNumber}>{item.stock}</Text>
          </Text>
          <Text style={styles.price}>₹ {item.pricePerDay} / day</Text>
        </View>
        
        {item.stock > 0 ? (
          <Text style={styles.available}>✓ Available</Text>
        ) : (
          <Text style={styles.outOfStock}>✗ Out of Stock</Text>
        )}
        
        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.editBtn}
            onPress={() => navigation.navigate("EditEquipment", { 
              equipment: item 
            })}
          >
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.deleteBtn}
            onPress={() => handleDelete(item._id)}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const handleDelete = async (id) => {
    Alert.alert(
      "Delete Equipment",
      "Are you sure you want to delete this equipment?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const res = await axios.delete(`${BASE_URL}/equipment/delete/${id}`);
              if (res.data.success) {
                Alert.alert("Success", "Equipment deleted successfully");
                fetchEquipment(); // Refresh list
              }
            } catch (err) {
              Alert.alert("Error", "Failed to delete equipment");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Equipment</Text>
      
      {/* Show count */}
      {!loading && equipmentList.length > 0 && (
        <Text style={styles.countText}>
          Total: {equipmentList.length} item{equipmentList.length !== 1 ? 's' : ''}
        </Text>
      )}

      {equipmentList.length === 0 && !loading && (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>No equipment added yet</Text>
          <TouchableOpacity onPress={fetchEquipment} style={styles.retryBtn}>
            <Text style={styles.retryText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={equipmentList}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ 
          paddingBottom: 120,
          paddingTop: equipmentList.length === 0 ? 0 : 10 
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2563eb"]}
          />
        }
        ListEmptyComponent={
          !loading && equipmentList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.empty}>No equipment found</Text>
              <Text style={styles.emptySubtext}>
                Tap "Add Equipment" to get started
              </Text>
            </View>
          ) : null
        }
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

      {/* Fullscreen Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setImageModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {selectedImage && (
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setImageModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: "#f8fafc" 
  },
  header: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
    color: "#1e293b",
  },
  countText: {
    textAlign: "center",
    color: "#64748b",
    marginBottom: 10,
    fontSize: 14,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
  },
  image: {
    width: 100,
    height: 100,
    backgroundColor: "#e5e7eb",
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  info: {
    flex: 1,
    padding: 12,
  },
  name: { 
    fontSize: 16, 
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 8,
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  stock: {
    fontSize: 14,
    color: "#475569",
  },
  stockNumber: {
    fontWeight: "700",
    color: "#1e293b",
  },
  price: { 
    fontWeight: "700",
    fontSize: 15,
    color: "#16a34a",
  },
  available: {
    color: "#16a34a",
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 8,
  },
  outOfStock: {
    color: "#dc2626",
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  editBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  empty: {
    textAlign: "center",
    fontSize: 16,
    color: "#64748b",
    marginBottom: 10,
  },
  emptySubtext: {
    textAlign: "center",
    fontSize: 14,
    color: "#94a3b8",
  },
  retryBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
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
    elevation: 5,
  },
  addText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  // Fullscreen Image Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "100%",
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
});