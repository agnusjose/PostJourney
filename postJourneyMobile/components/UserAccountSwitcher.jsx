import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

const C = {
  primary: "#0A5F7A",
  secondary: "#1D8FAB",
  bg: "#F0F6F9",
  textDark: "#0D2535",
  textMid: "#4A6B7C",
  textLight: "#8BA9B8",
  cardBorder: "#DBE8EE",
};

export default function UserAccountSwitcher() {
  const { user, getAvailableSessions, switchUser, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const sessions = getAvailableSessions();

  if (!user || sessions.length <= 1) {
    return null; // Hide if only one session
  }

  const handleSwitchUser = async (userId) => {
    await switchUser(userId);
    setShowModal(false);
  };

  const handleLogout = async (userId) => {
    Alert.alert(
      "Logout",
      `Logout from ${userId}?`,
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Logout",
          onPress: async () => {
            if (user.userId === userId) {
              await logout();
            }
            setShowModal(false);
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <>
      {/* Account Switcher Button */}
      <TouchableOpacity
        style={styles.switcherButton}
        onPress={() => setShowModal(true)}
      >
        <MaterialCommunityIcons
          name="account-convert"
          size={20}
          color={C.primary}
        />
        <Text style={styles.switcherText}>
          {sessions.length} Accounts
        </Text>
      </TouchableOpacity>

      {/* Accounts Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Switch Account</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={C.textDark}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sessionsList}>
              {sessions.map((session) => (
                <View key={session.userId} style={styles.sessionCard}>
                  <TouchableOpacity
                    style={[
                      styles.sessionContent,
                      session.isActive && styles.sessionActive,
                    ]}
                    onPress={() => handleSwitchUser(session.userId)}
                  >
                    <View style={styles.sessionIcon}>
                      <MaterialCommunityIcons
                        name={
                          session.userType === "patient"
                            ? "hospital-box"
                            : "briefcase"
                        }
                        size={24}
                        color={session.isActive ? "#fff" : C.primary}
                      />
                    </View>

                    <View style={styles.sessionInfo}>
                      <Text
                        style={[
                          styles.sessionName,
                          session.isActive && styles.sessionNameActive,
                        ]}
                      >
                        {session.name}
                      </Text>
                      <Text
                        style={[
                          styles.sessionEmail,
                          session.isActive && styles.sessionEmailActive,
                        ]}
                      >
                        {session.email}
                      </Text>
                      <Text
                        style={[
                          styles.sessionType,
                          session.isActive && styles.sessionTypeActive,
                        ]}
                      >
                        {session.userType === "patient"
                          ? "🏥 Patient"
                          : "🛠️ Service Provider"}
                      </Text>
                    </View>

                    {session.isActive && (
                      <View style={styles.activeIndicator}>
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={24}
                          color="#4CAF50"
                        />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Logout Button */}
                  <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={() => handleLogout(session.userId)}
                  >
                    <MaterialCommunityIcons
                      name="logout"
                      size={18}
                      color="#E74C3C"
                    />
                    <Text style={styles.logoutText}>Logout</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  switcherButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2F7",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginHorizontal: 10,
  },
  switcherText: {
    marginLeft: 8,
    fontWeight: "700",
    color: C.primary,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.textDark,
  },
  sessionsList: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  sessionCard: {
    marginBottom: 15,
  },
  sessionContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.cardBorder,
  },
  sessionActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  sessionIcon: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: "800",
    color: C.textDark,
  },
  sessionNameActive: {
    color: "#fff",
  },
  sessionEmail: {
    fontSize: 12,
    color: C.textMid,
    marginTop: 2,
  },
  sessionEmailActive: {
    color: "rgba(255,255,255,0.8)",
  },
  sessionType: {
    fontSize: 11,
    color: C.textLight,
    marginTop: 4,
    fontWeight: "600",
  },
  sessionTypeActive: {
    color: "rgba(255,255,255,0.7)",
  },
  activeIndicator: {
    marginLeft: 10,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(231,76,60,0.1)",
    borderRadius: 8,
    marginTop: 8,
  },
  logoutText: {
    marginLeft: 6,
    color: "#E74C3C",
    fontWeight: "700",
    fontSize: 12,
  },
  closeButton: {
    marginHorizontal: 15,
    backgroundColor: C.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});
