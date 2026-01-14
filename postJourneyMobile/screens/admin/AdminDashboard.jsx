import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  BackHandler,
  Alert 
} from "react-native";
import { useEffect } from "react";

export default function AdminDashboard({ navigation }) {
  
  // Handle back button press
  useEffect(() => {
    const backAction = () => {
      Alert.alert("Hold on!", "Are you sure you want to logout?", [
        {
          text: "Cancel",
          onPress: () => null,
          style: "cancel"
        },
        { 
          text: "YES", 
          onPress: () => navigation.navigate("LoginScreen") 
        }
      ]);
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  const handleLogout = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "LoginScreen" }],
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Admin Dashboard</Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate("AdminUsersScreen")}
      >
        <Text style={styles.btnText}>Manage Users</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate("ManageProviders")}
      >
        <Text style={styles.btnText}>Manage Providers</Text>
      </TouchableOpacity>

      {/* Add Logout Button */}
      <TouchableOpacity
        style={[styles.btn, styles.logoutBtn]}
        onPress={handleLogout}
      >
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: "#f8f9fa",
    justifyContent: "center" 
  },
  heading: { 
    fontSize: 28, 
    fontWeight: "bold", 
    marginBottom: 30,
    textAlign: "center",
    color: "#333"
  },
  btn: {
    backgroundColor: "#0066cc",
    padding: 18,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
  },
  logoutBtn: {
    backgroundColor: "#dc3545",
    marginTop: 30,
  },
  btnText: { 
    color: "#fff", 
    textAlign: "center", 
    fontWeight: "bold",
    fontSize: 16 
  },
});