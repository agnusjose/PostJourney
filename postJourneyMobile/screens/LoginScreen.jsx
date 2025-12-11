import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('http://192.168.112.170:5000/login', {
        email,
        password,
      });

      if (response.data.success) {
        const type = response.data.userType;  // ⭐ Get user type returned from backend

        // ⭐ Route based on user type
        if (type === "patient") {
          navigation.navigate("PatientDashboard", { userEmail: email });
        } 
        else if (type === "service provider") {
          navigation.navigate("ServiceProviderDashboard", { userEmail: email });
        } 
        else {
          Alert.alert("Error", "Unknown user type.");
        }

      } else {
        Alert.alert('Login Failed', response.data.message || 'Invalid login');
      }

    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Try again.');
    } 
    finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/pjlogo_bg.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>

          <Image
            source={require("../assets/postjourney_logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Login</Text>

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#333"
            style={styles.input}
          />

          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#333"
            style={styles.input}
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Logging in…' : 'LOGIN'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('RegisterScreen')}>
            <Text style={styles.registerText}>
              Don't have an account? Register
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    paddingHorizontal: 25,
    paddingTop: 70,
    paddingBottom: 60,
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    elevation: 2,
  },
  button: {
    width: '100%',
    backgroundColor: '#1188e6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  registerText: {
    marginTop: 20,
    color: '#0038a8',
    textDecorationLine: 'underline',
    fontSize: 15,
  },
});
