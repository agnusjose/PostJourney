import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
} from "react-native";
import axios from "axios";

export default function VideoList({ route, navigation }) {
  const { category } = route.params;
  const [videos, setVideos] = useState([]);

  const API_BASE = "http://192.168.112.170:5000"; // ← CHANGE IP HERE

  useEffect(() => {
    axios
      .get(`${API_BASE}/api/videos/category/${category}`)
      .then((res) => setVideos(res.data))
      .catch(() => alert("Failed to load videos"));
  }, []);

  return (
    <ImageBackground
      source={require("../assets/pjlogo_bg.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{category.replace("-", " ")} Videos</Text>

        {videos.map((video) => (
          <TouchableOpacity
            key={video._id}
            style={styles.card}
            onPress={() =>
              navigation.navigate("VideoPlayer", { url: video.url })
            }
          >
            <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
            <Text style={styles.cardTitle}>{video.title}</Text>
            <Text style={styles.cardDesc}>{video.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 100,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 25,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    elevation: 4,
  },
  thumbnail: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: "#444",
  },
});
