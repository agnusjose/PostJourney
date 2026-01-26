import React, { useEffect, useRef } from "react";
import { Animated, ImageBackground, StyleSheet, Dimensions } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function SplashScreen({ navigation }) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Run splash animation
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
      // Wait for auth loading to complete
      if (!isLoading) {
        handleNavigation();
      }
    });
  }, []);

  // Watch for when isLoading changes to false
  useEffect(() => {
    if (!isLoading) {
      // Small delay to ensure animation is complete
      setTimeout(() => {
        handleNavigation();
      }, 600);
    }
  }, [isLoading, user]);

  const handleNavigation = () => {
    if (user && user.userId) {
      // User is already logged in - go to their dashboard
      console.log("✅ Auto-login: User found, navigating to dashboard");

      if (user.userType === "patient") {
        navigation.replace("PatientDashboard", {
          userId: user.userId,
          userName: user.name,
          userEmail: user.email,
        });
      } else if (user.userType === "service-provider" || user.userType === "service provider") {
        navigation.replace("ServiceProviderDashboard", {
          userId: user.userId,
          userName: user.name,
          userEmail: user.email,
        });
      } else if (user.userType === "admin") {
        navigation.replace("AdminDashboard");
      } else {
        // Unknown user type, go to login
        navigation.replace("LoginScreen");
      }
    } else {
      // No user logged in - go to register/login
      console.log("📝 No stored session, going to RegisterScreen");
      navigation.replace("RegisterScreen");
    }
  };

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
