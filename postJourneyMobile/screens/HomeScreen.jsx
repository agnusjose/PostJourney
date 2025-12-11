import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  ScrollView,
} from "react-native";

export default function HomeScreen({ route }) {
const { userEmail, isAdmin } = route.params || {};

  return (
    <ImageBackground
      source={require("../assets/pjlogo_bg.png")}   
      style={styles.bg}
      resizeMode="cover"
    >
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Logo */}
        <Image
          source={require("../assets/postjourney_logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.welcome}>Welcome to</Text>
        <Text style={styles.brand}>PostJourney</Text>

        {isAdmin ? (
  <Text style={styles.subText}>Admin Logged in: {userEmail}</Text>
) : userEmail ? (
  <Text style={styles.subText}>Logged in as: {userEmail}</Text>
) : (
  <Text style={styles.subText}>Your wellness journey starts here!</Text>
)}


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
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 60,
  },

  logo: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },

  welcome: {
    fontSize: 26,
    fontWeight: "600",
    color: "#000",
    marginBottom: 5,
  },

  brand: {
    fontSize: 40,
    fontWeight: "900",
    color: "#000",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },

  subText: {
    marginTop: 20,
    fontSize: 18,
    color: "#00314f",
    fontWeight: "500",
  },
});
