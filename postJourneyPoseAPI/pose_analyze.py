from fastapi import FastAPI
from pydantic import BaseModel
from exercises.mini_squat import analyze_mini_squat
from exercises.neck_mobility import analyze_neck_mobility

app = FastAPI()

class ImagePayload(BaseModel):
    image: str
    exercise: str
    state: dict


@app.post("/pose/analyze")
def analyze_pose(payload: ImagePayload):
    if payload.exercise == "mini_squat":
        return analyze_mini_squat(payload)

    if payload.exercise == "neck_mobility":
        return analyze_neck_mobility(payload.image, payload.state)

    return {"feedback": "Unknown exercise", "state": payload.state}
