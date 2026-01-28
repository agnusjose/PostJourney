import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Using the same IP as seen in LoginScreen, but targeting the /api route used by doctorRoutes
const BASE_URL = 'http://192.168.115.72:5000/api';

export default function ConsultDoctor({ navigation }) {
    const { user } = useAuth(); // Get logged-in user details
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);

    // Booking Modal State
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [problem, setProblem] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);

    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            console.log('Fetching doctors from:', `${BASE_URL}/doctors`);
            const response = await axios.get(`${BASE_URL}/doctors`);
            setDoctors(response.data);
        } catch (error) {
            console.error('Error fetching doctors:', error);
            Alert.alert('Error', 'Failed to load doctors. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleBookPress = (doctor) => {
        setSelectedDoctor(doctor);
        setProblem('');
        setModalVisible(true);
    };

    const confirmBooking = async () => {
        if (!problem.trim()) {
            Alert.alert('Required', 'Please describe your problem.');
            return;
        }

        setBookingLoading(true);
        try {
            const payload = {
                patientId: user?.userId || user?.email, // Fallback if userId missing
                patientName: user?.name || 'Unknown Patient',
                doctorId: selectedDoctor._id,
                problem: problem,
                date: new Date().toISOString(),
            };

            console.log('Booking payload:', payload);

            await axios.post(`${BASE_URL}/book-consultation`, payload);

            Alert.alert('Success', 'Consultation booked successfully!', [
                { text: 'OK', onPress: () => setModalVisible(false) }
            ]);
        } catch (error) {
            console.error('Booking error:', error);
            Alert.alert('Error', 'Failed to book consultation.');
        } finally {
            setBookingLoading(false);
        }
    };

    const renderDoctor = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>
                        {item.name.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.doctorName}>Dr. {item.name}</Text>
                    <Text style={styles.specialization}>{item.specialization}</Text>
                    <Text style={styles.fee}>Consultation Fee: ₹{item.fee}</Text>
                </View>
            </View>

            <TouchableOpacity
                style={styles.bookButton}
                onPress={() => handleBookPress(item)}
            >
                <Text style={styles.bookButtonText}>Book Consultation</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Consult a Doctor</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#1E88E5" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={doctors}
                    keyExtractor={(item) => item._id}
                    renderItem={renderDoctor}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No doctors available at the moment.</Text>
                    }
                />
            )}

            {/* Booking Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Book Consultation</Text>
                        {selectedDoctor && (
                            <Text style={styles.modalSubtitle}>with Dr. {selectedDoctor.name}</Text>
                        )}

                        <Text style={styles.label}>Describe your problem:</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="E.g., Severe headache since 2 days..."
                            multiline
                            numberOfLines={4}
                            value={problem}
                            onChangeText={setProblem}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={confirmBooking}
                                disabled={bookingLoading}
                            >
                                {bookingLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.confirmButtonText}>Confirm</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        elevation: 4,
    },
    backButton: {
        marginRight: 15,
    },
    backButtonText: {
        fontSize: 16,
        color: '#1E88E5',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    listContainer: {
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1E88E5',
    },
    cardContent: {
        flex: 1,
        justifyContent: 'center',
    },
    doctorName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    specialization: {
        fontSize: 14,
        color: '#1E88E5',
        fontWeight: '600',
        marginTop: 2,
    },
    fee: {
        fontSize: 14,
        color: '#7F8C8D',
        marginTop: 4,
    },
    bookButton: {
        backgroundColor: '#1E88E5',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    bookButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#7F8C8D',
        marginTop: 50,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 25,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 5,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#546E7A',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#34495E',
        marginBottom: 10,
    },
    input: {
        backgroundColor: '#F0F4F8',
        borderRadius: 10,
        padding: 15,
        height: 100,
        textAlignVertical: 'top',
        fontSize: 16,
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#CFD8DC',
        marginRight: 10,
    },
    confirmButton: {
        backgroundColor: '#1E88E5',
        marginLeft: 10,
    },
    cancelButtonText: {
        color: '#455A64',
        fontWeight: 'bold',
        fontSize: 16,
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});