import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from "react-native";

const Equipment = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://192.168.245.72.72:5000/equipment")
      .then((res) => res.json())
      .then((data) => {
        setStores(data.data || []); // IMPORTANT: ensure array
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching equipment:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading equipment...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Equipment Stores</Text>
      {stores.length === 0 ? (
        <Text>No equipment stores found.</Text>
      ) : (
        stores.map((store, idx) => (
          <View key={store._id || idx} style={styles.store}>
            <Text>{JSON.stringify(store, null, 2)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 8 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
  store: { marginBottom: 12, backgroundColor: "#f2f2f2", padding: 8, borderRadius: 6 },
});

export default Equipment;