import React from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

export default function VideoPlayer({ route }) {
  const { url } = route.params;

  // Extract video ID
  let id = "";
  if (url.includes("v=")) id = url.split("v=")[1];
  else if (url.includes("youtu.be")) id = url.split("youtu.be/")[1];

  const embed = `https://www.youtube.com/embed/${id}`;

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: embed }}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
});
