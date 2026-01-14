import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import axios from "axios";

const API_BASE = "http://192.168.245.72.72:5000";

export default function MedicalVideos({ navigation }) {
  const [dbVideos, setDbVideos] = useState([]);
  const [ytVideos, setYtVideos] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Load DB videos once
  useEffect(() => {
    axios
      .get(`${API_BASE}/api/videos`)
      .then(res => setDbVideos(res.data || []))
      .catch(() => console.log("Failed to load DB videos"));
  }, []);

  const handleSearch = async () => {
    if (!search.trim()) {
      setYtVideos([]);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE}/api/youtube/search?q=${encodeURIComponent(search)}`
      );
      setYtVideos(res.data || []);
    } catch {
      alert("Failed to fetch videos");
    } finally {
      setLoading(false);
    }
  };

  const showingYouTube = search.trim().length > 0;

  return (
    <ImageBackground
      source={require("../assets/pjlogo_bg.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Medical Demonstrations</Text>

        {/* Search */}
        <View style={styles.searchBox}>
          <TextInput
            placeholder="Search medical videos"
            value={search}
            onChangeText={setSearch}
            style={styles.input}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchText}>Search</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

        {/* DB VIDEOS */}
        {!showingYouTube &&
          dbVideos.map(video => (
            <TouchableOpacity
              key={video._id}
              style={styles.card}
              onPress={() =>
                navigation.navigate("VideoPlayer", { url: video.url })
              }
            >
              <Image source={{ uri: video.thumbnail }} style={styles.thumb} />
              <Text style={styles.cardTitle}>{video.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>
                {video.description}
              </Text>
            </TouchableOpacity>
          ))}

        {/* YOUTUBE VIDEOS */}
        {showingYouTube &&
          ytVideos.map(video => (
            <TouchableOpacity
              key={video.videoId}
              style={styles.card}
              onPress={() =>
                navigation.navigate("VideoPlayer", {
                  url: `https://www.youtube.com/watch?v=${video.videoId}`,
                })
              }
            >
              <Image source={{ uri: video.thumbnail }} style={styles.thumb} />
              <Text style={styles.cardTitle}>{video.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>
                {video.description}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { padding: 20 },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 15 },
  searchBox: { flexDirection: "row", marginBottom: 20 },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
  },
  searchBtn: {
    backgroundColor: "#1188e6",
    padding: 12,
    marginLeft: 8,
    borderRadius: 8,
  },
  searchText: { color: "#fff", fontWeight: "bold" },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  thumb: { height: 180, borderRadius: 8, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: "bold" },
  cardDesc: { fontSize: 13, color: "#444" },
});
