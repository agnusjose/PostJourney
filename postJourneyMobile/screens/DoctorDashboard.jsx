import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    Switch,
    Modal,
    TextInput,
    ActivityIndicator,
    Linking,
    ImageBackground,
    FlatList,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import UserAccountSwitcher from "../components/UserAccountSwitcher";
import { SERVER_CONFIG } from "../config/ServerConfig";
import axios from "axios";
import { EXERCISES } from "../data/exercises";
import { savePrescription, getConsultationPrescription, getDoctorPatientCompliance } from "../services/exerciseService";

const BASE_URL = SERVER_CONFIG.BASE_URL;

// Flat list of exercise options for the picker
const EXERCISE_OPTIONS = Object.entries(EXERCISES).map(([key, val]) => ({
    key,
    name: val.title,
}));

export default function DoctorDashboard({ route, navigation }) {
    const { userId, userName, userEmail, openNotesForId } = route.params || {};
    const { logout } = useAuth();
    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    const [filter, setFilter] = useState("all"); // 'all', 'upcoming', 'completed'

    // Notes Modal State
    const [notesModalVisible, setNotesModalVisible] = useState(false);
    const [selectedConsultation, setSelectedConsultation] = useState(null);
    const [notes, setNotes] = useState({
        diagnosis: '',
        medicines: '',
        exerciseAdvice: '',
        followUpDate: '',
        generalComments: ''
    });
    const [savingNotes, setSavingNotes] = useState(false);
    // Exercise Prescription state for notes modal
    const [selectedExercises, setSelectedExercises] = useState({}); // { exerciseKey: targetReps }
    // Tracks which openNotesForId we've already auto-opened, so it never fires twice
    const notesAutoOpenedForRef = useRef(null);

    // Patient History Modal State
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [patientHistory, setPatientHistory] = useState(null);
    const [patientDocuments, setPatientDocuments] = useState([]);
    const [patientHealthRecord, setPatientHealthRecord] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [patientCompliance, setPatientCompliance] = useState(null);

    // Notification state
    const [notifCount, setNotifCount] = useState(0);
    const [notifList, setNotifList] = useState([]);
    const [notifModalOpen, setNotifModalOpen] = useState(false);

    const fetchNotifications = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/notifications/${userId}`);
            if (res.data.success) {
                setNotifCount(res.data.unreadCount);
                setNotifList(res.data.notifications);
            }
        } catch (e) { }
    };

    const markNotifRead = async (id) => {
        try {
            await axios.put(`${BASE_URL}/api/notifications/${id}/read`);
            fetchNotifications();
        } catch (e) { }
    };

    const markAllNotifsRead = async () => {
        try {
            await axios.put(`${BASE_URL}/api/notifications/${userId}/read-all`);
            fetchNotifications();
        } catch (e) { }
    };

    useEffect(() => {
        fetchDoctorStatus();
    }, [userId]);

    const fetchDoctorStatus = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/api/doctors/available`);
            const doctor = response.data.find(d => d._id === userId);
            if (doctor) setIsOnline(doctor.isOnline);
        } catch (error) {
            console.error("Error fetching doctor status:", error);
        }
    };

    const toggleOnlineStatus = async (value) => {
        try {
            const response = await axios.put(`${BASE_URL}/api/doctor/${userId}/status`, { isOnline: value });
            if (response.data.success) {
                setIsOnline(value);
            }
        } catch (error) {
            console.error("Error updating status:", error);
            Alert.alert("Error", "Failed to update status");
        }
    };

    const fetchConsultations = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/api/doctor/${userId}/consultations`);
            // Sort consultations by date (latest first)
            const sorted = response.data.sort((a, b) => {
                const dateA = new Date(a.consultationDate);
                const dateB = new Date(b.consultationDate);
                return dateB - dateA; // Latest first
            });
            setConsultations(sorted);
        } catch (error) {
            console.error("Error fetching consultations:", error);
        } finally {
            setLoading(false);
        }
    };

    const [alertedSessions, setAlertedSessions] = useState(new Set());

    const checkConsultationReminders = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/api/doctor/${userId}/consultations`);
            const consultations = response.data;

            const now = new Date();
            const updatedAlerted = new Set(alertedSessions);

            consultations.forEach(consult => {
                if (updatedAlerted.has(consult._id)) return;

                const [time, period] = consult.timeSlot.split(' ');
                let [hours, minutes] = time.split(':').map(Number);
                if (period === 'PM' && hours !== 12) hours += 12;
                if (period === 'AM' && hours === 12) hours = 0;

                const consultDate = new Date(consult.consultationDate);
                consultDate.setHours(hours, minutes, 0, 0);

                const diffMinutes = (consultDate - now) / (1000 * 60);

                if (diffMinutes > 0 && diffMinutes <= 5) {
                    updatedAlerted.add(consult._id);
                    Alert.alert(
                        "Meeting Reminder",
                        `Your session with ${consult.patientName} starts in ${Math.round(diffMinutes)} minutes!`
                    );
                }
            });
            setAlertedSessions(updatedAlerted);
        } catch (e) { }
    };

    const [timer, setTimer] = useState(0);

    useEffect(() => {
        fetchConsultations();
        fetchNotifications();
        const interval = setInterval(fetchConsultations, 15000);
        const reminderInterval = setInterval(checkConsultationReminders, 60000);
        const countdownTimer = setInterval(() => setTimer(t => t + 1), 1000);
        const notifInterval = setInterval(fetchNotifications, 30000);

        return () => {
            clearInterval(interval);
            clearInterval(reminderInterval);
            clearInterval(countdownTimer);
            clearInterval(notifInterval);
        };
    }, [userId, alertedSessions]);

    // Auto-open notes when navigating back from ChatScreen after ending meeting.
    // Uses a ref so it only fires ONCE per openNotesForId, regardless of how many
    // times consultations refreshes (every 15s).
    useEffect(() => {
        if (
            openNotesForId &&
            consultations.length > 0 &&
            notesAutoOpenedForRef.current !== openNotesForId
        ) {
            const target = consultations.find(c => c._id === openNotesForId);
            if (target) {
                notesAutoOpenedForRef.current = openNotesForId; // Mark as opened — never fires again for this ID
                handleOpenNotes(target);
            }
        }
    }, [openNotesForId, consultations]);

    const getStatusInfo = (c) => {
        const now = new Date();

        // Parse date using UTC components (timezone-safe)
        const d = new Date(c.consultationDate);
        const [t, p] = c.timeSlot.split(' ');
        let [h, m] = t.split(':').map(Number);
        if (p === 'PM' && h !== 12) h += 12;
        if (p === 'AM' && h === 12) h = 0;

        // Build startTime using UTC date parts to avoid IST/UTC mismatch
        const start = new Date(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate(),
            h, m, 0, 0
        );
        // Session window: slot time to slot time + 60 minutes exactly
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        const isManuallyEnded = c.status === 'completed' || c.status === 'cancelled';

        // ─ Past: 60-min window elapsed OR doctor manually ended ─────────────────
        if (isManuallyEnded || now > end) {
            return { type: 'Ended', label: 'Time is Over', color: '#94a3b8', disabled: true };
        }

        // ─ Active: within [startTime, endTime] ───────────────────────────
        if (now >= start) {
            return {
                type: 'Active',
                label: c.chatStarted ? 'Join Chat' : 'Start Consultation',
                color: '#22c55e',
                disabled: false
            };
        }

        // ─ Upcoming: before slot time → show countdown ────────────────
        const diff = start - now;
        const hh = Math.floor(diff / 3600000);
        const mm = Math.floor((diff % 3600000) / 60000);
        const ss = Math.floor((diff % 60000) / 1000);
        const countdown = `${hh > 0 ? hh + ':' : ''}${mm < 10 ? '0' + mm : mm}:${ss < 10 ? '0' + ss : ss}`;
        return { type: 'Upcoming', label: countdown, color: '#1E88E5', disabled: true };
    };

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: async () => { await logout(); navigation.replace("LoginScreen"); } },
        ]);
    };

    const handleEndMeeting = (item) => {
        Alert.alert(
            "End Meeting",
            `Are you sure you want to end the meeting with ${item.patientName}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "End Meeting",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await axios.post(`${BASE_URL}/api/consultation/${item._id}/end`);
                            if (res.data.success) {
                                // Open notes FIRST, then refresh in background so the modal
                                // is already open before any consultations state update happens.
                                handleOpenNotes(item);
                                fetchConsultations();
                            }
                        } catch (e) {
                            Alert.alert("Error", "Failed to end meeting");
                        }
                    }
                }
            ]
        );
    };

    const handleOpenNotes = async (item) => {
        setSelectedConsultation(item);
        setNotes({
            diagnosis: item.diagnosis || '',
            medicines: item.medicines || '',
            exerciseAdvice: item.exerciseAdvice || '',
            followUpDate: item.followUpDate ? new Date(item.followUpDate).toISOString().split('T')[0] : '',
            generalComments: item.generalComments || ''
        });

        // Load existing prescription for this consultation
        try {
            const prescRes = await getConsultationPrescription(item._id);
            if (prescRes.success && prescRes.prescription) {
                const exMap = {};
                prescRes.prescription.exercises.forEach(ex => {
                    exMap[ex.exerciseKey] = ex.targetReps || 10;
                });
                setSelectedExercises(exMap);
            } else {
                setSelectedExercises({});
            }
        } catch (e) {
            setSelectedExercises({});
        }

        setNotesModalVisible(true);
    };

    const toggleExercise = (key) => {
        setSelectedExercises(prev => {
            const next = { ...prev };
            if (next[key] !== undefined) {
                delete next[key];
            } else {
                next[key] = 10; // default target
            }
            return next;
        });
    };

    const setExerciseReps = (key, reps) => {
        const val = parseInt(reps) || 0;
        setSelectedExercises(prev => ({ ...prev, [key]: val }));
    };

    const handleSaveNotes = async () => {
        if (!selectedConsultation?._id) {
            Alert.alert("Error", "No consultation selected.");
            return;
        }

        // Validate followUpDate if provided
        if (notes.followUpDate && notes.followUpDate.trim() !== "") {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(notes.followUpDate.trim())) {
                Alert.alert("Invalid Date", "Please enter the follow-up date in YYYY-MM-DD format (e.g. 2026-04-15).");
                return;
            }
            const parsed = new Date(notes.followUpDate.trim());
            if (isNaN(parsed.getTime())) {
                Alert.alert("Invalid Date", "The follow-up date you entered is not a valid calendar date.");
                return;
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            parsed.setHours(0, 0, 0, 0);
            if (parsed < today) {
                Alert.alert("Invalid Date", "Follow-up date cannot be in the past. Please enter a future date.");
                return;
            }
        }

        setSavingNotes(true);
        try {
            const res = await axios.post(
                `${BASE_URL}/api/consultation/${selectedConsultation._id}/notes`,
                notes
            );
            if (res.data.success) {
                // Save exercise prescription if any exercises are selected
                const exerciseKeys = Object.keys(selectedExercises);
                if (exerciseKeys.length > 0) {
                    const exercises = exerciseKeys.map(key => {
                        const exData = EXERCISE_OPTIONS.find(e => e.key === key);
                        return {
                            exerciseKey: key,
                            exerciseName: exData?.name || key,
                            targetReps: selectedExercises[key] || 10,
                        };
                    });
                    try {
                        await savePrescription({
                            consultationId: selectedConsultation._id,
                            doctorId: userId,
                            patientId: selectedConsultation.patientId,
                            exercises,
                        });
                    } catch (prescErr) {
                        console.error("Save prescription error:", prescErr);
                    }
                }

                Alert.alert("✅ Saved", "Notes and exercise prescription saved successfully. The patient can now view them.");
                setNotesModalVisible(false);
                fetchConsultations(); // Refresh list so notes appear updated
            } else {
                Alert.alert("Error", res.data.error || "Failed to save notes.");
            }
        } catch (e) {
            console.error("Save notes error:", e.response?.data || e.message);
            Alert.alert("Error", e.response?.data?.error || "Failed to save notes. Check your connection.");
        } finally {
            setSavingNotes(false);
        }
    };

    const handleViewPatientHistory = async (patientId) => {
        setLoadingHistory(true);
        setHistoryModalVisible(true);
        setPatientCompliance(null);
        try {
            const [historyRes, docsRes, healthRes] = await Promise.all([
                axios.get(`${BASE_URL}/api/patient/${patientId}/history`),
                axios.get(`${BASE_URL}/api/patient/${patientId}/documents`),
                axios.get(`${BASE_URL}/api/patient/${patientId}/health-record`).catch(() => ({ data: { success: false } })),
            ]);

            if (historyRes.data.success) {
                setPatientHistory(historyRes.data);
            }
            if (docsRes.data.success) {
                setPatientDocuments(docsRes.data.documents);
            }
            if (healthRes.data.success) {
                setPatientHealthRecord(healthRes.data.record);
            } else {
                setPatientHealthRecord(null);
            }

            // Fetch exercise compliance
            try {
                const compRes = await getDoctorPatientCompliance(userId, patientId);
                if (compRes.success && compRes.compliance) {
                    setPatientCompliance(compRes.compliance);
                }
            } catch (compErr) {
                console.log("No compliance data:", compErr.message);
            }
        } catch (e) {
            Alert.alert("Error", "Failed to load patient history");
        } finally {
            setLoadingHistory(false);
        }
    };

    const openDocument = (fileUrl) => {
        const fullUrl = `${BASE_URL}${fileUrl}`;
        Linking.openURL(fullUrl).catch(() => {
            Alert.alert("Error", "Cannot open document");
        });
    };

    const getFilteredConsultations = () => {
        const now = new Date();
        const filtered = consultations.filter(c => {
            if (filter === "all") return true;

            const d = new Date(c.consultationDate);
            const [t, p] = c.timeSlot.split(' ');
            let [h, m] = t.split(':').map(Number);
            if (p === 'PM' && h !== 12) h += 12;
            if (p === 'AM' && h === 12) h = 0;

            const start = new Date(d);
            start.setHours(h, m, 0, 0);
            const end = new Date(start);
            end.setMinutes(end.getMinutes() + 60);

            if (filter === "upcoming") {
                return now < end && c.status !== 'completed';
            } else if (filter === "completed") {
                return c.status === 'completed' || now > end;
            }
            return true;
        });

        // Sort: upcoming/active first, then completed, then by date descending
        filtered.sort((a, b) => {
            const aCompleted = a.status === 'completed';
            const bCompleted = b.status === 'completed';
            if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
            return new Date(b.consultationDate) - new Date(a.consultationDate);
        });

        // Limit to 10 consultations on dashboard
        return filtered.slice(0, 10);
    };

    return (
        <ImageBackground
            source={require("../assets/pjlogo_bg.png")}
            style={styles.bg}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <ScrollView
                    contentContainerStyle={styles.container}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.welcome}>Welcome Back,</Text>
                            <Text style={styles.userName}> {userName}</Text>
                        </View>
                        <View style={styles.headerRight}>
                            <View style={[styles.statusBadge, isOnline && styles.statusBadgeOnline]}>
                                <View style={[styles.statusDot, isOnline && styles.statusDotOnline]} />
                                <Text style={[styles.statusText, isOnline && styles.statusTextOnline]}>
                                    {isOnline ? "Online" : "Offline"}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.profileButton}
                                onPress={() => navigation.navigate("DoctorProfileCompletion", { email: userEmail, isEditing: true })}
                            >
                                <Text style={styles.profileButtonText}>👤</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.profileButton}
                                onPress={() => { setNotifModalOpen(true); fetchNotifications(); }}
                            >
                                <Text style={styles.profileButtonText}>🔔</Text>
                                {notifCount > 0 && (
                                    <View style={styles.notifBadge}>
                                        <Text style={styles.notifBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Online Status Toggle Card */}
                    <View style={styles.statusCard}>
                        <View style={styles.accentBar} />
                        <View style={styles.statusCardContent}>
                            <View>
                                <Text style={styles.statusCardTitle}>Availability Status</Text>
                                <Text style={styles.statusCardSubtitle}>
                                    {isOnline ? "You're visible to patients" : "You're currently offline"}
                                </Text>
                            </View>
                            <Switch
                                value={isOnline}
                                onValueChange={toggleOnlineStatus}
                                trackColor={{ false: "#cbd5e1", true: "#10B981" }}
                                thumbColor={"#fff"}
                            />
                        </View>
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => navigation.navigate("MyPatients", { userId })}
                        >
                            <View style={styles.accentBar} />
                            <View style={styles.quickActionContent}>
                                <View style={styles.quickActionIconCircle}>
                                    <Text style={styles.quickActionIcon}>👥</Text>
                                </View>
                                <View style={styles.quickActionInfo}>
                                    <Text style={styles.quickActionTitle}>My Patients</Text>
                                    <Text style={styles.quickActionSubtitle}>View patient history and records</Text>
                                </View>
                                <Text style={styles.quickActionArrow}>→</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => navigation.navigate("DoctorPaymentHistory", { userId })}
                        >
                            <View style={styles.accentBar} />
                            <View style={styles.quickActionContent}>
                                <View style={styles.quickActionIconCircle}>
                                    <Text style={styles.quickActionIcon}>💳</Text>
                                </View>
                                <View style={styles.quickActionInfo}>
                                    <Text style={styles.quickActionTitle}>Payment History</Text>
                                    <Text style={styles.quickActionSubtitle}>View earnings and transactions</Text>
                                </View>
                                <Text style={styles.quickActionArrow}>→</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => navigation.navigate("ComplaintsScreen", { userId, userName, userType: "doctor" })}
                        >
                            <View style={styles.accentBar} />
                            <View style={styles.quickActionContent}>
                                <View style={styles.quickActionIconCircle}>
                                    <Text style={styles.quickActionIcon}>🚩</Text>
                                </View>
                                <View style={styles.quickActionInfo}>
                                    <Text style={styles.quickActionTitle}>My Complaints</Text>
                                    <Text style={styles.quickActionSubtitle}>Submit or track complaints</Text>
                                </View>
                                <Text style={styles.quickActionArrow}>→</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Consultations Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Consultations</Text>
                        <View style={styles.filterContainer}>
                            <TouchableOpacity
                                style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
                                onPress={() => setFilter('all')}
                            >
                                <Text style={[styles.filterBtnText, filter === 'all' && styles.filterBtnTextActive]}>All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterBtn, filter === 'upcoming' && styles.filterBtnActive]}
                                onPress={() => setFilter('upcoming')}
                            >
                                <Text style={[styles.filterBtnText, filter === 'upcoming' && styles.filterBtnTextActive]}>Upcoming</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterBtn, filter === 'completed' && styles.filterBtnActive]}
                                onPress={() => setFilter('completed')}
                            >
                                <Text style={[styles.filterBtnText, filter === 'completed' && styles.filterBtnTextActive]}>Completed</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Consultations List */}
                        {getFilteredConsultations().length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No consultations found.</Text>
                            </View>
                        ) : (
                            getFilteredConsultations().map((item) => {
                                const s = getStatusInfo(item);

                                return (
                                    <View key={item._id} style={styles.consultCard}>
                                        <View style={[styles.consultAccentBar, { backgroundColor: s.color }]} />
                                        <View style={styles.consultContent}>
                                            <TouchableOpacity onPress={() => handleViewPatientHistory(item.patientId)}>
                                                <Text style={styles.patientName}>{item.patientName} 📋</Text>
                                            </TouchableOpacity>
                                            <Text style={styles.problem}>{item.problemDescription}</Text>
                                            <Text style={styles.date}>
                                                {new Date(item.consultationDate).toDateString()} • {item.timeSlot}
                                            </Text>

                                            <View style={styles.actionGroup}>
                                                {/* Main button: countdown OR Start Consultation / Join Chat OR Time is Over */}
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, { backgroundColor: s.color }]}
                                                    disabled={s.disabled}
                                                    onPress={async () => {
                                                        if (s.type === 'Active') {
                                                            if (!item.chatStarted) {
                                                                // Mark session started in DB on first entry
                                                                try { await axios.post(`${BASE_URL}/api/consultation/${item._id}/start`); } catch (e) { }
                                                            }
                                                            navigation.navigate("ChatScreen", { consultation: { ...item, chatStarted: true } });
                                                        }
                                                    }}
                                                >
                                                    <Text style={styles.actionBtnText}>{s.label}</Text>
                                                </TouchableOpacity>

                                                {/* End button: only during active window */}
                                                {s.type === 'Active' && (
                                                    <TouchableOpacity
                                                        style={styles.endBtn}
                                                        onPress={() => handleEndMeeting(item)}
                                                    >
                                                        <Text style={styles.endBtnText}>End</Text>
                                                    </TouchableOpacity>
                                                )}

                                                {/* Notes button: only after session ends */}
                                                {s.type === 'Ended' && (
                                                    <TouchableOpacity
                                                        style={styles.notesBtn}
                                                        onPress={() => handleOpenNotes(item)}
                                                    >
                                                        <Text style={styles.notesBtnText}>Notes</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Consultation Notes Modal */}
            <Modal
                visible={notesModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setNotesModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Consultation Notes</Text>
                        <Text style={styles.modalSubtitle}>Patient: {selectedConsultation?.patientName}</Text>

                        <Text style={styles.label}>Diagnosis:</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Primary condition..."
                            value={notes.diagnosis}
                            onChangeText={(val) => setNotes({ ...notes, diagnosis: val })}
                        />

                        <Text style={styles.label}>Medicines:</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Prescribed medicines..."
                            multiline
                            numberOfLines={4}
                            value={notes.medicines}
                            onChangeText={(val) => setNotes({ ...notes, medicines: val })}
                        />

                        <Text style={styles.label}>Prescribe Exercises:</Text>
                        <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                            Select exercises and set target reps per day
                        </Text>
                        <View style={{ maxHeight: 200, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 }}>
                            <ScrollView nestedScrollEnabled>
                                {EXERCISE_OPTIONS.map(ex => {
                                    const isSelected = selectedExercises[ex.key] !== undefined;
                                    return (
                                        <View key={ex.key} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                                            <TouchableOpacity
                                                style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: isSelected ? '#10B981' : '#cbd5e1', backgroundColor: isSelected ? '#10B981' : 'transparent', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}
                                                onPress={() => toggleExercise(ex.key)}
                                            >
                                                {isSelected && <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>✓</Text>}
                                            </TouchableOpacity>
                                            <Text style={{ flex: 1, fontSize: 13, color: '#2C3E50', fontWeight: isSelected ? '700' : '400' }}>{ex.name}</Text>
                                            {isSelected && (
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 11, color: '#64748b', marginRight: 4 }}>Reps:</Text>
                                                    <TextInput
                                                        style={{ width: 50, height: 30, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#0A5F7A' }}
                                                        keyboardType="numeric"
                                                        value={String(selectedExercises[ex.key] || '')}
                                                        onChangeText={(v) => setExerciseReps(ex.key, v)}
                                                    />
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>
                        {Object.keys(selectedExercises).length > 0 && (
                            <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '600', marginBottom: 8 }}>
                                ✓ {Object.keys(selectedExercises).length} exercise(s) selected
                            </Text>
                        )}

                        <Text style={styles.label}>Additional Exercise Notes:</Text>
                        <TextInput
                            style={[styles.input, { height: 60 }]}
                            placeholder="Any extra advice..."
                            multiline
                            numberOfLines={2}
                            value={notes.exerciseAdvice}
                            onChangeText={(val) => setNotes({ ...notes, exerciseAdvice: val })}
                        />

                        <Text style={styles.label}>Follow-up Date (YYYY-MM-DD):</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2026-02-15"
                            value={notes.followUpDate}
                            onChangeText={(val) => setNotes({ ...notes, followUpDate: val })}
                        />

                        <Text style={styles.label}>General Comments:</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Additional notes..."
                            multiline
                            numberOfLines={4}
                            value={notes.generalComments}
                            onChangeText={(val) => setNotes({ ...notes, generalComments: val })}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => setNotesModalVisible(false)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.saveBtn]}
                                onPress={handleSaveNotes}
                                disabled={savingNotes}
                            >
                                <Text style={styles.saveBtnText}>{savingNotes ? "Saving..." : "Save Notes"}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Patient History Modal */}
            <Modal
                visible={historyModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setHistoryModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={styles.modalContainer}>
                        {loadingHistory ? (
                            <ActivityIndicator size="large" color="#1E88E5" />
                        ) : (
                            <>
                                <Text style={styles.modalTitle}>Patient History</Text>
                                {patientHistory?.patient && (
                                    <View style={styles.patientInfoCard}>
                                        <Text style={styles.patientInfoText}>Name: {patientHistory.patient.name}</Text>
                                        <Text style={styles.patientInfoText}>Age: {patientHistory.patient.patientProfile?.age || 'N/A'}</Text>
                                        <Text style={styles.patientInfoText}>Gender: {patientHistory.patient.patientProfile?.gender || 'N/A'}</Text>
                                        <Text style={styles.patientInfoText}>Condition: {patientHistory.patient.patientProfile?.primaryCondition || 'N/A'}</Text>
                                        <Text style={styles.patientInfoText}>Phone: {patientHistory.patient.phoneNumber || 'N/A'}</Text>
                                    </View>
                                )}

                                <Text style={styles.sectionTitle}>📄 Medical Documents</Text>
                                {patientDocuments.length === 0 ? (
                                    <Text style={styles.emptyText}>No documents uploaded</Text>
                                ) : (
                                    patientDocuments.map(doc => (
                                        <TouchableOpacity
                                            key={doc._id}
                                            style={styles.documentCard}
                                            onPress={() => openDocument(doc.fileUrl)}
                                        >
                                            <Text style={styles.documentName}>{doc.fileName}</Text>
                                            <Text style={styles.documentDate}>
                                                {new Date(doc.uploadedAt).toLocaleDateString()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))
                                )}

                                <Text style={styles.sectionTitle}>📋 Previous Consultations</Text>

                                {/* Health Vitals Section */}
                                {patientHealthRecord && (
                                    <>
                                        <Text style={styles.sectionTitle}>❤️ Health Vitals</Text>
                                        {patientHealthRecord.diseaseHistory ? (
                                            <Text style={styles.historyDetail}>Disease History: {patientHealthRecord.diseaseHistory}</Text>
                                        ) : null}
                                        {patientHealthRecord.allergies ? (
                                            <Text style={styles.historyDetail}>Allergies: {patientHealthRecord.allergies}</Text>
                                        ) : null}
                                        {patientHealthRecord.currentMedications ? (
                                            <Text style={styles.historyDetail}>Medications: {patientHealthRecord.currentMedications}</Text>
                                        ) : null}
                                        {patientHealthRecord.bpRecords?.length > 0 && (
                                            <View style={styles.historyCard}>
                                                <Text style={styles.historyDoctor}>Blood Pressure (Latest 3)</Text>
                                                {patientHealthRecord.bpRecords.slice(-3).reverse().map((bp, i) => (
                                                    <Text key={i} style={styles.historyDetail}>
                                                        {bp.systolic}/{bp.diastolic} mmHg — {new Date(bp.date).toLocaleDateString()}
                                                    </Text>
                                                ))}
                                            </View>
                                        )}
                                        {patientHealthRecord.sugarRecords?.length > 0 && (
                                            <View style={styles.historyCard}>
                                                <Text style={styles.historyDoctor}>Blood Sugar (Latest 3)</Text>
                                                {patientHealthRecord.sugarRecords.slice(-3).reverse().map((s, i) => (
                                                    <Text key={i} style={styles.historyDetail}>
                                                        {s.level} mg/dL ({s.type}) — {new Date(s.date).toLocaleDateString()}
                                                    </Text>
                                                ))}
                                            </View>
                                        )}
                                        {patientHealthRecord.cholesterolRecords?.length > 0 && (
                                            <View style={styles.historyCard}>
                                                <Text style={styles.historyDoctor}>Cholesterol (Latest 3)</Text>
                                                {patientHealthRecord.cholesterolRecords.slice(-3).reverse().map((c, i) => (
                                                    <Text key={i} style={styles.historyDetail}>
                                                        {c.level} mg/dL — {new Date(c.date).toLocaleDateString()}
                                                    </Text>
                                                ))}
                                            </View>
                                        )}
                                    </>
                                )}

                                {patientHistory?.consultations?.length === 0 ? (
                                    <Text style={styles.emptyText}>No previous consultations</Text>
                                ) : (
                                    patientHistory?.consultations?.map((consult, idx) => (
                                        <View key={idx} style={styles.historyCard}>
                                            <Text style={styles.historyDate}>
                                                {new Date(consult.consultationDate).toDateString()} - {consult.timeSlot}
                                            </Text>
                                            <Text style={styles.historyDoctor}> {consult.doctorName}</Text>
                                            {consult.diagnosis && (
                                                <Text style={styles.historyDetail}>Diagnosis: {consult.diagnosis}</Text>
                                            )}
                                            {consult.medicines && (
                                                <Text style={styles.historyDetail}>Medicines: {consult.medicines}</Text>
                                            )}
                                        </View>
                                    ))
                                )}

                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.saveBtn, { marginTop: 20 }]}
                                    onPress={() => setHistoryModalVisible(false)}
                                >
                                    <Text style={styles.saveBtnText}>Close</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </ScrollView>
                </View>
            </Modal>

            {/* Notification Modal */}
            <Modal visible={notifModalOpen} transparent animationType="slide" onRequestClose={() => setNotifModalOpen(false)}>
                <View style={styles.modalOverlay}>
                    <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', padding: 20, marginTop: 'auto' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: '#2C3E50' }}>Notifications</Text>
                            <TouchableOpacity onPress={markAllNotifsRead}>
                                <Text style={{ color: '#1E88E5', fontWeight: '700', fontSize: 13 }}>Mark all read</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={notifList}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: item.read ? 'transparent' : '#f0f9ff' }}
                                    onPress={() => markNotifRead(item._id)}
                                >
                                    <Text style={{ fontSize: 18, marginRight: 10 }}>{item.read ? '✅' : '🔔'}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 13, color: '#2C3E50', lineHeight: 18, fontWeight: item.read ? '400' : '700' }}>{item.message}</Text>
                                        <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{new Date(item.createdAt).toLocaleString()}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30, color: '#94a3b8' }}>No notifications</Text>}
                        />
                        <TouchableOpacity style={[styles.modalBtn, styles.saveBtn, { marginTop: 12 }]} onPress={() => setNotifModalOpen(false)}>
                            <Text style={styles.saveBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1 },
    overlay: { flex: 1, backgroundColor: 'rgba(245, 250, 255, 0.75)' },
    container: {
        paddingHorizontal: 22,
        paddingTop: 60,
        paddingBottom: 40,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    welcome: {
        fontSize: 15,
        color: "#5C768D",
        fontWeight: "500",
    },
    userName: {
        fontSize: 26,
        fontWeight: "800",
        color: "#2C3E50",
        letterSpacing: -0.5,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    statusBadgeOnline: {
        backgroundColor: '#E8F5E9',
        borderColor: '#C8E6C9',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#DC2626',
        marginRight: 6,
    },
    statusDotOnline: {
        backgroundColor: '#7CB342',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#DC2626',
    },
    statusTextOnline: {
        color: '#388E3C',
    },
    profileButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#E0F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D7E5ED',
    },
    profileButtonText: {
        fontSize: 18,
    },
    notifBadge: {
        position: 'absolute', top: -4, right: -4,
        backgroundColor: '#EF4444', borderRadius: 10,
        minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 4,
    },
    notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

    // Status Card
    statusCard: {
        backgroundColor: "#fff",
        borderRadius: 22,
        padding: 20,
        marginBottom: 25,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 15,
        overflow: 'hidden',
        position: 'relative',
    },
    accentBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 6,
        backgroundColor: '#0A5F7A',
    },
    statusCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusCardTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0A3D52",
        marginBottom: 4,
    },
    statusCardSubtitle: {
        fontSize: 13,
        color: "#4A7A8C",
    },

    // Quick Action Card
    quickActionCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#0A5F7A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#D7E5ED',
        overflow: 'hidden',
        position: 'relative',
    },
    quickActionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 8,
    },
    quickActionIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E0F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    quickActionIcon: {
        fontSize: 24,
    },
    quickActionInfo: {
        flex: 1,
    },
    quickActionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0A3D52",
    },
    quickActionSubtitle: {
        fontSize: 12,
        color: "#8AACB8",
    },
    quickActionArrow: {
        fontSize: 20,
        color: "#bdc3c7",
        marginLeft: 10,
    },

    // Sections
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#0A3D52",
        marginBottom: 15,
        letterSpacing: -0.5,
    },

    // Filters
    filterContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 10,
    },
    filterBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderWidth: 1,
        borderColor: '#D7E5ED',
    },
    filterBtnActive: {
        backgroundColor: '#0A5F7A',
        borderColor: '#0A5F7A',
    },
    filterBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4A7A8C',
    },
    filterBtnTextActive: {
        color: '#fff',
    },

    // Consultation Card
    consultCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 0,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#0A5F7A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#D7E5ED',
        overflow: 'hidden',
        position: 'relative',
    },
    consultAccentBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 6,
        backgroundColor: '#0A5F7A',
    },
    consultContent: {
        padding: 16,
        paddingLeft: 22,
    },
    requestCard: {
        borderColor: '#F59E0B',
        backgroundColor: '#FFFBEB',
    },
    patientName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0A3D52",
        marginBottom: 4,
    },
    problem: {
        fontSize: 14,
        color: "#4A7A8C",
        marginBottom: 6,
    },
    date: {
        fontSize: 13,
        fontWeight: "600",
        color: "#94a3b8",
    },

    // Action Buttons
    actionGroup: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 15,
        gap: 10,
    },
    actionBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: '#0A5F7A',
    },
    actionBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
    },
    endBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    endBtnText: {
        color: '#DC2626',
        fontWeight: '700',
        fontSize: 13,
    },
    notesBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    notesBtnText: {
        color: '#64748b',
        fontWeight: '700',
        fontSize: 13,
    },
    waitingBadge: {
        backgroundColor: '#FEF3C7',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 5,
        marginBottom: 8,
    },
    waitingText: {
        color: '#B45309',
        fontSize: 11,
        fontWeight: '700',
    },

    // Empty State
    emptyContainer: {
        padding: 30,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 15,
        color: '#94a3b8',
        fontStyle: 'italic',
    },
    logoutButton: {
        marginTop: 10,
        padding: 15,
        alignItems: 'center',
    },
    logoutButtonText: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '600',
    },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0A3D52',
        textAlign: 'center',
        marginBottom: 5,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#4A7A8C',
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 15,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 6,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    modalBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtn: {
        backgroundColor: '#F1F5F9',
        marginRight: 10,
    },
    saveBtn: {
        backgroundColor: '#0A5F7A',
        marginLeft: 10,
    },
    cancelBtnText: {
        color: '#64748b',
        fontWeight: '700',
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: '700',
    },

    // Patient Info & Docs
    patientInfoCard: {
        backgroundColor: '#F8FAFC',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    patientInfoText: {
        fontSize: 14,
        color: '#334155',
        marginBottom: 4,
    },
    documentCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#0A5F7A',
    },
    documentName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    documentDate: {
        fontSize: 12,
        color: '#64748b',
    },
    historyCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    historyDate: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0A5F7A',
        marginBottom: 4,
    },
    historyDoctor: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 2,
    },
    historyDetail: {
        fontSize: 13,
        color: '#64748b',
    },
});