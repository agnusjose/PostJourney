import cv2
import base64
import numpy as np
import mediapipe as mp

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=True,
    model_complexity=1,
    min_detection_confidence=0.5
)

def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - \
              np.arctan2(a[1]-b[1], a[0]-b[0])

    angle = abs(radians * 180.0 / np.pi)
    if angle > 180:
        angle = 360 - angle
    return angle


def analyze_mini_squat(payload):
    img_bytes = base64.b64decode(payload.image)
    img_np = np.frombuffer(img_bytes, np.uint8)
    image = cv2.imdecode(img_np, cv2.IMREAD_COLOR)

    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = pose.process(image_rgb)

    if not results.pose_landmarks:
        return {
            "angle": None,
            "feedback": "Stand fully in view",
            "state": payload.state
        }

    lm = results.pose_landmarks.landmark

    # --- Landmarks ---
    hip = lm[mp_pose.PoseLandmark.LEFT_HIP]
    knee = lm[mp_pose.PoseLandmark.LEFT_KNEE]
    ankle = lm[mp_pose.PoseLandmark.LEFT_ANKLE]
    shoulder = lm[mp_pose.PoseLandmark.LEFT_SHOULDER]

    # --- Angles ---
    knee_angle = calculate_angle(
        [hip.x, hip.y],
        [knee.x, knee.y],
        [ankle.x, ankle.y]
    )

    torso_angle = calculate_angle(
        [shoulder.x, shoulder.y],
        [hip.x, hip.y],
        [hip.x, hip.y + 0.1]
    )

    # --- Mini Squat Rules (UNCHANGED) ---
    feedback = "Good form"

    if knee_angle > 150:
        feedback = "Start bending your knees"

    elif knee_angle < 120:
        feedback = "Do not squat too deep"

    elif knee_angle < 135 or knee_angle > 150:
        feedback = "Bend knees between 30–60 degrees"

    if knee.x > ankle.x + 0.03:
        feedback = "Keep knees behind toes"

    if torso_angle > 20:
        feedback = "Keep your back straight and chest up"

    return {
        "angle": round(180 - knee_angle, 1),  # squat depth
        "feedback": feedback,
        "state": payload.state
    }
