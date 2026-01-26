import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";

export default function PatientProfileScreen({ route, navigation }) {
    const { userId, userEmail } = route.params || {};

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [profile, setProfile] = useState({
        name: "",
        email: "",
        age: "",
        gender: "",
        phoneNumber: "",
        city: "",
        primaryCondition: "",
    });

    const [editedProfile, setEditedProfile] = useState({ ...profile });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `http://10.80.34.90:5000/api/patient/profile/${userId}`
            );

            if (response.data.success) {
                const profileData = response.data.profile;
                setProfile(profileData);
                setEditedProfile(profileData);
            } else {
                Alert.alert("Error", response.data.message || "Failed to load profile");
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            Alert.alert("Error", "Failed to load profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editedProfile.name || !editedProfile.phoneNumber) {
            Alert.alert("Error", "Name and Phone Number are required");
            return;
        }

        try {
            setSaving(true);
            const response = await axios.put(
                "http://10.80.34.90:5000/api/patient/update-profile",
                {
                    userId,
                    fullName: editedProfile.name,
                    age: editedProfile.age,
                    gender: editedProfile.gender,
                    phoneNumber: editedProfile.phoneNumber,
                    city: editedProfile.city,
                    primaryCondition: editedProfile.primaryCondition,
                }
            );

            if (response.data.success) {
                setProfile(response.data.profile);
                setIsEditing(false);
                Alert.alert("Success", "Profile updated successfully!");
            } else {
                Alert.alert("Error", response.data.message || "Failed to update profile");
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            Alert.alert("Error", "Failed to update profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditedProfile({ ...profile });
        setIsEditing(false);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1E88E5" />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>? Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>My Profile</Text>
                {!isEditing && (
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => setIsEditing(true)}
                    >
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Profile Card */}
            <View style={styles.profileCard}>
                {/* Avatar placeholder */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {profile.name ? profile.name.charAt(0).toUpperCase() : "P"}
                        </Text>
                    </View>
                    <Text style={styles.profileName}>{profile.name || "Patient"}</Text>
                    <Text style={styles.profileEmail}>{profile.email}</Text>
                </View>

                {/* Profile Fields */}
                <View style={styles.fieldsContainer}>
                    {/* Full Name */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Full Name</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.input}
                                value={editedProfile.name}
                                onChangeText={(text) =>
                                    setEditedProfile({ ...editedProfile, name: text })
                                }
                                placeholder="Enter your full name"
                            />
                        ) : (
                            <Text style={styles.fieldValue}>{profile.name || "Not set"}</Text>
                        )}
                    </View>

                    {/* Age & Gender Row */}
                    <View style={styles.row}>
                        <View style={[styles.fieldGroup, { flex: 1, marginRight: 10 }]}>
                            <Text style={styles.fieldLabel}>Age</Text>
                            {isEditing ? (
                                <TextInput
                                    style={styles.input}
                                    value={String(editedProfile.age || "")}
                                    onChangeText={(text) =>
                                        setEditedProfile({ ...editedProfile, age: text })
                                    }
                                    keyboardType="numeric"
                                    placeholder="Age"
                                />
                            ) : (
                                <Text style={styles.fieldValue}>
                                    {profile.age ? `${profile.age} years` : "Not set"}
                                </Text>
                            )}
                        </View>

                        <View style={[styles.fieldGroup, { flex: 1 }]}>
                            <Text style={styles.fieldLabel}>Gender</Text>
                            {isEditing ? (
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={editedProfile.gender}
                                        onValueChange={(value) =>
                                            setEditedProfile({ ...editedProfile, gender: value })
                                        }
                                        style={styles.picker}
                                    >
                                        <Picker.Item label="Select" value="" />
                                        <Picker.Item label="Male" value="male" />
                                        <Picker.Item label="Female" value="female" />
                                        <Picker.Item label="Other" value="other" />
                                    </Picker>
                                </View>
                            ) : (
                                <Text style={styles.fieldValue}>
                                    {profile.gender
                                        ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
                                        : "Not set"}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Phone Number */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Phone Number</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.input}
                                value={editedProfile.phoneNumber}
                                onChangeText={(text) =>
                                    setEditedProfile({ ...editedProfile, phoneNumber: text })
                                }
                                keyboardType="phone-pad"
                                maxLength={10}
                                placeholder="10-digit phone number"
                            />
                        ) : (
                            <Text style={styles.fieldValue}>
                                {profile.phoneNumber || "Not set"}
                            </Text>
                        )}
                    </View>

                    {/* City */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>City</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.input}
                                value={editedProfile.city}
                                onChangeText={(text) =>
                                    setEditedProfile({ ...editedProfile, city: text })
                                }
                                placeholder="Your city"
                            />
                        ) : (
                            <Text style={styles.fieldValue}>{profile.city || "Not set"}</Text>
                        )}
                    </View>

                    {/* Primary Condition */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Primary Health Condition</Text>
                        {isEditing ? (
                            <TextInput
                                style={[styles.input, styles.multilineInput]}
                                value={editedProfile.primaryCondition}
                                onChangeText={(text) =>
                                    setEditedProfile({ ...editedProfile, primaryCondition: text })
                                }
                                placeholder="e.g., Knee pain, Back pain, Stroke recovery"
                                multiline
                            />
                        ) : (
                            <Text style={styles.fieldValue}>
                                {profile.primaryCondition || "Not set"}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Action Buttons */}
                {isEditing && (
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancel}
                            disabled={saving}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            <Text style={styles.saveButtonText}>
                                {saving ? "Saving..." : "Save Changes"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f0f4f8",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f0f4f8",
    },
    loadingText: {
        marginTop: 12,
        color: "#5C768D",
        fontSize: 16,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E1E8ED",
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: "#1E88E5",
        fontSize: 16,
        fontWeight: "600",
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#2C3E50",
    },
    editButton: {
        backgroundColor: "#E3F2FD",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    editButtonText: {
        color: "#1E88E5",
        fontWeight: "700",
        fontSize: 14,
    },
    profileCard: {
        backgroundColor: "#fff",
        margin: 20,
        borderRadius: 20,
        padding: 24,
        shadowColor: "#2C3E50",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    avatarContainer: {
        alignItems: "center",
        marginBottom: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: "#E1E8ED",
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#1E88E5",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    avatarText: {
        color: "#fff",
        fontSize: 32,
        fontWeight: "700",
    },
    profileName: {
        fontSize: 22,
        fontWeight: "700",
        color: "#2C3E50",
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 14,
        color: "#5C768D",
    },
    fieldsContainer: {
        marginBottom: 20,
    },
    fieldGroup: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#5C768D",
        marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    fieldValue: {
        fontSize: 16,
        color: "#2C3E50",
        fontWeight: "500",
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: "#F8FAFC",
        borderRadius: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        backgroundColor: "#fff",
        color: "#2C3E50",
    },
    multilineInput: {
        height: 80,
        textAlignVertical: "top",
    },
    row: {
        flexDirection: "row",
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: "#fff",
    },
    picker: {
        height: 50,
    },
    buttonRow: {
        flexDirection: "row",
        marginTop: 10,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: "#F1F5F9",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        marginRight: 10,
    },
    cancelButtonText: {
        color: "#64748B",
        fontWeight: "700",
        fontSize: 16,
    },
    saveButton: {
        flex: 2,
        backgroundColor: "#1E88E5",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    saveButtonDisabled: {
        backgroundColor: "#94A3B8",
    },
    saveButtonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
});
