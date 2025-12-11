import React, { useEffect, useRef } from "react";
import { Animated, ImageBackground, StyleSheet, Dimensions } from "react-native";

export default function SplashScreen({ navigation }) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        navigation.replace("RegisterScreen");
      }, 600);
    });
  }, []);

  return (
    <ImageBackground
      source={require("../assets/pjlogo_bg.png")}   
      style={styles.bg}
      resizeMode="cover"
    >
      <Animated.Image
        source={require("../assets/postjourney_logo.png")}
        style={[
          styles.logo,
          {
            opacity: fade,
            transform: [{ scale }],
          },
        ]}
        resizeMode="contain"
      />
    </ImageBackground>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: width * 0.6,
    height: width * 0.6,
  },
});
