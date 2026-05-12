import axios from "axios";
import { SERVER_CONFIG } from "../config/ServerConfig";

// Use the same backend server as the rest of the app (port 5000)
// The POSE_API is separate (port 8001) and NOT used here.
const BACKEND_URL = SERVER_CONFIG.API_URL;

export const saveExercise = async (data) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/exercise/save`, data);
        return response.data;
    } catch (error) {
        console.error("Save exercise error:", error.message);
        throw error;
    }
};

export const getDailyProgress = async (patientId) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/exercise/daily/${patientId}`);
        return response.data;
    } catch (error) {
        console.error("Get daily progress error:", error.message);
        throw error;
    }
};

export const getExerciseHistory = async (patientId) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/exercise/history/${patientId}`);
        return response.data;
    } catch (error) {
        console.error("Get exercise history error:", error.message);
        throw error;
    }
};

// ── Prescription & Tracking APIs ─────────────────────────────────────────────

export const savePrescription = async (data) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/prescription/save`, data);
        return response.data;
    } catch (error) {
        console.error("Save prescription error:", error.message);
        throw error;
    }
};

export const getPatientPrescriptions = async (patientId) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/prescription/patient/${patientId}`);
        return response.data;
    } catch (error) {
        console.error("Get prescriptions error:", error.message);
        throw error;
    }
};

export const getConsultationPrescription = async (consultationId) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/prescription/consultation/${consultationId}`);
        return response.data;
    } catch (error) {
        console.error("Get consultation prescription error:", error.message);
        throw error;
    }
};

export const getExerciseSummary = async (patientId) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/exercise/summary/${patientId}`);
        return response.data;
    } catch (error) {
        console.error("Get exercise summary error:", error.message);
        throw error;
    }
};

export const getDoctorPatientCompliance = async (doctorId, patientId) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/prescription/doctor/${doctorId}/patient/${patientId}`);
        return response.data;
    } catch (error) {
        console.error("Get compliance error:", error.message);
        throw error;
    }
};
