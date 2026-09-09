import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

import db
from persona import MOODS, Scenario, build_assistant

load_dotenv(Path(__file__).parent / ".env")
VAPI_PUBLIC_KEY = os.getenv("VAPI_PUBLIC_KEY", "")

app = FastAPI(title="The Counteroffer API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    db.init()



@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/docs")


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/config")
def config():
    if not VAPI_PUBLIC_KEY or VAPI_PUBLIC_KEY.startswith("PASTE_"):
        raise HTTPException(500, "VAPI_PUBLIC_KEY is not set. Copy backend/.env.example to backend/.env and fill it in.")
    return {"vapiPublicKey": VAPI_PUBLIC_KEY}


@app.get("/api/moods")
def moods():
    return [{"id": k, "label": v["label"]} for k, v in MOODS.items()]



@app.post("/api/assistant")
def assistant(scenario: Scenario):
    if scenario.ceiling < scenario.offer:
        raise HTTPException(400, "The ceiling has to be at least as high as the opening offer.")
    if scenario.difficulty not in MOODS:
        raise HTTPException(400, f"Unknown mood '{scenario.difficulty}'.")
    return build_assistant(scenario)



class Turn(BaseModel):
    role: str
    text: str


class SessionIn(BaseModel):
    scenario: Scenario
    transcript: list[Turn] = Field(default_factory=list)
    durationSeconds: int = 0


@app.post("/api/sessions", status_code=201)
def create_session(body: SessionIn):
    session_id = db.create_session(
        body.scenario.model_dump(),
        [t.model_dump() for t in body.transcript],
        body.durationSeconds,
    )
    return {"id": session_id}


@app.get("/api/sessions")
def list_sessions():
    return db.list_sessions()


@app.get("/api/sessions/{session_id}")
def get_session(session_id: int):
    s = db.get_session(session_id)
    if not s:
        raise HTTPException(404, "No such session.")
    return s


@app.delete("/api/sessions/{session_id}", status_code=204)
def delete_session(session_id: int):
    if not db.delete_session(session_id):
        raise HTTPException(404, "No such session.")
