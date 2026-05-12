import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Animated,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SERVER_CONFIG } from '../config/ServerConfig';

const BASE_URL = `${SERVER_CONFIG.BASE_URL}/api`;
const BASE_URL_UPLOADS = SERVER_CONFIG.BASE_URL;

export default function ChatScreen({ route, navigation }) {
    const { consultation } = route.params;
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null);
    const [timerTick, setTimerTick] = useState(0);
    const [recording, setRecording] = useState(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [playingAudioId, setPlayingAudioId] = useState(null);
    const soundRef = useRef(null);
    const recordingTimerRef = useRef(null);
    const recordingRef = useRef(null); // Tracks active recording synchronously (state is async)
    const isMounted = useRef(true);   // Guards state updates after unmount

    const flatListRef = useRef();

    // Notes card state
    const [notesExpanded, setNotesExpanded] = useState(true);
    const hasNotes = consultation?.diagnosis || consultation?.medicines || consultation?.exerciseAdvice || consultation?.followUpDate || consultation?.generalComments;

    // ── Doctor-side health readings ───────────────────────────
    const [patientHealth, setPatientHealth] = useState(null);
    const [healthExpanded, setHealthExpanded] = useState(true);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        isMounted.current = true;

        if (!consultation?._id) {
            Alert.alert('Error', 'Consultation data missing.');
            navigation.goBack();
            return;
        }
        fetchMessages();
        checkStatus();
        const statusInterval = setInterval(checkStatus, 10000);
        const messageInterval = setInterval(fetchMessages, 5000);
        const countdownInterval = setInterval(() => setTimerTick(t => t + 1), 1000);

        // Poll patient health readings if doctor
        let healthInterval = null;
        const pid = typeof consultation?.patientId === 'object'
            ? consultation.patientId._id
            : consultation?.patientId;
        console.log('🩺 Health polling — userType:', user?.userType, 'patientId:', pid);
        if (user?.userType === 'doctor' && pid) {
            fetchPatientHealth();
            healthInterval = setInterval(fetchPatientHealth, 5000);
        }

        return () => {
            isMounted.current = false;
            clearInterval(statusInterval);
            clearInterval(messageInterval);
            clearInterval(countdownInterval);
            clearInterval(recordingTimerRef.current);
            if (healthInterval) clearInterval(healthInterval);
            // ⚠️ NEVER call expo-av async methods (unloadAsync, stopAsync) here.
            // Android runs useEffect cleanup on a background thread (pool-N-thread-N),
            // which causes the 'player accessed on wrong thread' crash.
            // Just null the refs — Android OS will free the native MediaPlayer resources.
            soundRef.current = null;
            recordingRef.current = null;
        };
    }, []);

    const currentUserId = user?.userId || user?.id || '';

    // Fetch patient health reading from backend
    const fetchPatientHealth = async () => {
        try {
            const pid = typeof consultation?.patientId === 'object'
                ? consultation.patientId._id
                : consultation?.patientId;
            if (!pid) return;
            const url = `${BASE_URL}/health-reading/${pid}/latest`;
            console.log('🩺 Fetching health:', url);
            const res = await axios.get(url);
            console.log('🩺 Health response:', JSON.stringify(res.data));
            if (res.data.success && isMounted.current) {
                if (res.data.hasDevice) {
                    // Always update — keeps previous reading visible, just toggles isLive badge
                    setPatientHealth(prev => ({
                        ...res.data,
                        // If server has no reading but we had one before, keep the old reading
                        reading: res.data.reading || prev?.reading || null,
                    }));
                } else {
                    setPatientHealth(null);
                }
            }
        } catch (e) {
            console.log('🩺 Health fetch error:', e.message);
        }
    };

    // Pulse animation for doctor health card
    useEffect(() => {
        if (patientHealth?.isLive && patientHealth?.reading?.heartRate > 0) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [patientHealth?.isLive, patientHealth?.reading?.heartRate]);

    const getActivityLevel = (ax = 0, ay = 0, az = 0) => {
        const magnitude = Math.sqrt(ax * ax + ay * ay + az * az);
        if (magnitude < 1.15) return { label: 'Resting', color: '#10B981', icon: 'sleep' };
        if (magnitude < 2.2) return { label: 'Light', color: '#F59E0B', icon: 'walk' };
        return { label: 'Active', color: '#EF4444', icon: 'run-fast' };
    };

    const checkStatus = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/consultation/${consultation._id}/status`);
            const s = response.data;
            setStatus(s);

            if (s.isPast) {
                // Session ended logic
            }
        } catch (error) {
            console.error('Status check error:', error);
        }
    };

    const isActive = status?.isActive || status?.chatStarted || consultation?.chatStarted || false;
    const isDoctor = user?.userType === 'doctor';
    const otherName = isDoctor ? consultation.patientName : ` ${consultation.doctorName}`;

    const handleRequestJoin = async () => {
        try {
            await axios.post(`${BASE_URL}/consultation/${consultation._id}/request-join`);
            Alert.alert('Request Sent', 'The doctor has been notified.');
            checkStatus();
        } catch (e) {
            Alert.alert('Error', 'Failed to send join request.');
        }
    };

    const getCountdownText = () => {
        if (!status) return 'Connecting...';

        const now = new Date();

        if (isActive) {
            const diff = new Date(status.endTime) - now;
            if (diff > 0) return `Session Active · Ends in: ${formatDiff(diff)}`;
            return 'Session Active';
        }

        if (status.isUpcoming) {
            const diff = new Date(status.startTime) - now;
            return `Starts in: ${formatDiff(diff)}`;
        }

        if (status.canRequest) {
            if (isDoctor) return 'Ready to start?';
            return status.patientRequestedJoin ? 'Waiting for doctor...' : 'Request to join?';
        }

        if (status.isPast) return 'Session Ended';

        return '';
    };

    const formatDiff = (diff) => {
        if (diff <= 0) return '00:00';
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    };

    const isEndingSoon = () => {
        if (!status?.isActive) return false;
        const diff = new Date(status.endTime) - new Date();
        return diff > 0 && diff <= 300000; // 5 minutes
    };

    const fetchMessages = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/messages/${consultation._id}`);
            if (response.data.success) {
                setMessages(response.data.messages);
            }
        } catch (error) {
            console.error('Fetch messages error:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (type = 'text', audioUri = null) => {
        if (type === 'text' && !inputText.trim()) return;
        if (type === 'audio' && !audioUri) return;

        setSending(true);
        try {
            const formData = new FormData();
            formData.append('consultationId', consultation._id);
            formData.append('senderId', currentUserId);
            formData.append('senderRole', user.userType);
            formData.append('messageType', type);

            if (type === 'text') {
                formData.append('content', inputText);
            } else if (audioUri) {
                const filename = audioUri.split('/').pop() || `voice_${Date.now()}.m4a`;
                // Android records as AAC inside MP4 container (.m4a)
                const mimeType = Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4';
                formData.append('audio', {
                    uri: audioUri,
                    name: filename,
                    type: mimeType,
                });
            }

            const response = await axios.post(`${BASE_URL}/messages/send`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data.success) {
                setInputText('');
                fetchMessages();
                setTimeout(() => flatListRef.current?.scrollToEnd(), 500);
            } else {
                Alert.alert('Error', response.data.message || 'Failed to send message.');
            }
        } catch (error) {
            console.error('Send message error:', error?.response?.data || error.message);
            Alert.alert('Error', 'Failed to send message. Check your connection.');
        } finally {
            setSending(false);
        }
    };

    const startRecording = async () => {
        // Guard: if already recording, do nothing (prevents double-tap race)
        if (recordingRef.current) return;

        try {
            // Stop any currently playing audio first
            if (soundRef.current) {
                try {
                    await soundRef.current.stopAsync();
                    await soundRef.current.unloadAsync();
                } catch (_) { }
                soundRef.current = null;
                setPlayingAudioId(null);
            }

            const { status: permStatus } = await Audio.requestPermissionsAsync();
            if (permStatus !== 'granted') {
                Alert.alert('Permission Denied', 'Microphone permission is required to record audio.');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            const recordingOptions = {
                android: {
                    extension: '.m4a',
                    outputFormat: Audio.AndroidOutputFormat?.MPEG_4 ?? 2,
                    audioEncoder: Audio.AndroidAudioEncoder?.AAC ?? 3,
                    sampleRate: 44100,
                    numberOfChannels: 1,
                    bitRate: 128000,
                },
                ios: {
                    extension: '.m4a',
                    outputFormat: Audio.IOSOutputFormat?.MPEG4AAC ?? 'aac',
                    audioQuality: Audio.IOSAudioQuality?.HIGH ?? 0x60,
                    sampleRate: 44100,
                    numberOfChannels: 1,
                    bitRate: 128000,
                    linearPCMBitDepth: 16,
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                },
                web: {},
            };

            const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);

            // Store in BOTH ref (sync) and state (for UI)
            recordingRef.current = newRecording;
            setRecording(newRecording);
            setRecordingDuration(0);

            // Start duration counter
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(d => d + 1);
            }, 1000);

        } catch (err) {
            console.error('Failed to start recording:', err);
            recordingRef.current = null;
            setRecording(null);
            Alert.alert('Recording Error', 'Could not start recording: ' + err.message);
        }
    };

    const stopRecording = async () => {
        // Use ref for synchronous access (state may not have updated yet)
        const activeRecording = recordingRef.current;
        if (!activeRecording) return;

        // Clear ref immediately to prevent re-entry
        recordingRef.current = null;

        // Stop the duration counter
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }

        setRecording(null);
        setRecordingDuration(0);

        try {
            await activeRecording.stopAndUnloadAsync();
            const uri = activeRecording.getURI();
            console.log('Recorded audio URI:', uri);

            // Reset audio mode for playback
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            if (uri) {
                await sendMessage('audio', uri);
            } else {
                Alert.alert('Error', 'Recording failed — no audio captured.');
            }
        } catch (err) {
            console.error('Stop recording error:', err);
            Alert.alert('Error', 'Failed to stop recording: ' + err.message);
        }
    };

    const renderMessage = ({ item }) => {
        if (!item) return null;
        const isMine = item.senderId === currentUserId;
        const isSystem = item.senderRole === 'system';

        if (isSystem) {
            return (
                <View style={styles.systemMessageContainer}>
                    <Text style={styles.systemMessageText}>{item.content}</Text>
                </View>
            );
        }

        const date = new Date(item.createdAt);
        const timeStr = isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isThisPlaying = playingAudioId === item._id;

        return (
            <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
                <Text style={styles.roleText}>{(item.senderRole || 'user').toUpperCase()}</Text>
                {item.messageType === 'text' ? (
                    <Text style={[styles.messageText, isMine && styles.myText]}>{item.content}</Text>
                ) : (
                    <TouchableOpacity
                        style={[styles.audioBubble, isThisPlaying && styles.audioBubblePlaying]}
                        onPress={() => playAudio(item._id, item.content)}
                    >
                        <Text style={styles.audioIcon}>{isThisPlaying ? '⏹️' : '▶️'}</Text>
                        <Text style={[styles.audioText, isMine && styles.myText]}>
                            {isThisPlaying ? 'Stop' : 'Play Voice'}
                        </Text>
                    </TouchableOpacity>
                )}
                <Text style={[styles.timeText, isMine && { color: 'rgba(255,255,255,0.7)' }]}>{timeStr}</Text>
            </View>
        );
    };

    const playAudio = async (msgId, url) => {
        try {
            // If this message is already playing, stop it
            if (playingAudioId === msgId) {
                if (soundRef.current) {
                    await soundRef.current.stopAsync();
                    await soundRef.current.unloadAsync();
                    soundRef.current = null;
                }
                setPlayingAudioId(null);
                return;
            }

            // Stop any currently playing sound
            if (soundRef.current) {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            // Set audio mode for playback
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            const fullUrl = url.startsWith('http') ? url : `${BASE_URL_UPLOADS}${url}`;
            console.log('Playing audio from:', fullUrl);

            setPlayingAudioId(msgId);

            const { sound } = await Audio.Sound.createAsync(
                { uri: fullUrl },
                { shouldPlay: true },
                (playbackStatus) => {
                    // When playback finishes, reset state (only if still mounted)
                    if (playbackStatus.didJustFinish && isMounted.current) {
                        setPlayingAudioId(null);
                        soundRef.current = null;
                    }
                }
            );

            // Only update refs/state if component is still mounted
            if (isMounted.current) {
                soundRef.current = sound;
            } else {
                // Component unmounted between createAsync and here — unload safely
                sound.unloadAsync().catch(() => { });
            }
        } catch (error) {
            console.error('Play audio error:', error);
            if (isMounted.current) {
                setPlayingAudioId(null);
                Alert.alert('Playback Error', 'Could not play this audio message.');
            }
        }
    };

    const handleEndMeeting = () => {
        Alert.alert(
            "End Meeting",
            "Are you sure you want to end this consultation now?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "End Meeting",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await axios.post(`${BASE_URL}/consultation/${consultation._id}/end`);
                            // Navigate back to dashboard — must pass ALL original params + openNotesForId
                            // so DoctorDashboard doesn't lose userId/userName/userEmail
                            const doctorId = user?.userId || user?.id || '';
                            const doctorName = user?.name || user?.userName || '';
                            const doctorEmail = user?.email || user?.userEmail || '';
                            navigation.navigate("DoctorDashboard", {
                                userId: doctorId,
                                userName: doctorName,
                                userEmail: doctorEmail,
                                openNotesForId: consultation._id,
                            });
                        } catch (e) {
                            Alert.alert("Error", "Failed to end meeting.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{otherName}</Text>
                    <View style={styles.statusRow}>
                        <Text style={[
                            styles.countdownText,
                            isEndingSoon() && styles.endingSoonText,
                            status?.isPast && styles.inactiveStatus
                        ]}>
                            {getCountdownText()}
                        </Text>
                        {status?.canRequest && !status?.patientRequestedJoin && !isDoctor && (
                            <TouchableOpacity style={styles.miniRequestBtn} onPress={handleRequestJoin}>
                                <Text style={styles.miniRequestBtnText}>Request Now</Text>
                            </TouchableOpacity>
                        )}
                        {isActive && isDoctor && (
                            <TouchableOpacity style={styles.miniEndBtn} onPress={handleEndMeeting}>
                                <Text style={styles.miniEndBtnText}>End Meeting</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {!isActive && !status?.isUpcoming && !status?.canRequest && (
                <View style={styles.lockedBanner}>
                    <Text style={styles.lockedText}>
                        {status?.isPast
                            ? 'This session has ended.'
                            : isDoctor
                                ? 'Click "Start Consultation" on your dashboard to begin.'
                                : 'Waiting for doctor to start the session...'}
                    </Text>
                </View>
            )}

            <View style={{ flex: 1 }}>
                {/* Doctor: Patient Health Readings Card */}
                {isDoctor && patientHealth?.hasDevice && (
                    <View style={styles.healthCard}>
                        <TouchableOpacity
                            style={styles.healthCardHeader}
                            onPress={() => setHealthExpanded(!healthExpanded)}
                            activeOpacity={0.7}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <MaterialCommunityIcons name="heart-pulse" size={18} color="#EF4444" />
                                <Text style={styles.healthCardTitle}>Patient Vitals</Text>
                                {patientHealth?.isLive && (
                                    <View style={styles.liveBadge}>
                                        <View style={styles.liveDot} />
                                        <Text style={styles.liveText}>LIVE</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={{ fontSize: 14, color: '#94a3b8' }}>{healthExpanded ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {healthExpanded && (
                            <View style={styles.healthCardBody}>
                                {patientHealth?.reading ? (
                                    <View>
                                        <View style={styles.healthReadingsRow}>
                                            <View style={styles.healthReadingItem}>
                                                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                                                    <MaterialCommunityIcons name="heart-pulse" size={22} color="#EF4444" />
                                                </Animated.View>
                                                <Text style={styles.healthReadingValue}>{patientHealth.reading.heartRate}</Text>
                                                <Text style={styles.healthReadingUnit}>BPM</Text>
                                            </View>
                                            <View style={styles.healthDivider} />
                                            <View style={styles.healthReadingItem}>
                                                <MaterialCommunityIcons name="water-percent" size={22} color="#3B82F6" />
                                                <Text style={styles.healthReadingValue}>{patientHealth.reading.spo2}</Text>
                                                <Text style={styles.healthReadingUnit}>% SpO2</Text>
                                            </View>
                                            <View style={styles.healthDivider} />
                                            <View style={styles.healthReadingItem}>
                                                {(() => {
                                                    const act = getActivityLevel(patientHealth.reading.ax, patientHealth.reading.ay, patientHealth.reading.az);
                                                    return (
                                                        <>
                                                            <MaterialCommunityIcons name={act.icon} size={22} color={act.color} />
                                                            <Text style={[styles.healthReadingValue, { color: act.color, fontSize: 14 }]}>{act.label}</Text>
                                                        </>
                                                    );
                                                })()}
                                            </View>
                                        </View>
                                        <Text style={styles.healthTimestamp}>
                                            Updated {new Date(patientHealth.reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.healthOffline}>
                                        <MaterialCommunityIcons name="bluetooth-off" size={18} color="#94a3b8" />
                                        <Text style={styles.healthOfflineText}>
                                            Patient has a wristband but it's not connected right now
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Consultation Notes Card */}
                {hasNotes && (
                    <View style={styles.notesCard}>
                        <TouchableOpacity
                            style={styles.notesCardHeader}
                            onPress={() => setNotesExpanded(!notesExpanded)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.notesCardTitle}>📋 Doctor's Notes</Text>
                            <Text style={styles.notesToggle}>{notesExpanded ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {notesExpanded && (
                            <View style={styles.notesCardBody}>
                                {consultation.diagnosis ? (
                                    <View style={styles.notesRow}>
                                        <Text style={styles.notesLabel}>Diagnosis</Text>
                                        <Text style={styles.notesValue}>{consultation.diagnosis}</Text>
                                    </View>
                                ) : null}
                                {consultation.medicines ? (
                                    <View style={styles.notesRow}>
                                        <Text style={styles.notesLabel}>Medicines</Text>
                                        <Text style={styles.notesValue}>{consultation.medicines}</Text>
                                    </View>
                                ) : null}
                                {consultation.exerciseAdvice ? (
                                    <View style={styles.notesRow}>
                                        <Text style={styles.notesLabel}>Exercise Advice</Text>
                                        <Text style={styles.notesValue}>{consultation.exerciseAdvice}</Text>
                                    </View>
                                ) : null}
                                {consultation.followUpDate ? (
                                    <View style={styles.notesRow}>
                                        <Text style={styles.notesLabel}>Follow-up</Text>
                                        <Text style={styles.notesValue}>{new Date(consultation.followUpDate).toDateString()}</Text>
                                    </View>
                                ) : null}
                                {consultation.generalComments ? (
                                    <View style={styles.notesRow}>
                                        <Text style={styles.notesLabel}>Comments</Text>
                                        <Text style={styles.notesValue}>{consultation.generalComments}</Text>
                                    </View>
                                ) : null}
                            </View>
                        )}
                    </View>
                )}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item._id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messageList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                    onLayout={() => flatListRef.current?.scrollToEnd()}
                    ListEmptyComponent={
                        loading ? (
                            <ActivityIndicator size="small" color="#1E88E5" style={{ marginTop: 20 }} />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No messages yet.</Text>
                                {isActive && (
                                    <Text style={styles.emptySubtext}>Start the conversation now!</Text>
                                )}
                            </View>
                        )
                    }
                />
            </View>

            <View style={styles.inputContainer}>
                {recording ? (
                    <View style={styles.recordingIndicator}>
                        <View style={styles.recordingDot} />
                        <Text style={styles.recordingDurationText}>
                            Recording... {recordingDuration}s
                        </Text>
                    </View>
                ) : (
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        placeholderTextColor="#94a3b8"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        editable={isActive}
                    />
                )}

                <TouchableOpacity
                    style={[styles.recordButton, recording && styles.recordingActive]}
                    onPressIn={startRecording}
                    onPressOut={stopRecording}
                    disabled={!isActive}
                >
                    <Text style={styles.buttonEmoji}>{recording ? '⏹️' : '🎤'}</Text>
                </TouchableOpacity>

                {!recording && (
                    <TouchableOpacity
                        style={[styles.sendButton, (!inputText.trim() || !isActive) && styles.disabledButton]}
                        onPress={() => sendMessage('text')}
                        disabled={!inputText.trim() || !isActive}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.sendButtonText}>Send</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F6F9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        elevation: 2,
    },
    backText: {
        fontSize: 16,
        color: '#0A5F7A',
        fontWeight: '600',
        marginRight: 15,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0A3D52',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    countdownText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#4CAF50', // Default green
    },
    endingSoonText: {
        color: '#F44336', // Red warning
    },
    inactiveStatus: {
        color: '#94a3b8',
    },
    miniRequestBtn: {
        marginLeft: 10,
        backgroundColor: '#0A5F7A',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    miniRequestBtnText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    miniEndBtn: {
        marginLeft: 10,
        backgroundColor: '#ef4444',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    miniEndBtnText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    lockedBanner: {
        backgroundColor: '#fff7ed',
        padding: 10,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#ffedd5',
    },
    lockedText: {
        color: '#9a3412',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    messageList: {
        padding: 15,
    },
    systemMessageContainer: {
        backgroundColor: '#e0f2fe',
        padding: 15,
        borderRadius: 12,
        marginVertical: 10,
        alignSelf: 'center',
        width: '90%',
        borderWidth: 1,
        borderColor: '#bae6fd',
    },
    systemMessageText: {
        color: '#0369a1',
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 20,
        marginBottom: 10,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#0A5F7A',
        borderBottomRightRadius: 2,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderBottomLeftRadius: 2,
    },
    roleText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#64748b',
        marginBottom: 2,
    },
    messageText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    myText: {
        color: '#fff',
    },
    timeText: {
        fontSize: 10,
        color: '#94a3b8',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    audioBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 4,
        gap: 6,
    },
    audioBubblePlaying: {
        opacity: 0.8,
    },
    audioIcon: {
        fontSize: 18,
    },
    audioText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2c3e50',
    },
    recordingIndicator: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fee2e2',
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
        gap: 8,
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ef4444',
    },
    recordingDurationText: {
        color: '#dc2626',
        fontWeight: '700',
        fontSize: 14,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    input: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 16,
        marginRight: 10,
        color: '#2c3e50',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    recordButton: {
        backgroundColor: '#e2e8f0',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    recordingActive: {
        backgroundColor: '#F44336',
    },
    buttonEmoji: {
        fontSize: 20,
    },
    sendButton: {
        backgroundColor: '#0A5F7A',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
    },
    disabledButton: {
        backgroundColor: '#cbd5e1',
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#64748b',
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 5,
        textAlign: 'center',
    },

    // Consultation Notes Card
    notesCard: {
        backgroundColor: '#f0fdfa',
        marginHorizontal: 10,
        marginTop: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#99f6e4',
        overflow: 'hidden',
    },
    notesCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#ccfbf1',
    },
    notesCardTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0f766e',
    },
    notesToggle: {
        fontSize: 12,
        color: '#0f766e',
        fontWeight: '700',
    },
    notesCardBody: {
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    notesRow: {
        marginBottom: 8,
    },
    notesLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0d9488',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    notesValue: {
        fontSize: 13,
        color: '#134e4a',
        lineHeight: 18,
    },

    // ── Doctor Health Card ──────────────────────────────────
    healthCard: {
        backgroundColor: '#fff',
        marginHorizontal: 10,
        marginTop: 8,
        borderRadius: 14,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    healthCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    healthCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0A3D52',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#EF4444',
    },
    liveText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#EF4444',
        letterSpacing: 0.5,
    },
    healthCardBody: {
        padding: 12,
    },
    healthReadingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    healthReadingItem: {
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    healthReadingValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0A3D52',
    },
    healthReadingUnit: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '600',
    },
    healthDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#e2e8f0',
    },
    healthTimestamp: {
        fontSize: 10,
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 8,
    },
    healthOffline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 8,
    },
    healthOfflineText: {
        fontSize: 12,
        color: '#94a3b8',
        flex: 1,
    },
});
