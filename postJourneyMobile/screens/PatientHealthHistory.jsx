import React, { useEffect, useState, useCallback } from "react";
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    Alert, ActivityIndicator, Platform, StatusBar, Modal, Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";

const BASE_URL = "http://192.168.8.72:5000";

const C = {
    primary: "#0A5F7A", secondary: "#1D8FAB", accent: "#2EC4B6",
    surface: "#FFFFFF", bg: "#F0F6F9", textDark: "#0D2535",
    textMid: "#4A6B7C", textLight: "#8BA9B8", danger: "#EF4444",
    cardBorder: "#DBE8EE",
};

export default function PatientHealthHistory({ route, navigation }) {
    const { userId } = route.params;
    const [loading, setLoading] = useState(true);
    const [record, setRecord] = useState(null);
    const [activeTab, setActiveTab] = useState("bp");

    // Form modals
    const [bpModalVisible, setBpModalVisible] = useState(false);
    const [sugarModalVisible, setSugarModalVisible] = useState(false);
    const [cholModalVisible, setCholModalVisible] = useState(false);
    const [infoModalVisible, setInfoModalVisible] = useState(false);

    // Form fields
    const [systolic, setSystolic] = useState("");
    const [diastolic, setDiastolic] = useState("");
    const [sugarLevel, setSugarLevel] = useState("");
    const [sugarType, setSugarType] = useState("random");
    const [cholLevel, setCholLevel] = useState("");
    const [diseaseHistory, setDiseaseHistory] = useState("");
    const [allergies, setAllergies] = useState("");
    const [currentMedications, setCurrentMedications] = useState("");
    const [reports, setReports] = useState([]);
    const [uploadingReport, setUploadingReport] = useState(false);

    const fetchRecord = useCallback(async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/patient/${userId}/health-record`);
            if (res.data.success) setRecord(res.data.record);
        } catch (e) {
            console.log(
                "Health record fetch error:",
                e?.response?.status,
                e?.response?.config?.url || e?.message
            );
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const fetchReports = useCallback(async () => {
        try {
            const res = await axios.get(`${BASE_URL}/api/patient/${userId}/documents`);
            if (res.data.success) {
                setReports(res.data.documents || []);
            }
        } catch (e) {
            console.log(
                "Documents fetch error:",
                e?.response?.status,
                e?.response?.config?.url || e?.message
            );
        }
    }, [userId]);

    useEffect(() => {
        fetchRecord();
        fetchReports();
    }, [fetchRecord, fetchReports]);

    const addBP = async () => {
        if (!systolic || !diastolic) return Alert.alert("Error", "Enter both systolic and diastolic");
        try {
            await axios.post(`${BASE_URL}/api/patient/${userId}/health-record/bp`, {
                systolic: Number(systolic), diastolic: Number(diastolic),
            });
            setSystolic(""); setDiastolic("");
            setBpModalVisible(false);
            fetchRecord();
            Alert.alert("✅", "BP reading added");
        } catch (e) { Alert.alert("Error", "Failed to add BP"); }
    };

    const addSugar = async () => {
        if (!sugarLevel) return Alert.alert("Error", "Enter sugar level");
        try {
            await axios.post(`${BASE_URL}/api/patient/${userId}/health-record/sugar`, {
                level: Number(sugarLevel), type: sugarType,
            });
            setSugarLevel("");
            setSugarModalVisible(false);
            fetchRecord();
            Alert.alert("✅", "Sugar reading added");
        } catch (e) { Alert.alert("Error", "Failed to add sugar"); }
    };

    const addCholesterol = async () => {
        if (!cholLevel) return Alert.alert("Error", "Enter cholesterol level");
        try {
            await axios.post(`${BASE_URL}/api/patient/${userId}/health-record/cholesterol`, {
                level: Number(cholLevel),
            });
            setCholLevel("");
            setCholModalVisible(false);
            fetchRecord();
            Alert.alert("✅", "Cholesterol reading added");
        } catch (e) { Alert.alert("Error", "Failed to add cholesterol"); }
    };

    const saveHealthInfo = async () => {
        try {
            await axios.put(`${BASE_URL}/api/patient/${userId}/health-record`, {
                diseaseHistory, allergies, currentMedications,
            });
            setInfoModalVisible(false);
            fetchRecord();
            Alert.alert("✅", "Health info updated");
        } catch (e) { Alert.alert("Error", "Failed to save info"); }
    };

    const handleUploadReport = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permission.status !== "granted") {
                Alert.alert("Permission required", "Please allow access to your photos to upload reports.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
            });

            if (result.canceled) return;

            const asset = result.assets[0];
            const uri = asset.uri;
            const filename = uri.split("/").pop() || "report.jpg";
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : "image/jpeg";

            const formData = new FormData();
            formData.append("patientId", userId);
            formData.append("documentType", "lab_report");
            // field name must match documentUpload.single("document")
            formData.append("document", { uri, name: filename, type });

            setUploadingReport(true);
            const res = await axios.post(
                `${BASE_URL}/api/patient/documents/upload`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            if (res.data?.success) {
                Alert.alert("✅", "Report uploaded");
                fetchReports();
            } else {
                Alert.alert("Error", res.data?.message || "Failed to upload report");
            }
        } catch (e) {
            console.log("Report upload error:", e?.response?.data || e?.message);
            Alert.alert("Error", "Failed to upload report");
        } finally {
            setUploadingReport(false);
        }
    };

    const openReport = (fileUrl) => {
        const fullUrl = `${BASE_URL}${fileUrl}`;
        Linking.openURL(fullUrl).catch(() => {
            Alert.alert("Error", "Cannot open report");
        });
    };

    const tabs = [
        { key: "bp", label: "Blood Pressure", icon: "heart-pulse" },
        { key: "sugar", label: "Blood Sugar", icon: "water" },
        { key: "chol", label: "Cholesterol", icon: "flask" },
        { key: "info", label: "Health Info", icon: "clipboard-text" },
    ];

    const renderBPTab = () => (
        <View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setBpModalVisible(true)}>
                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                <Text style={styles.addBtnText}>Add BP Reading</Text>
            </TouchableOpacity>
            {(record?.bpRecords || []).slice().reverse().map((r, i) => (
                <View key={i} style={styles.recordCard}>
                    <View style={styles.recordRow}>
                        <Text style={styles.recordValue}>{r.systolic}/{r.diastolic}</Text>
                        <Text style={styles.recordUnit}>mmHg</Text>
                    </View>
                    <Text style={styles.recordDate}>{new Date(r.date).toLocaleString()}</Text>
                    {r.systolic > 140 || r.diastolic > 90 ? (
                        <Text style={styles.warningText}>⚠️ High</Text>
                    ) : r.systolic < 90 || r.diastolic < 60 ? (
                        <Text style={[styles.warningText, { color: '#F59E0B' }]}>⚠️ Low</Text>
                    ) : (
                        <Text style={[styles.warningText, { color: '#10B981' }]}>✅ Normal</Text>
                    )}
                </View>
            ))}
            {(!record?.bpRecords || record.bpRecords.length === 0) && (
                <Text style={styles.emptyText}>No BP records yet. Add your first reading.</Text>
            )}
        </View>
    );

    const renderSugarTab = () => (
        <View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setSugarModalVisible(true)}>
                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                <Text style={styles.addBtnText}>Add Sugar Reading</Text>
            </TouchableOpacity>
            {(record?.sugarRecords || []).slice().reverse().map((r, i) => (
                <View key={i} style={styles.recordCard}>
                    <View style={styles.recordRow}>
                        <Text style={styles.recordValue}>{r.level}</Text>
                        <Text style={styles.recordUnit}>mg/dL ({r.type})</Text>
                    </View>
                    <Text style={styles.recordDate}>{new Date(r.date).toLocaleString()}</Text>
                </View>
            ))}
            {(!record?.sugarRecords || record.sugarRecords.length === 0) && (
                <Text style={styles.emptyText}>No sugar records yet.</Text>
            )}
        </View>
    );

    const renderCholTab = () => (
        <View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setCholModalVisible(true)}>
                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                <Text style={styles.addBtnText}>Add Cholesterol Reading</Text>
            </TouchableOpacity>
            {(record?.cholesterolRecords || []).slice().reverse().map((r, i) => (
                <View key={i} style={styles.recordCard}>
                    <View style={styles.recordRow}>
                        <Text style={styles.recordValue}>{r.level}</Text>
                        <Text style={styles.recordUnit}>mg/dL</Text>
                    </View>
                    <Text style={styles.recordDate}>{new Date(r.date).toLocaleString()}</Text>
                </View>
            ))}
            {(!record?.cholesterolRecords || record.cholesterolRecords.length === 0) && (
                <Text style={styles.emptyText}>No cholesterol records yet.</Text>
            )}
        </View>
    );

    const renderInfoTab = () => (
        <View>
            <TouchableOpacity style={styles.addBtn} onPress={() => {
                setDiseaseHistory(record?.diseaseHistory || "");
                setAllergies(record?.allergies || "");
                setCurrentMedications(record?.currentMedications || "");
                setInfoModalVisible(true);
            }}>
                <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
                <Text style={styles.addBtnText}>Edit Health Info</Text>
            </TouchableOpacity>
            <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Disease History</Text>
                <Text style={styles.infoValue}>{record?.diseaseHistory || "Not specified"}</Text>
            </View>
            <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Allergies</Text>
                <Text style={styles.infoValue}>{record?.allergies || "None"}</Text>
            </View>
            <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Current Medications</Text>
                <Text style={styles.infoValue}>{record?.currentMedications || "None"}</Text>
            </View>
            <View style={{ marginTop: 24 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Text style={styles.infoLabel}>Lab & Scan Reports</Text>
                    <TouchableOpacity
                        style={[styles.addBtn, { paddingVertical: 10, paddingHorizontal: 14, marginBottom: 0 }]}
                        onPress={handleUploadReport}
                        disabled={uploadingReport}
                    >
                        <MaterialCommunityIcons name="file-upload-outline" size={16} color="#fff" />
                        <Text style={styles.addBtnText}>{uploadingReport ? "Uploading..." : "Upload Report"}</Text>
                    </TouchableOpacity>
                </View>
                {reports.length === 0 ? (
                    <Text style={styles.emptyText}>No reports uploaded yet.</Text>
                ) : (
                    reports.map((doc) => (
                        <TouchableOpacity
                            key={doc._id}
                            style={styles.infoCard}
                            onPress={() => openReport(doc.fileUrl)}
                        >
                            <Text style={styles.infoLabel}>
                                {doc.documentType === "lab_report" ? "Lab Report" : "Medical Document"}
                            </Text>
                            <Text style={styles.infoValue}>{doc.fileName}</Text>
                            <Text style={[styles.recordDate, { marginTop: 4 }]}>
                                {new Date(doc.uploadedAt).toLocaleString()}
                            </Text>
                        </TouchableOpacity>
                    ))
                )}
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg }}>
                <ActivityIndicator size="large" color={C.primary} />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 10 }}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.heroTitle}>Health History</Text>
                <Text style={styles.heroSub}>Track your vitals and health records</Text>
            </LinearGradient>

            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContainer}>
                {tabs.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <MaterialCommunityIcons name={tab.icon} size={16} color={activeTab === tab.key ? "#fff" : C.textMid} />
                        <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                {activeTab === "bp" && renderBPTab()}
                {activeTab === "sugar" && renderSugarTab()}
                {activeTab === "chol" && renderCholTab()}
                {activeTab === "info" && renderInfoTab()}
            </ScrollView>

            {/* BP Modal */}
            <Modal visible={bpModalVisible} transparent animationType="slide" onRequestClose={() => setBpModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Add BP Reading</Text>
                        <TextInput style={styles.input} placeholder="Systolic (e.g. 120)" keyboardType="numeric" value={systolic} onChangeText={setSystolic} />
                        <TextInput style={styles.input} placeholder="Diastolic (e.g. 80)" keyboardType="numeric" value={diastolic} onChangeText={setDiastolic} />
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setBpModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={addBP}>
                                <Text style={styles.saveBtnText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Sugar Modal */}
            <Modal visible={sugarModalVisible} transparent animationType="slide" onRequestClose={() => setSugarModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Add Sugar Reading</Text>
                        <TextInput style={styles.input} placeholder="Sugar level (mg/dL)" keyboardType="numeric" value={sugarLevel} onChangeText={setSugarLevel} />
                        <View style={styles.typeRow}>
                            {["fasting", "postprandial", "random"].map(t => (
                                <TouchableOpacity key={t} style={[styles.typeChip, sugarType === t && styles.typeChipActive]} onPress={() => setSugarType(t)}>
                                    <Text style={[styles.typeChipText, sugarType === t && { color: '#fff' }]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSugarModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={addSugar}>
                                <Text style={styles.saveBtnText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Cholesterol Modal */}
            <Modal visible={cholModalVisible} transparent animationType="slide" onRequestClose={() => setCholModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Add Cholesterol Reading</Text>
                        <TextInput style={styles.input} placeholder="Cholesterol level (mg/dL)" keyboardType="numeric" value={cholLevel} onChangeText={setCholLevel} />
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCholModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={addCholesterol}>
                                <Text style={styles.saveBtnText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Health Info Modal */}
            <Modal visible={infoModalVisible} transparent animationType="slide" onRequestClose={() => setInfoModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Edit Health Info</Text>
                        <Text style={styles.fieldLabel}>Disease History</Text>
                        <TextInput style={[styles.input, styles.textArea]} placeholder="e.g. Diabetes, Hypertension" multiline value={diseaseHistory} onChangeText={setDiseaseHistory} />
                        <Text style={styles.fieldLabel}>Allergies</Text>
                        <TextInput style={styles.input} placeholder="e.g. Penicillin, Peanuts" value={allergies} onChangeText={setAllergies} />
                        <Text style={styles.fieldLabel}>Current Medications</Text>
                        <TextInput style={[styles.input, styles.textArea]} placeholder="e.g. Metformin 500mg" multiline value={currentMedications} onChangeText={setCurrentMedications} />
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setInfoModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={saveHealthInfo}>
                                <Text style={styles.saveBtnText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    hero: {
        paddingTop: Platform.OS === "ios" ? 56 : StatusBar.currentHeight + 16,
        paddingBottom: 20, paddingHorizontal: 22,
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
    },
    heroTitle: { fontSize: 24, fontWeight: "800", color: "#fff", marginBottom: 4 },
    heroSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
    tabScroll: { maxHeight: 56 },
    tabContainer: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    tab: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        backgroundColor: C.surface, borderWidth: 1, borderColor: C.cardBorder,
    },
    tabActive: { backgroundColor: C.primary, borderColor: C.primary },
    tabText: { fontSize: 12, fontWeight: "700", color: C.textMid },
    tabTextActive: { color: "#fff" },
    body: { padding: 20, paddingBottom: 40 },
    addBtn: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14,
        paddingHorizontal: 20, alignSelf: "flex-start", marginBottom: 16,
    },
    addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    recordCard: {
        backgroundColor: C.surface, borderRadius: 14, padding: 16,
        marginBottom: 10, borderWidth: 1, borderColor: C.cardBorder,
    },
    recordRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    recordValue: { fontSize: 22, fontWeight: "800", color: C.textDark },
    recordUnit: { fontSize: 13, color: C.textMid, fontWeight: "600" },
    recordDate: { fontSize: 11, color: C.textLight, marginTop: 4 },
    warningText: { fontSize: 12, fontWeight: "700", color: C.danger, marginTop: 4 },
    emptyText: { textAlign: "center", color: C.textLight, marginTop: 30, fontSize: 14 },
    infoCard: {
        backgroundColor: C.surface, borderRadius: 14, padding: 16,
        marginBottom: 10, borderWidth: 1, borderColor: C.cardBorder,
    },
    infoLabel: { fontSize: 12, fontWeight: "700", color: C.textMid, marginBottom: 4 },
    infoValue: { fontSize: 15, fontWeight: "500", color: C.textDark },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
    modalBox: { backgroundColor: "#fff", borderRadius: 20, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: "800", color: C.textDark, marginBottom: 16 },
    input: {
        backgroundColor: "#F0F4F8", borderRadius: 10, padding: 14,
        fontSize: 16, marginBottom: 12, color: C.textDark,
    },
    textArea: { height: 80, textAlignVertical: "top" },
    fieldLabel: { fontSize: 13, fontWeight: "700", color: C.textMid, marginBottom: 4 },
    typeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    typeChip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        backgroundColor: "#F0F4F8", borderWidth: 1, borderColor: C.cardBorder,
    },
    typeChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    typeChipText: { fontSize: 12, fontWeight: "700", color: C.textMid, textTransform: "capitalize" },
    modalBtns: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 8 },
    cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: "#f1f5f9" },
    cancelBtnText: { color: C.textMid, fontWeight: "700" },
    saveBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: C.primary },
    saveBtnText: { color: "#fff", fontWeight: "700" },
});
