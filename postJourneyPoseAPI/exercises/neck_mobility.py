import cv2
import base64
import numpy as np
import mediapipe as mp
import time

mp_face = mp.solutions.face_mesh
face_mesh = mp_face.FaceMesh(
    static_image_mode=True,
    refine_landmarks=True,
    min_detection_confidence=0.5
)

def analyze_neck_mobility(image_b64: str, state: dict, expected_direction: str):
    img_bytes = base64.b64decode(image_b64)
    img_np = np.frombuffer(img_bytes, np.uint8)
    image = cv2.imdecode(img_np, cv2.IMREAD_COLOR)

    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(image_rgb)

    if not results.multi_face_landmarks:
        return {
        "feedback": None,  # frontend keeps instruction
        "state": state
    }


    lm = results.multi_face_landmarks[0].landmark

    nose = lm[1]
    chin = lm[152]
    left_eye = lm[33]
    right_eye = lm[263]

    vertical = chin.y - nose.y
    horizontal = right_eye.x - left_eye.x

    detected = "neutral"

    if vertical > 0.035:
        detected = "flexion"
    elif vertical < -0.03:
        detected = "extension"
    elif horizontal > 0.045:
        detected = "right_rotation"
    elif horizontal < -0.045:
        detected = "left_rotation"

    now = time.time()

    # Init state
    state.setdefault("phase", "move")
    state.setdefault("start_time", now)
    state.setdefault("rounds", 0)

    # 1️⃣ MOVE PHASE
    if state["phase"] == "move":
        if detected == expected_direction:
            state["phase"] = "hold"
            state["start_time"] = now
            return {
                "feedback": "Stop there",
                "state": state
            }
        return {
            "feedback": f"Slowly move to {expected_direction.replace('_', ' ')}",
            "state": state
        }

    # 2️⃣ HOLD PHASE
    if state["phase"] == "hold":
        hold_time = now - state["start_time"]

        if detected != expected_direction:
            state["phase"] = "move"
            return {
                "feedback": "Return to position",
                "state": state
            }

        if hold_time < 5:
            return {
                "feedback": f"Hold for {5 - int(hold_time)} seconds",
                "state": state
            }

        state["phase"] = "return"
        return {
            "feedback": "Good — keep holding",
            "state": state
        }

    # 3️⃣ RETURN PHASE
    if state["phase"] == "return":
        if detected == "neutral":
            state["phase"] = "move"
            state["start_time"] = now
            return {
                "completed": True,
                "state": state
            }

        return {
            "feedback": "Return to center",
            "state": state
        }
