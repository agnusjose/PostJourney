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
  TextInput,
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
  const { addToCart } = useCart();
  
  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showFullImage, setShowFullImage] = useState(false);
  
  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [canReview, setCanReview] = useState(false);

  const BASE_URL = "http://192.168.245.72:5000";

  useEffect(() => {
    fetchEquipmentDetails();
    fetchReviews();
  }, []);

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

  const checkCanReview = async () => {
    // You need to get the current user ID from your auth system
    const userId = "current_user_id_here"; // Replace with actual user ID
    
    try {
      const res = await axios.get(`${BASE_URL}/equipment/${equipmentId}/can-review/${userId}`);
      if (res.data.success) {
        setCanReview(res.data.canReview);
      }
    } catch (error) {
      console.error("Failed to check review eligibility:", error);
    }
  };

  const handleSubmitReview = async () => {
    if (!userRating || userRating < 1 || userRating > 5) {
      Alert.alert("Error", "Please select a rating between 1 and 5");
      return;
    }

    const userId = "current_user_id_here"; // Replace with actual user ID
    const userName = "Current User"; // Replace with actual user name

    setSubmittingReview(true);

    try {
      const res = await axios.post(`${BASE_URL}/equipment/${equipmentId}/review`, {
        userId,
        userName,
        rating: userRating,
        comment: userComment
      });

      if (res.data.success) {
        Alert.alert("Success", "Thank you for your review!");
        setShowReviewModal(false);
        setUserRating(5);
        setUserComment("");
        fetchReviews(); // Refresh reviews
      } else {
        Alert.alert("Error", res.data.message);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddToCart = () => {
    if (!equipment || equipment.stock === 0) {
      Alert.alert("Out of Stock", "This equipment is currently unavailable");
      return;
    }

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
    
    addToCart(cartItem);
    
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
  };

  const handleBookNow = () => {
    if (!equipment || equipment.stock === 0) {
      Alert.alert("Out of Stock", "This equipment is currently unavailable");
      return;
    }

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
    
    addToCart(cartItem);
    navigation.navigate("CheckoutScreen", { 
      item: equipment,
      quantity: quantity 
    });
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

        {/* Rating Section - REAL RATINGS */}
        <View style={styles.ratingContainer}>
          <View style={styles.ratingStars}>
            {renderStars(averageRating)}
            <Text style={styles.ratingValue}>{averageRating.toFixed(1)}</Text>
          </View>
          <Text style={styles.ratingCount}>({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})</Text>
          
          {canReview && (
            <TouchableOpacity 
              style={styles.addReviewButton}
              onPress={() => setShowReviewModal(true)}
            >
              <Ionicons name="add-circle" size={16} color="#3b82f6" />
              <Text style={styles.addReviewText}>Add Review</Text>
            </TouchableOpacity>
          )}
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
              <Text style={styles.inStock}>In Stock ({equipment.stock} available)</Text>
            </>
          ) : (
            <>
              <Ionicons name="close-circle" size={18} color="#ef4444" />
              <Text style={styles.outOfStock}>Out of Stock</Text>
            </>
          )}
        </View>

        {/* Quantity Selector */}
        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>Quantity:</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity 
              style={styles.quantityBtn}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Ionicons name="remove" size={20} color="#475569" />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity 
              style={styles.quantityBtn}
              onPress={() => setQuantity(Math.min(equipment.stock, quantity + 1))}
              disabled={quantity >= equipment.stock}
            >
              <Ionicons name="add" size={20} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{equipment.description}</Text>
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsContainer}>
          <Text style={styles.sectionTitle}>Customer Reviews</Text>
          
          {reviews.length === 0 ? (
            <View style={styles.noReviews}>
              <Ionicons name="chatbubble-outline" size={40} color="#cbd5e1" />
              <Text style={styles.noReviewsText}>No reviews yet</Text>
              <Text style={styles.noReviewsSubtext}>Be the first to review this product</Text>
            </View>
          ) : (
            <>
              {reviews.slice(0, 3).map((review, index) => (
                <View key={index} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{review.userName}</Text>
                    <View style={styles.reviewStars}>
                      {renderStars(review.rating)}
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>
                    {new Date(review.date).toLocaleDateString()}
                  </Text>
                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}
                </View>
              ))}
              
              {reviews.length > 3 && (
                <TouchableOpacity 
                  style={styles.viewAllReviews}
                  onPress={() => navigation.navigate("EquipmentReviews", { equipmentId })}
                >
                  <Text style={styles.viewAllReviewsText}>
                    View all {reviews.length} reviews
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
                </TouchableOpacity>
              )}
            </>
          )}
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
            style={[styles.addToCartBtn, equipment.stock === 0 && styles.disabledBtn]}
            onPress={handleAddToCart}
            disabled={equipment.stock === 0}
          >
            <Ionicons name="cart" size={20} color="#fff" />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.buyNowBtn, equipment.stock === 0 && styles.disabledBtn]}
            onPress={handleBookNow}
            disabled={equipment.stock === 0}
          >
            <Ionicons name="flash" size={20} color="#fff" />
            <Text style={styles.buyNowText}>Book Now</Text>
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

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Your Review</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.ratingPrompt}>How would you rate this equipment?</Text>
            
            <View style={styles.ratingInput}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setUserRating(star)}
                >
                  <Ionicons 
                    name={star <= userRating ? "star" : "star-outline"} 
                    size={32} 
                    color="#fbbf24" 
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.commentInput}
              placeholder="Share your experience (optional)"
              value={userComment}
              onChangeText={setUserComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelModalBtn}
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.submitReviewBtn}
                onPress={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitReviewText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  ratingText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#6b7280",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
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
  quantityText: {
    fontSize: 18,
    fontWeight: "600",
    marginHorizontal: 16,
    minWidth: 30,
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
  addReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
  },
  addReviewText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
  },
  reviewsContainer: {
    marginBottom: 20,
  },
  noReviews: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
  },
  noReviewsText: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 12,
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
  },
  reviewItem: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  reviewStars: {
    flexDirection: "row",
  },
  reviewDate: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  viewAllReviews: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  viewAllReviewsText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  ratingPrompt: {
    fontSize: 16,
    color: "#475569",
    marginBottom: 16,
    textAlign: "center",
  },
  ratingInput: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    gap: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 20,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelModalBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  cancelModalText: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "600",
  },
  submitReviewBtn: {
    flex: 2,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#10b981",
    alignItems: "center",
  },
  submitReviewText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});