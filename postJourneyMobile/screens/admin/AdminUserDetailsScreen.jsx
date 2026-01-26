import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    Platform,
    Image,
} from "react-native";
import axios from "axios";

export default function AdminUserDetailsScreen({ route, navigation }) {
    const { userId, userType } = route.params;
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [relatedData, setRelatedData] = useState(null);
    const [error, setError] = useState(null);

    const BASE_URL = Platform.OS === "web"
        ? "http://localhost:5000"
        : "http://10.80.34.90:5000";

    useEffect(() => {
        fetchUserDetails();
    }, []);

    const fetchUserDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`${BASE_URL}/admin/users/${userId}/details`);

            if (response.data.success) {
                setUser(response.data.user);
                setRelatedData(response.data.relatedData);
            } else {
                setError(response.data.message);
            }
        } catch (err) {
            console.error("Error fetching user details:", err);
            setError("Failed to load user details");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    };

    const formatCurrency = (amount) => {
        return "₹" + (amount || 0).toLocaleString();
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0066cc" />
                <Text style={styles.loadingText}>Loading user details...</Text>
            </View>
        );
    }

    if (error || !user) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>{error || "User not found"}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchUserDetails}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isProvider = user.userType === "service-provider" || user.userType === "service provider";

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>User Details</Text>
            </View>

            {/* Profile Card */}
            <View style={styles.profileCard}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                    </Text>
                </View>
                <Text style={styles.userName}>{user.name || "No Name"}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{user.userType}</Text>
                </View>
            </View>

            {/* Profile Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile Information</Text>
                <View style={styles.infoCard}>
                    <InfoRow label="Phone" value={user.phoneNumber || "N/A"} />
                    <InfoRow label="City" value={user.city || "N/A"} />
                    {isProvider ? (
                        <>
                            <InfoRow label="Agency Name" value={user.agencyName || "N/A"} />
                            <InfoRow label="Service Type" value={user.serviceType || "N/A"} />
                            <InfoRow label="Verification" value={user.providerVerification?.status || "Pending"} />
                        </>
                    ) : (
                        <>
                            <InfoRow label="Age" value={user.age || "N/A"} />
                            <InfoRow label="Gender" value={user.gender || "N/A"} />
                            <InfoRow label="Condition" value={user.primaryCondition || "N/A"} />
                        </>
                    )}
                    <InfoRow label="Registered" value={formatDate(user.createdAt)} />
                    <InfoRow label="Verified" value={user.isVerified ? "Yes" : "No"} />
                    <InfoRow label="Blocked" value={user.isBlocked ? "Yes" : "No"} />
                </View>
            </View>

            {/* Provider-specific data */}
            {isProvider && relatedData && (
                <>
                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{relatedData.totalEquipment || 0}</Text>
                            <Text style={styles.statLabel}>Equipment</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{relatedData.totalSales || 0}</Text>
                            <Text style={styles.statLabel}>Sales</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{formatCurrency(relatedData.totalEarnings)}</Text>
                            <Text style={styles.statLabel}>Earnings</Text>
                        </View>
                    </View>

                    {/* Equipment List */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Equipment Added ({relatedData.equipment?.length || 0})</Text>
                        {relatedData.equipment?.length > 0 ? (
                            relatedData.equipment.map((eq, index) => (
                                <View key={eq._id || index} style={styles.itemCard}>
                                    <Text style={styles.itemName}>{eq.equipmentName}</Text>
                                    <Text style={styles.itemDetail}>Price: {formatCurrency(eq.pricePerDay)}/day</Text>
                                    <Text style={styles.itemDetail}>Stock: {eq.stock} | Category: {eq.category}</Text>
                                    <Text style={styles.itemDetail}>Available: {eq.isAvailable ? "Yes" : "No"}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No equipment added</Text>
                        )}
                    </View>

                    {/* Sales/Bookings for Provider */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Sales History ({relatedData.sales?.length || 0})</Text>
                        {relatedData.sales?.length > 0 ? (
                            relatedData.sales.map((sale, index) => (
                                <View key={sale._id || index} style={styles.itemCard}>
                                    <Text style={styles.itemName}>{sale.equipmentName}</Text>
                                    <Text style={styles.itemDetail}>Purchased by: {sale.patientName}</Text>
                                    <Text style={styles.itemDetail}>Amount: {formatCurrency(sale.totalAmount)}</Text>
                                    <Text style={styles.itemDetail}>Status: {sale.status} | Payment: {sale.paymentStatus}</Text>
                                    <Text style={styles.itemDate}>{formatDate(sale.createdAt)}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No sales yet</Text>
                        )}
                    </View>
                </>
            )}

            {/* Patient-specific data */}
            {!isProvider && relatedData && (
                <>
                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{relatedData.totalBookings || 0}</Text>
                            <Text style={styles.statLabel}>Bookings</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{formatCurrency(relatedData.totalSpent)}</Text>
                            <Text style={styles.statLabel}>Total Spent</Text>
                        </View>
                    </View>

                    {/* Purchase History */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Purchase History ({relatedData.bookings?.length || 0})</Text>
                        {relatedData.bookings?.length > 0 ? (
                            relatedData.bookings.map((booking, index) => (
                                <View key={booking._id || index} style={styles.itemCard}>
                                    <Text style={styles.itemName}>{booking.equipmentName}</Text>
                                    <Text style={styles.itemDetail}>Provider: {booking.providerName}</Text>
                                    <Text style={styles.itemDetail}>Amount: {formatCurrency(booking.totalAmount)}</Text>
                                    <Text style={styles.itemDetail}>Days: {booking.totalDays} | Status: {booking.status}</Text>
                                    <Text style={styles.itemDate}>{formatDate(booking.createdAt)}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No purchases yet</Text>
                        )}
                    </View>
                </>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

// Helper component
const InfoRow = ({ label, value }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}:</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        color: "#666",
    },
    errorText: {
        color: "red",
        marginBottom: 10,
        fontSize: 16,
    },
    retryBtn: {
        backgroundColor: "#0066cc",
        padding: 12,
        borderRadius: 8,
    },
    retryText: {
        color: "white",
        fontWeight: "bold",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        paddingTop: 50,
        backgroundColor: "#0066cc",
    },
    backBtn: {
        marginRight: 15,
    },
    backText: {
        color: "white",
        fontSize: 16,
    },
    headerTitle: {
        color: "white",
        fontSize: 20,
        fontWeight: "bold",
    },
    profileCard: {
        backgroundColor: "white",
        alignItems: "center",
        padding: 25,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#0066cc",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 15,
    },
    avatarText: {
        color: "white",
        fontSize: 32,
        fontWeight: "bold",
    },
    userName: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 5,
    },
    userEmail: {
        fontSize: 16,
        color: "#666",
        marginBottom: 10,
    },
    typeBadge: {
        backgroundColor: "#e3f2fd",
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 20,
    },
    typeText: {
        color: "#0066cc",
        fontWeight: "600",
        textTransform: "capitalize",
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 12,
    },
    infoCard: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 15,
        elevation: 2,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    infoLabel: {
        color: "#666",
        fontSize: 15,
    },
    infoValue: {
        color: "#333",
        fontSize: 15,
        fontWeight: "500",
        textAlign: "right",
        flex: 1,
        marginLeft: 10,
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        padding: 16,
        backgroundColor: "white",
        marginBottom: 10,
    },
    statBox: {
        alignItems: "center",
        flex: 1,
    },
    statNumber: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#0066cc",
    },
    statLabel: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
    },
    itemCard: {
        backgroundColor: "white",
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        elevation: 2,
    },
    itemName: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 6,
    },
    itemDetail: {
        fontSize: 14,
        color: "#666",
        marginBottom: 3,
    },
    itemDate: {
        fontSize: 12,
        color: "#999",
        marginTop: 6,
    },
    emptyText: {
        color: "#999",
        fontStyle: "italic",
        textAlign: "center",
        padding: 20,
    },
});
