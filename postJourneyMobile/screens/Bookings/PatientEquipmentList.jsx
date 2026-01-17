import { useNavigation } from "@react-navigation/native";
// In PatientEquipmentList.jsx, at the top:
import { Ionicons } from '@expo/vector-icons';
// NOT: import Ionicons from '@expo/vector-icons';
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
  ScrollView ,
} from "react-native";
import axios from "axios";
import { useCart } from "../../context/CartContext";
// This goes up two levels: screens/Bookings/ -> up to screens -> up to root, then into contextimport { Ionicons } from "@expo/vector-icons";

export default function PatientEquipmentList() {
  const navigation = useNavigation();
  const { addToCart } = useCart();

  const [equipment, setEquipment] = useState([]);
  const [filteredEquipment, setFilteredEquipment] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const BASE_URL = "http://192.168.245.72:5000";

  const categories = [
    { id: "all", label: "All" },
    { id: "mobility", label: "Mobility" },
    { id: "respiratory", label: "Respiratory" },
    { id: "daily-living", label: "Daily Living" },
    { id: "therapeutic", label: "Therapeutic" },
    { id: "monitoring", label: "Monitoring" },
  ];

  useEffect(() => {
    fetchEquipment();
  }, []);

  useEffect(() => {
    filterEquipment();
  }, [searchQuery, selectedCategory, equipment]);

  const fetchEquipment = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/equipment/all`);
      if (res.data.success) {
        setEquipment(res.data.equipment);
        setFilteredEquipment(res.data.equipment);
      }
    } catch {
      Alert.alert("Error", "Failed to load equipment");
    }
  };

  const filterEquipment = () => {
    let filtered = equipment;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    setFilteredEquipment(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEquipment().finally(() => setRefreshing(false));
  };

  const renderItem = ({ item }) => {
    const imageUrl = item.imageUrl
      ? `${BASE_URL}${item.imageUrl}`
      : "https://via.placeholder.com/150";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("EquipmentDetailScreen", { equipmentId: item._id })}
      >
        <Image source={{ uri: imageUrl }} style={styles.image} />

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.equipmentName}</Text>
          
          {item.category && (
            <View style={[styles.categoryTag, getCategoryStyle(item.category)]}>
              <Text style={styles.categoryText}>
                {item.category.replace("-", " ")}
              </Text>
            </View>
          )}

          {!!item.description && (
            <Text style={styles.desc} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹ {item.pricePerDay}</Text>
            <Text style={styles.priceUnit}> / day</Text>
          </View>

          <View style={styles.stockContainer}>
            {item.stock > 0 ? (
              <>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                <Text style={styles.available}>In Stock</Text>
              </>
            ) : (
              <>
                <Ionicons name="close-circle" size={14} color="#ef4444" />
                <Text style={styles.out}>Out of Stock</Text>
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.viewDetailsBtn}
            onPress={() => navigation.navigate("EquipmentDetailScreen", { equipmentId: item._id })}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const getCategoryStyle = (category) => {
    switch(category) {
      case "mobility": return { backgroundColor: "#dbeafe", borderColor: "#3b82f6" };
      case "respiratory": return { backgroundColor: "#d1fae5", borderColor: "#10b981" };
      case "daily-living": return { backgroundColor: "#f3e8ff", borderColor: "#8b5cf6" };
      case "therapeutic": return { backgroundColor: "#fef3c7", borderColor: "#f59e0b" };
      case "monitoring": return { backgroundColor: "#fee2e2", borderColor: "#ef4444" };
      default: return { backgroundColor: "#f1f5f9", borderColor: "#6b7280" };
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Medical Equipment Marketplace</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search equipment..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryBtn,
              selectedCategory === cat.id && styles.categoryBtnActive
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={[
              styles.categoryBtnText,
              selectedCategory === cat.id && styles.categoryBtnTextActive
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results Count */}
      <Text style={styles.resultsCount}>
        {filteredEquipment.length} equipment found
      </Text>

      {/* Equipment List */}
      <FlatList
        data={filteredEquipment}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2563eb"]}
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={60} color="#cbd5e1" />
            <Text style={styles.emptyText}>No equipment found</Text>
            <Text style={styles.emptySubtext}>
              Try a different search or category
            </Text>
          </View>
        }
      />

      {/* Cart Floating Button */}
      <TouchableOpacity
        style={styles.cartFloating}
        onPress={() => navigation.navigate("PatientCart")}
      >
        <View style={styles.cartBadge}>
          <Text style={styles.cartBadgeText}>0</Text>
        </View>
        <Ionicons name="cart" size={24} color="#fff" />
      </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
    color: "#1e293b",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#1e293b",
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  categoryBtnActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  categoryBtnText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },
  categoryBtnTextActive: {
    color: "#fff",
  },
  resultsCount: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  categoryTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  desc: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 8,
    lineHeight: 18,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
  },
  priceUnit: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 2,
  },
  stockContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  available: {
    marginLeft: 4,
    fontSize: 12,
    color: "#10b981",
    fontWeight: "600",
  },
  out: {
    marginLeft: 4,
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
  },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  viewDetailsText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
  cartFloating: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#2563eb",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cartBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#ef4444",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: "#64748b",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
  },
});