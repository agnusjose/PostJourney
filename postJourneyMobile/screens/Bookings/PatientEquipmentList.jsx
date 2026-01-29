// screens/Bookings/PatientEquipmentList.jsx
import { useNavigation } from "@react-navigation/native";
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
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import axios from "axios";
import { useCart } from "../../context/CartContext"; // ADD THIS IMPORT

export default function PatientEquipmentList() {
  const navigation = useNavigation();
  const { getCartCount } = useCart(); // ADD THIS LINE
  const [equipment, setEquipment] = useState([]);
  const [filteredEquipment, setFilteredEquipment] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const BASE_URL = "http://192.168.115.72:5000";

  const categories = [
    { id: "all", label: "All" },
    { id: "mobility", label: "Mobility" },
    { id: "respiratory", label: "Respiratory" },
    { id: "daily-living", label: "Daily" },
    { id: "monitoring", label: "Monitoring" },
  ];

  useEffect(() => { fetchEquipment(); }, []);
  useEffect(() => { filterEquipment(); }, [searchQuery, selectedCategory, equipment]);

  const fetchEquipment = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/equipment/all`);
      if (res.data.success) {
        setEquipment(res.data.equipment);
        setFilteredEquipment(res.data.equipment);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load equipment");
    }
  };

  const filterEquipment = () => {
    let filtered = equipment;
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.equipmentName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    setFilteredEquipment(filtered);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate("EquipmentDetailScreen", { equipmentId: item._id })}
    >
      <Image
        source={{ uri: item.imageUrl ? `${BASE_URL}${item.imageUrl}` : "https://via.placeholder.com/150" }}
        style={styles.image}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.equipmentName}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>₹{item.pricePerDay}</Text>
          <Text style={styles.priceUnit}>/day</Text>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: item.stock > 0 ? '#7CB342' : '#EF5350' }]} />
          <Text style={[styles.statusText, { color: item.stock > 0 ? '#388E3C' : '#D32F2F' }]}>
            {item.stock > 0 ? "In Stock" : "Out of Stock"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => navigation.navigate("EquipmentDetailScreen", { equipmentId: item._id })}
        >
          <Text style={styles.detailsBtnText}>View Details</Text>
          <Ionicons name="chevron-forward" size={14} color="#1E88E5" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.bg}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.userName}>Marketplace</Text>
            </View>
            <TouchableOpacity
              style={styles.statusBadge}
              onPress={() => navigation.navigate("PatientBookingsScreen")}
            >
              <Ionicons name="calendar" size={14} color="#388E3C" style={{ marginRight: 4 }} />
              <Text style={styles.statusText}>My Bookings</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#5C768D" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search equipment..."
              placeholderTextColor="#BDC3C7"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Categories */}
          <View style={{ marginBottom: 20 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryBtn, selectedCategory === cat.id && styles.categoryBtnActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text style={[styles.categoryBtnText, selectedCategory === cat.id && styles.categoryBtnTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

           <FlatList
            data={filteredEquipment}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEquipment().finally(() => setRefreshing(false)); }} />}
          />
        </View>

        {/* Floating Cart - FIXED to show actual count */}
        <TouchableOpacity style={styles.cartFloating} onPress={() => navigation.navigate("PatientCart")}>
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{getCartCount()}</Text>
          </View>
          <Ionicons name="cart" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#F5FAFF' },
  overlay: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 22, paddingTop: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  welcome: { fontSize: 15, color: "#5C768D", fontWeight: "500" },
  userName: { fontSize: 26, fontWeight: "800", color: "#2C3E50", letterSpacing: -0.5 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  statusText: { fontSize: 12, fontWeight: '700', color: '#388E3C' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  searchInput: { flex: 1, marginLeft: 10, color: "#2C3E50", fontWeight: '500' },
  categoryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  categoryBtnActive: { backgroundColor: '#2C3E50', borderColor: '#2C3E50' },
  categoryBtnText: { color: '#5C768D', fontWeight: '600', fontSize: 13 },
  categoryBtnTextActive: { color: '#fff' },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    shadowColor: "#2C3E50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  image: { width: 90, height: 90, borderRadius: 15, backgroundColor: '#F0F4F8' },
  info: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: "700", color: "#2C3E50", marginBottom: 4 },
  priceContainer: { flexDirection: "row", alignItems: "baseline", marginBottom: 4 },
  price: { fontSize: 18, fontWeight: "800", color: "#2C3E50" },
  priceUnit: { fontSize: 12, color: "#5C768D", marginLeft: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailsBtn: { flexDirection: 'row', alignItems: 'center' },
  detailsBtnText: { fontSize: 13, fontWeight: "700", color: "#1E88E5", marginRight: 2 },
  cartFloating: {
    position: "absolute",
    bottom: 30,
    right: 22,
    backgroundColor: "#1E88E5",
    width: 60, height: 60, borderRadius: 30,
    justifyContent: "center", alignItems: "center",
    elevation: 6,
    shadowColor: "#1E88E5", shadowOpacity: 0.3, shadowRadius: 8,
  },
  cartBadge: {
    position: "absolute", top: -2, right: -2,
    backgroundColor: "#EF5350", width: 20, height: 20,
    borderRadius: 10, justifyContent: "center", alignItems: "center", zIndex: 1,
  },
  cartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});