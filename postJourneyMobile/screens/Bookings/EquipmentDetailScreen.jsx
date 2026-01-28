// EquipmentDetailScreen.jsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator
} from "react-native";
import { useCart } from "../../context/CartContext";
import axios from "axios";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function EquipmentDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { equipmentId } = route.params;
  const { 
    addToCart, 
    prepareForImmediateBooking,
    isItemInCart,
    getCartItemQuantity,
    loading: cartLoading 
  } = useCart();

  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showFullImage, setShowFullImage] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const BASE_URL = "http://192.168.115.72:5000";

  useEffect(() => {
    fetchEquipmentDetails();
    fetchReviews();
  }, []);

  useEffect(() => {
    if (equipment) {
      // Calculate max available quantity
      const cartQty = getCartItemQuantity(equipment._id);
      const maxAvailable = Math.max(0, equipment.stock - cartQty);
      setQuantity(Math.min(1, maxAvailable));
    }
  }, [equipment]);

  const fetchEquipmentDetails = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/equipment/${equipmentId}`);
      if (res.data.success) {
        setEquipment(res.data.equipment);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load equipment details");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/equipment/${equipmentId}/reviews`);
      if (res.data.success) {
        setReviews(res.data.reviews || []);
        setAverageRating(res.data.averageRating || 0);
        setTotalReviews(res.data.totalReviews || 0);
      }
    } catch (error) {
      console.error("Failed to load reviews:", error);
    }
  };

  const handleAddToCart = async () => {
    if (!equipment || equipment.stock === 0) {
      Alert.alert("Out of Stock", "This equipment is currently unavailable");
      return;
    }

    const cartQty = getCartItemQuantity(equipment._id);
    const available = equipment.stock - cartQty;
    
    if (quantity > available) {
      Alert.alert("Insufficient Stock", `Only ${available} unit(s) available`);
      return;
    }

    setIsProcessing(true);

    const cartItem = {
      _id: equipment._id,
      equipmentName: equipment.equipmentName,
      pricePerDay: equipment.pricePerDay,
      imageUrl: equipment.imageUrl,
      providerName: equipment.providerName,
      providerId: equipment.providerId,
      category: equipment.category,
      quantity: quantity
    };

    const result = await addToCart(cartItem);

    if (result.success) {
      Alert.alert(
        "Added to Cart",
        `${quantity}x ${equipment.equipmentName} added to cart`,
        [
          { text: "Continue Shopping", style: "cancel" },
          {
            text: "View Cart",
            onPress: () => navigation.navigate("PatientCart")
          }
        ]
      );
    } else {
      Alert.alert("Cannot Add to Cart", result.message || "Failed to add to cart");
    }

    setIsProcessing(false);
  };

  const handleBookNow = async () => {
    if (!equipment || equipment.stock === 0) {
      Alert.alert("Out of Stock", "This equipment is currently unavailable");
      return;
    }

    const cartQty = getCartItemQuantity(equipment._id);
    const available = equipment.stock - cartQty;
    
    if (quantity > available) {
      Alert.alert("Insufficient Stock", `Only ${available} unit(s) available`);
      return;
    }

    setIsProcessing(true);

    const bookingItem = {
      _id: equipment._id,
      equipmentName: equipment.equipmentName,
      pricePerDay: equipment.pricePerDay,
      imageUrl: equipment.imageUrl,
      providerName: equipment.providerName,
      providerId: equipment.providerId,
      category: equipment.category,
      quantity: quantity
    };

    const result = await prepareForImmediateBooking(bookingItem);

    if (result.success) {
      // Navigate directly to checkout with this single item
      navigation.navigate("CheckoutScreen", {
        immediateBookingItem: result.bookingItem
      });
    } else {
      Alert.alert("Cannot Proceed", result.message || "Failed to proceed to booking");
    }

    setIsProcessing(false);
  };

  const handleIncreaseQuantity = () => {
    if (!equipment) return;
    
    const cartQty = getCartItemQuantity(equipment._id);
    const maxAvailable = equipment.stock - cartQty;
    
    if (quantity < maxAvailable) {
      setQuantity(quantity + 1);
    } else {
      Alert.alert(
        "Maximum Quantity", 
        `Only ${maxAvailable} unit(s) available (${cartQty} already in cart)`
      );
    }
  };

  const handleDecreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Ionicons key={i} name="star" size={16} color="#fbbf24" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<Ionicons key={i} name="star-half" size={16} color="#fbbf24" />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={16} color="#cbd5e1" />);
      }
    }
    return stars;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!equipment) {
    return (
      <View style={styles.errorContainer}>
        <Text>Equipment not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl = equipment.imageUrl
    ? `${BASE_URL}${equipment.imageUrl}`
    : "https://via.placeholder.com/300";

  const categoryColors = {
    "mobility": "#3b82f6",
    "respiratory": "#10b981",
    "daily-living": "#8b5cf6",
    "therapeutic": "#f59e0b",
    "monitoring": "#ef4444",
    "other": "#6b7280"
  };

  const cartQty = getCartItemQuantity(equipment._id);
  const availableForAdd = Math.max(0, equipment.stock - cartQty);
  const canAdd = availableForAdd > 0 && quantity <= availableForAdd;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Product Images */}
      <TouchableOpacity onPress={() => setShowFullImage(true)}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.mainImage}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* Product Info */}
      <View style={styles.infoContainer}>
        {/* Category Badge */}
        <View style={[styles.categoryBadge, { backgroundColor: categoryColors[equipment.category] || "#6b7280" }]}>
          <Text style={styles.categoryText}>
            {equipment.category?.replace("-", " ").toUpperCase() || "OTHER"}
          </Text>
        </View>

        {/* Product Name */}
        <Text style={styles.equipmentName}>{equipment.equipmentName}</Text>

        {/* Provider Info */}
        <View style={styles.providerContainer}>
          <Ionicons name="business" size={16} color="#64748b" />
          <Text style={styles.providerText}>Sold by: {equipment.providerName}</Text>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingContainer}>
          <View style={styles.ratingStars}>
            {renderStars(averageRating)}
            <Text style={styles.ratingValue}>{averageRating.toFixed(1)}</Text>
          </View>
          <Text style={styles.ratingCount}>({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})</Text>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.price}>₹ {equipment.pricePerDay}</Text>
          <Text style={styles.priceUnit}> / day</Text>
        </View>

        {/* Stock Status */}
        <View style={styles.stockContainer}>
          {equipment.stock > 0 ? (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              <Text style={styles.inStock}>
                In Stock ({equipment.stock} total)
                {cartQty > 0 && ` (${cartQty} in cart, ${availableForAdd} available)`}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="close-circle" size={18} color="#ef4444" />
              <Text style={styles.outOfStock}>Out of Stock</Text>
            </>
          )}
        </View>

        {/* Quantity Selector */}
        {equipment.stock > 0 && availableForAdd > 0 && (
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Quantity:</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[styles.quantityBtn, quantity <= 1 && styles.disabledQuantityBtn]}
                onPress={handleDecreaseQuantity}
                disabled={quantity <= 1}
              >
                <Ionicons name="remove" size={20} color={quantity <= 1 ? "#cbd5e1" : "#475569"} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.quantityBtn, quantity >= availableForAdd && styles.disabledQuantityBtn]}
                onPress={handleIncreaseQuantity}
                disabled={quantity >= availableForAdd}
              >
                <Ionicons name="add" size={20} color={quantity >= availableForAdd ? "#cbd5e1" : "#475569"} />
              </TouchableOpacity>
            </View>
            <Text style={styles.quantityHint}>
              Max: {availableForAdd} unit(s) available
            </Text>
          </View>
        )}

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{equipment.description}</Text>
        </View>

        {/* Specifications */}
        <View style={styles.specsContainer}>
          <Text style={styles.sectionTitle}>Specifications</Text>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Category:</Text>
            <Text style={styles.specValue}>{equipment.category?.replace("-", " ") || "Other"}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Daily Price:</Text>
            <Text style={styles.specValue}>₹ {equipment.pricePerDay}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Available Stock:</Text>
            <Text style={styles.specValue}>{equipment.stock} units</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Condition:</Text>
            <Text style={styles.specValue}>Sanitized & Certified</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.addToCartBtn, (!canAdd || isProcessing || cartLoading) && styles.disabledBtn]}
            onPress={handleAddToCart}
            disabled={!canAdd || isProcessing || cartLoading}
          >
            {isProcessing || cartLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="cart" size={20} color="#fff" />
                <Text style={styles.addToCartText}>
                  {cartQty > 0 ? 'Add More to Cart' : 'Add to Cart'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buyNowBtn, (!canAdd || isProcessing || cartLoading) && styles.disabledBtn]}
            onPress={handleBookNow}
            disabled={!canAdd || isProcessing || cartLoading}
          >
            {isProcessing || cartLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="flash" size={20} color="#fff" />
                <Text style={styles.buyNowText}>Book Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Delivery Info */}
        <View style={styles.deliveryInfo}>
          <Ionicons name="time" size={18} color="#3b82f6" />
          <Text style={styles.deliveryText}>Same-day delivery available in metro cities</Text>
        </View>

        <View style={styles.deliveryInfo}>
          <Ionicons name="shield-checkmark" size={18} color="#10b981" />
          <Text style={styles.deliveryText}>Fully sanitized and certified equipment</Text>
        </View>
      </View>

      {/* Full Screen Image Modal */}
      <Modal
        visible={showFullImage}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.fullImageModal}>
          <TouchableOpacity
            style={styles.closeFullImage}
            onPress={() => setShowFullImage(false)}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ uri: imageUrl }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mainImage: {
    width: "100%",
    height: 300,
    backgroundColor: "#f1f5f9",
  },
  infoContainer: {
    padding: 16,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  equipmentName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  providerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  providerText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#64748b",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingStars: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 12,
  },
  price: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1e293b",
  },
  priceUnit: {
    fontSize: 16,
    color: "#64748b",
    marginLeft: 4,
  },
  stockContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  inStock: {
    marginLeft: 6,
    fontSize: 14,
    color: "#10b981",
    fontWeight: "600",
  },
  outOfStock: {
    marginLeft: 6,
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "600",
  },
  quantityContainer: {
    marginBottom: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  quantityBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  disabledQuantityBtn: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "600",
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: "center",
  },
  quantityHint: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
  },
  specsContainer: {
    marginBottom: 20,
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  specLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  specValue: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buyNowBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#10b981",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledBtn: {
    backgroundColor: "#94a3b8",
  },
  addToCartText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buyNowText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  deliveryInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  deliveryText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#475569",
  },
  fullImageModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeFullImage: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  fullImage: {
    width: width * 0.9,
    height: width * 0.9,
  },
});