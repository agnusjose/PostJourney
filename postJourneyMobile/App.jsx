import 'whatwg-fetch';
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
import ExercisesDashboard from './screens/ExercisesDashboard';
import VideoPlayer from "./screens/VideoPlayer";
import MedicalVideos from "./screens/MedicalVideos";
import BedMobilityDemo from "./screens/exerciseMonitoring/BedMobilityDemo";
import BedMobilityMonitor from "./screens/exerciseMonitoring/BedMobilityMonitor";
import LegRaiseDemo from './screens/exerciseMonitoring/LegRaiseDemo';
import LegRaiseMonitor from './screens/exerciseMonitoring/LegRaiseMonitor'
import TFSanityTest from "./screens/TFSanityTest";


// ServiceProviderScreen (simple placeholder) removed from stack to avoid conflicts
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
        <Stack.Screen name="ServiceProviderDashboard" component={ServiceProviderDashboard}/>
        <Stack.Screen name="VideoPlayer" component={VideoPlayer} />
        <Stack.Screen name='ExercisesDashboard' component={ExercisesDashboard} />
        <Stack.Screen name="MedicalVideos" component={MedicalVideos} />
        <Stack.Screen name="BedMobilityDemo" component={BedMobilityDemo}/>
        <Stack.Screen name="BedMobilityMonitor" component={BedMobilityMonitor}/>
        <Stack.Screen name="LegRaiseDemo" component={LegRaiseDemo}/>
        <Stack.Screen name="LegRaiseMonitor" component={LegRaiseMonitor}/>
        <Stack.Screen name="TFSanityTest" component={TFSanityTest} />
        {/* Removed simple ServiceProviderScreen to avoid routing collisions */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
