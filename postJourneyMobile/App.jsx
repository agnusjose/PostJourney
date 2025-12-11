import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from './screens/SplashScreen';       // Splash first
import RegisterScreen from './screens/RegisterScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import AdminLoginScreen from "./screens/AdminLoginScreen";
import AdminUsersScreen from "./screens/AdminUsersScreen";
import PatientDashboard from "./screens/PatientDashboard";
import ServiceProviderDashboard from "./screens/ServiceProviderDashboard";
import VideoCategories from "./screens/VideoCategories";
import VideoList from "./screens/VideoList";
import VideoPlayer from "./screens/VideoPlayer";


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"            // Start with Splash
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="AdminLoginScreen" component={AdminLoginScreen} />
        <Stack.Screen name="AdminUsersScreen" component={AdminUsersScreen} />
        <Stack.Screen name="PatientDashboard" component={PatientDashboard} />
        <Stack.Screen name="ServiceProviderDashboard" component={ServiceProviderDashboard} />
        <Stack.Screen name="VideoCategories" component={VideoCategories} />
        <Stack.Screen name="VideoList" component={VideoList} />
        <Stack.Screen name="VideoPlayer" component={VideoPlayer} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
