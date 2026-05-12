import React, { useEffect, useState, useCallback } from "react";
import {
    View, Text, StyleSheet, ScrollView, RefreshControl,
    StatusBar, Platform, ActivityIndicator, TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getPatientPrescriptions, getExerciseSummary } from "../services/exerciseService";
import { EXERCISES } from "../data/exercises";

const C = {
    primary: "#0A5F7A", secondary: "#1D8FAB", accent: "#2EC4B6",
    bg: "#F0F6F9", textDark: "#0D2535", textMid: "#4A6B7C",
    textLight: "#8BA9B8", cardBorder: "#DBE8EE", success: "#10B981",
    warning: "#F59E0B", danger: "#EF4444",
};

const PERIOD_TABS = [
    { key: "daily", label: "Today", icon: "calendar-today" },
    { key: "weekly", label: "This Week", icon: "calendar-week" },
    { key: "monthly", label: "This Month", icon: "calendar-month" },
];

export default function RecommendedExercises({ route, navigation }) {
    const userId = route.params?.userId || "unknown";

    const [prescriptions, setPrescriptions] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState("daily");

    const fetchData = useCallback(async () => {
        try {
            const [prescRes, summRes] = await Promise.all([
                getPatientPrescriptions(userId),
                getExerciseSummary(userId),
            ]);
            if (prescRes.success) setPrescriptions(prescRes.prescriptions || []);
            if (summRes.success) setSummary(summRes.summary || {});
        } catch (err) {
            console.error("Fetch recommended exercises error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onRefresh = () => { setRefreshing(true); fetchData(); };

    // Flatten all prescribed exercises from all prescriptions
    const prescribedExercises = [];
    const seenKeys = new Set();
    prescriptions.forEach(p => {
        p.exercises.forEach(ex => {
            if (!seenKeys.has(ex.exerciseKey)) {
                seenKeys.add(ex.exerciseKey);
                prescribedExercises.push({
                    ...ex,
                    doctorName: p.consultationId?.doctorName || "Doctor",
                    prescriptionDate: p.createdAt,
                });
            }
        });
    });

    // Calculate target multiplier based on period
    const getTarget = (targetReps) => {
        if (period === "weekly") return targetReps * 7;
        if (period === "monthly") return targetReps * 30;
        return targetReps;
    };

    // Get completed reps from summary
    const getCompleted = (exerciseName) => {
        const data = summary[exerciseName];
        if (!data) return 0;
        return data[period] || 0;
    };

    const getProgress = (targetReps, exerciseName) => {
        const target = getTarget(targetReps);
        const completed = getCompleted(exerciseName);
        if (target <= 0) return 0;
        return Math.min(completed / target, 1);
    };

    // Navigate to exercise monitor
    const startExercise = (exerciseKey) => {
        const exerciseData = EXERCISES[exerciseKey];
        if (exerciseData?.monitorScreen) {
            navigation.navigate(exerciseData.monitorScreen, { userId });
        }
    };

    // Totals
    const totalTarget = prescribedExercises.reduce((sum, ex) => sum + getTarget(ex.targetReps), 0);
    const totalCompleted = prescribedExercises.reduce((sum, ex) => sum + getCompleted(ex.exerciseName), 0);
    const overallProgress = totalTarget > 0 ? Math.min(totalCompleted / totalTarget, 1) : 0;

    if (loading) {
        return (
            <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color={C.primary} />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />

            {/* Hero */}
            <LinearGradient colors={[C.primary, C.secondary]} style={styles.hero}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
                </TouchableOpacity>

                <View style={styles.heroInner}>
                    <MaterialCommunityIcons name="clipboard-check-outline" size={36} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.heroTitle}>Recommended Exercises</Text>
                    <Text style={styles.heroSub}>Prescribed by your doctor</Text>
                </View>

                {/* Overall progress strip */}
                {prescribedExercises.length > 0 && (
                    <View style={styles.summaryStrip}>
                        <View style={styles.summaryItem}>
                            <MaterialCommunityIcons name="target" size={18} color={C.accent} />
                            <Text style={styles.summaryValue}>{prescribedExercises.length}</Text>
                            <Text style={styles.summaryLabel}>Exercises</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <MaterialCommunityIcons name="check-circle" size={18} color={C.accent} />
                            <Text style={styles.summaryValue}>{totalCompleted}</Text>
                            <Text style={styles.summaryLabel}>Done</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <MaterialCommunityIcons name="chart-arc" size={18} color={C.accent} />
                            <Text style={styles.summaryValue}>{Math.round(overallProgress * 100)}%</Text>
                            <Text style={styles.summaryLabel}>Progress</Text>
                        </View>
                    </View>
                )}
            </LinearGradient>

            {/* Period Tabs */}
            <View style={styles.tabContainer}>
                {PERIOD_TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, period === tab.key && styles.tabActive]}
                        onPress={() => setPeriod(tab.key)}
                    >
                        <MaterialCommunityIcons
                            name={tab.icon}
                            size={16}
                            color={period === tab.key ? "#fff" : C.textMid}
                        />
                        <Text style={[styles.tabText, period === tab.key && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Body */}
            <ScrollView
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
            >
                {prescribedExercises.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <MaterialCommunityIcons name="clipboard-text-off-outline" size={48} color={C.textLight} />
                        <Text style={styles.emptyTitle}>No Prescriptions</Text>
                        <Text style={styles.emptySub}>
                            Your doctor hasn't prescribed any exercises yet. They will appear here after a consultation.
                        </Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.sectionTitle}>Your Prescribed Exercises</Text>
                        {prescribedExercises.map((ex, idx) => {
                            const target = getTarget(ex.targetReps);
                            const completed = getCompleted(ex.exerciseName);
                            const progress = getProgress(ex.targetReps, ex.exerciseName);
                            const isDone = completed >= target;

                            return (
                                <View key={ex.exerciseKey || idx} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <View style={[styles.exerciseIconWrap, isDone && styles.exerciseIconDone]}>
                                            <MaterialCommunityIcons
                                                name={isDone ? "check-bold" : "dumbbell"}
                                                size={20}
                                                color={isDone ? "#fff" : C.primary}
                                            />
                                        </View>
                                        <View style={styles.cardHeaderText}>
                                            <Text style={styles.cardTitle}>{ex.exerciseName}</Text>
                                            <Text style={styles.cardSub}>
                                                By {ex.doctorName} • {ex.targetReps} reps/day
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.startBtn, isDone && styles.startBtnDone]}
                                            onPress={() => startExercise(ex.exerciseKey)}
                                        >
                                            <MaterialCommunityIcons
                                                name={isDone ? "check" : "play"}
                                                size={16}
                                                color={isDone ? C.success : "#fff"}
                                            />
                                            <Text style={[styles.startBtnText, isDone && styles.startBtnTextDone]}>
                                                {isDone ? "Done" : "Start"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Progress bar */}
                                    <View style={styles.progressContainer}>
                                        <View style={styles.progressBar}>
                                            <View
                                                style={[
                                                    styles.progressFill,
                                                    {
                                                        width: `${progress * 100}%`,
                                                        backgroundColor: isDone ? C.success : progress > 0.5 ? C.accent : C.warning,
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.progressText}>
                                            {completed} / {target} reps
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    hero: {
        paddingTop: Platform.OS === "ios" ? 52 : (StatusBar.currentHeight || 24) + 12,
        paddingBottom: 24, paddingHorizontal: 22,
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
    },
    backBtn: {
        position: "absolute", top: Platform.OS === "ios" ? 52 : (StatusBar.currentHeight || 24) + 12,
        left: 16, zIndex: 10, padding: 4,
    },
    heroInner: { alignItems: "center", marginBottom: 16 },
    heroTitle: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 10, letterSpacing: -0.3 },
    heroSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "500", marginTop: 4 },

    summaryStrip: {
        flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8,
    },
    summaryItem: { flex: 1, alignItems: "center", gap: 2 },
    summaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
    summaryValue: { fontSize: 16, color: "#fff", fontWeight: "800", marginTop: 4 },
    summaryLabel: { fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "600" },

    tabContainer: {
        flexDirection: "row", paddingHorizontal: 20, paddingVertical: 12, gap: 8,
    },
    tab: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, paddingVertical: 10, borderRadius: 12,
        backgroundColor: "#fff", borderWidth: 1, borderColor: C.cardBorder,
    },
    tabActive: { backgroundColor: C.primary, borderColor: C.primary },
    tabText: { fontSize: 12, fontWeight: "700", color: C.textMid },
    tabTextActive: { color: "#fff" },

    body: { padding: 20, paddingBottom: 40 },

    sectionTitle: {
        fontSize: 13, fontWeight: "800", color: C.textLight,
        textTransform: "uppercase", letterSpacing: 1, marginBottom: 14,
    },

    card: {
        backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: C.cardBorder,
        elevation: 2, shadowColor: "#0D2535",
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    exerciseIconWrap: {
        width: 42, height: 42, borderRadius: 12,
        backgroundColor: "#E6F3F7", justifyContent: "center", alignItems: "center",
        marginRight: 12,
    },
    exerciseIconDone: { backgroundColor: C.success },
    cardHeaderText: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: "800", color: C.textDark, marginBottom: 2 },
    cardSub: { fontSize: 11, color: C.textMid, fontWeight: "500" },

    startBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 10,
    },
    startBtnDone: { backgroundColor: "#E8F5E9" },
    startBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
    startBtnTextDone: { color: C.success },

    progressContainer: {
        flexDirection: "row", alignItems: "center", gap: 10,
    },
    progressBar: {
        flex: 1, height: 8, backgroundColor: "#E8EEF2",
        borderRadius: 4, overflow: "hidden",
    },
    progressFill: { height: "100%", borderRadius: 4 },
    progressText: { fontSize: 11, fontWeight: "700", color: C.textMid, minWidth: 70, textAlign: "right" },

    emptyCard: {
        alignItems: "center", backgroundColor: "#fff", borderRadius: 20,
        padding: 40, borderWidth: 1, borderColor: C.cardBorder,
        elevation: 2, marginTop: 20,
    },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: C.textDark, marginTop: 16 },
    emptySub: { fontSize: 13, color: C.textMid, textAlign: "center", marginTop: 8, lineHeight: 20 },
});
