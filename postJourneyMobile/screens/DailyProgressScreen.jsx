import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    View, Text, StyleSheet, ScrollView, RefreshControl,
    StatusBar, Platform, ActivityIndicator, TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import {
    getExerciseSummary,
    getExerciseHistory,
} from "../services/exerciseService";

const C = {
    primary: "#0A5F7A", secondary: "#1D8FAB", accent: "#2EC4B6",
    bg: "#F0F6F9", textDark: "#0D2535", textMid: "#4A6B7C",
    textLight: "#8BA9B8", cardBorder: "#DBE8EE", success: "#10B981",
};

export default function DailyProgressScreen({ navigation }) {
    const route = useRoute();
    const userId = route.params?.userId || "unknown";

    const [summary, setSummary] = useState({});
    const [historySessions, setHistorySessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState("daily"); // daily | weekly | monthly | all

    const fetchData = useCallback(async () => {
        try {
            const [summaryRes, historyRes] = await Promise.all([
                getExerciseSummary(userId),
                getExerciseHistory(userId),
            ]);

            if (summaryRes.success) {
                setSummary(summaryRes.summary || {});
            }
            if (historyRes.success) {
                setHistorySessions(historyRes.sessions || []);
            }
        } catch (err) {
            console.error("Fetch daily progress error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onRefresh = () => { setRefreshing(true); fetchData(); };

    const aggregatedAllTime = useMemo(() => {
        const map = {};
        historySessions.forEach((s) => {
            const name = s.exerciseName || "Unknown";
            if (!map[name]) {
                map[name] = { reps: 0, lastDate: null };
            }
            map[name].reps += s.repetitionsCompleted || 0;
            if (!map[name].lastDate || (s.date && s.date > map[name].lastDate)) {
                map[name].lastDate = s.date;
            }
        });
        return map;
    }, [historySessions]);

    const { totalReps, totalExercises, itemsForList } = useMemo(() => {
        if (selectedPeriod === "all") {
            const entries = Object.entries(aggregatedAllTime);
            const repsTotal = entries.reduce((sum, [, v]) => sum + (v.reps || 0), 0);
            return {
                totalReps: repsTotal,
                totalExercises: entries.length,
                itemsForList: entries.map(([name, v]) => ({
                    key: name,
                    exerciseName: name,
                    reps: v.reps,
                    metaLabel: v.lastDate ? `Last done on ${v.lastDate}` : "All-time total",
                })),
            };
        }

        const metricKey = selectedPeriod === "daily"
            ? "daily"
            : selectedPeriod === "weekly"
                ? "weekly"
                : "monthly";

        const entries = Object.entries(summary || {});
        const filtered = entries.filter(([, v]) => (v[metricKey] || 0) > 0);
        const repsTotal = filtered.reduce((sum, [, v]) => sum + (v[metricKey] || 0), 0);

        return {
            totalReps: repsTotal,
            totalExercises: filtered.length,
            itemsForList: filtered.map(([name, v]) => ({
                key: name,
                exerciseName: name,
                reps: v[metricKey] || 0,
                metaLabel:
                    selectedPeriod === "daily"
                        ? "Today"
                        : selectedPeriod === "weekly"
                            ? "Last 7 days"
                            : "Last 30 days",
            })),
        };
    }, [selectedPeriod, summary, aggregatedAllTime]);

    const periodLabel =
        selectedPeriod === "daily"
            ? "Today"
            : selectedPeriod === "weekly"
                ? "Last 7 days"
                : selectedPeriod === "monthly"
                    ? "Last 30 days"
                    : "All-time history";

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
                <View style={styles.heroInner}>
                    <MaterialCommunityIcons name="chart-bar" size={36} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.heroTitle}>Exercise Reports</Text>
                    <Text style={styles.heroSub}>{periodLabel}</Text>
                </View>

                {/* Summary strip */}
                <View style={styles.summaryStrip}>
                    <View style={styles.summaryItem}>
                        <MaterialCommunityIcons name="dumbbell" size={18} color={C.accent} />
                        <Text style={styles.summaryValue}>{totalExercises}</Text>
                        <Text style={styles.summaryLabel}>Exercises</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <MaterialCommunityIcons name="counter" size={18} color={C.accent} />
                        <Text style={styles.summaryValue}>{totalReps}</Text>
                        <Text style={styles.summaryLabel}>Total Reps</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <MaterialCommunityIcons name="check-circle" size={18} color={C.accent} />
                        <Text style={styles.summaryValue}>{totalExercises > 0 ? "Active" : "—"}</Text>
                        <Text style={styles.summaryLabel}>Status</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Body */}
            <ScrollView
                contentContainerStyle={styles.body}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
            >
                <View style={styles.toggleRow}>
                    {[
                        { id: "daily", label: "Daily" },
                        { id: "weekly", label: "Weekly" },
                        { id: "monthly", label: "Monthly" },
                        { id: "all", label: "Till Now" },
                    ].map((opt) => {
                        const active = selectedPeriod === opt.id;
                        return (
                            <TouchableOpacity
                                key={opt.id}
                                style={[styles.toggleChip, active && styles.toggleChipActive]}
                                onPress={() => setSelectedPeriod(opt.id)}
                            >
                                <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {itemsForList.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <MaterialCommunityIcons name="emoticon-neutral-outline" size={48} color={C.textLight} />
                        <Text style={styles.emptyTitle}>No exercises in this period</Text>
                        <Text style={styles.emptySub}>
                            Complete your exercises to see detailed reports here.
                        </Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.sectionTitle}>Completed Exercises</Text>
                        {itemsForList.map((item) => (
                            <View key={item.key} style={styles.card}>
                                <View style={styles.cardLeft}>
                                    <View style={styles.checkCircle}>
                                        <MaterialCommunityIcons name="check" size={16} color="#fff" />
                                    </View>
                                </View>
                                <View style={styles.cardBody}>
                                    <Text style={styles.cardTitle}>{item.exerciseName}</Text>
                                    <View style={styles.cardMeta}>
                                        <View style={styles.metaItem}>
                                            <MaterialCommunityIcons name="counter" size={14} color={C.textMid} />
                                            <Text style={styles.metaText}>{item.reps} reps</Text>
                                        </View>
                                        <View style={styles.metaItem}>
                                            <MaterialCommunityIcons name="calendar-range" size={14} color={C.textMid} />
                                            <Text style={styles.metaText}>{item.metaLabel}</Text>
                                        </View>
                                    </View>
                                </View>
                                <MaterialCommunityIcons name="check-circle" size={22} color={C.success} />
                            </View>
                        ))}
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
    heroInner: { alignItems: "center", marginBottom: 16 },
    heroTitle: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 10, letterSpacing: -0.3 },
    heroSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "500", marginTop: 4 },

    summaryStrip: {
        flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8,
    },
    summaryItem: { flex: 1, alignItems: "center", gap: 2 },
    summaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
    summaryValue: { fontSize: 16, color: "#fff", fontWeight: "800", marginTop: 4 },
    summaryLabel: { fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "600" },

    body: { padding: 20, paddingBottom: 40 },

    toggleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
        backgroundColor: "#E2EEF5",
        borderRadius: 999,
        padding: 4,
    },
    toggleChip: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: 999,
        alignItems: "center",
    },
    toggleChipActive: {
        backgroundColor: "#fff",
        elevation: 2,
    },
    toggleText: {
        fontSize: 11,
        fontWeight: "600",
        color: C.textMid,
    },
    toggleTextActive: {
        color: C.primary,
        fontWeight: "800",
    },

    sectionTitle: {
        fontSize: 13, fontWeight: "800", color: C.textLight,
        textTransform: "uppercase", letterSpacing: 1, marginBottom: 14,
    },

    card: {
        flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
        borderRadius: 16, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: C.cardBorder,
        elevation: 2, shadowColor: "#0D2535",
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8,
    },
    cardLeft: { marginRight: 14 },
    checkCircle: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: C.success, justifyContent: "center", alignItems: "center",
    },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: "800", color: C.textDark, marginBottom: 4 },
    cardMeta: { flexDirection: "row", gap: 16 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontSize: 12, color: C.textMid, fontWeight: "600" },

    emptyCard: {
        alignItems: "center", backgroundColor: "#fff", borderRadius: 20,
        padding: 40, borderWidth: 1, borderColor: C.cardBorder,
        elevation: 2, marginTop: 20,
    },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: C.textDark, marginTop: 16 },
    emptySub: { fontSize: 13, color: C.textMid, textAlign: "center", marginTop: 8, lineHeight: 20 },
});
