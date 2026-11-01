#!/usr/bin/env python3
"""Save Creativity Corner sign-ins, activity answers, drawings, and AUT scores.

Open the site at http://127.0.0.1:8765/index.html
Records are stored in data/creativity.db and a readable copy in data/records.json.
"""

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import smtplib
import sqlite3
import ssl
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
DRAWING_DIR = os.path.join(DATA_DIR, "drawings")
DB_PATH = os.path.join(DATA_DIR, "creativity.db")
DIFY_KEY_PATH = os.path.join(DATA_DIR, "dify-key.txt")
DIFY_CHAT_URL = "https://api.dify.ai/v1/chat-messages"
DIFY_APP_CODE = "TqQd9UYVwS5yh1rN"
DIFY_WEB_API = "https://udify.app/api"
RECORDS_PATH = os.path.join(DATA_DIR, "records.json")

ADMIN_USERNAME = "CreativityCorner"
ADMIN_PASSWORD_PATH = os.path.join(DATA_DIR, "admin-password.txt")
MAIL_SETTINGS_PATH = os.path.join(DATA_DIR, "mail-settings.json")

SORT_BOXES = {
    "1": "Things we can do right now",
    "2": "Things we can do, but need help from others",
    "3": "Hard to do",
    "4": "Fun ideas but not really helpful",
}

AUT_OBJECTS = {
    "book": "Book",
    "sticky": "Sticky Note",
    "brick": "Brick",
    "newspaper": "Newspaper",
}


def admin_password():
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        with open(ADMIN_PASSWORD_PATH, encoding="utf-8") as handle:
            saved = handle.read().strip()
        if saved:
            return saved
    except OSError:
        pass
    import secrets
    created = secrets.token_urlsafe(12)
    with open(ADMIN_PASSWORD_PATH, "w", encoding="utf-8") as handle:
        handle.write(created + "\n")
    return created


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def connect():
    os.makedirs(DATA_DIR, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def ensure_account_tables(connection):
    columns = {row[1] for row in connection.execute("PRAGMA table_info(users)")}
    if "username" not in columns:
        connection.execute("ALTER TABLE users ADD COLUMN username TEXT")
    if "password_hash" not in columns:
        connection.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
    if "must_change_password" not in columns:
        connection.execute(
            "ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0"
        )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at TEXT NOT NULL
        )
        """
    )


def clean_username(value):
    text = " ".join(str(value or "").split())
    if len(text) < 3 or len(text) > 20:
        return ""
    return text


def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("ascii"), 120_000)
    return salt + ":" + digest.hex()


def password_matches(stored, password):
    if not stored or ":" not in str(stored):
        return False
    salt = str(stored).split(":", 1)[0]
    return hmac.compare_digest(str(stored), hash_password(password, salt))


def temporary_password():
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    return "".join(secrets.choice(alphabet) for _ in range(8))


def start_session(connection, user_id):
    token = secrets.token_urlsafe(24)
    expires = (datetime.now(timezone.utc) + timedelta(days=30)).replace(microsecond=0).isoformat()
    connection.execute(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
        (token, user_id, expires),
    )
    return token


def user_by_token(connection, token):
    if not token:
        return None
    row = connection.execute(
        """
        SELECT users.* FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = ? AND sessions.expires_at > ?
        """,
        (token, now_iso()),
    ).fetchone()
    return row


def init_db():
    with connect() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                age TEXT,
                email TEXT NOT NULL UNIQUE,
                language TEXT,
                font_size TEXT,
                joined_date TEXT,
                completed_activities TEXT NOT NULL DEFAULT '[]',
                updated_at TEXT
            );
            CREATE TABLE IF NOT EXISTS consents (
                user_id TEXT PRIMARY KEY,
                consent_json TEXT NOT NULL,
                saved_at TEXT
            );
            CREATE TABLE IF NOT EXISTS submissions (
                user_id TEXT NOT NULL,
                activity_id INTEGER NOT NULL,
                responses_json TEXT NOT NULL,
                completed_activities TEXT NOT NULL DEFAULT '[]',
                metadata_json TEXT NOT NULL DEFAULT '{}',
                saved_at TEXT,
                PRIMARY KEY (user_id, activity_id)
            );
            """
        )
        ensure_account_tables(connection)


def load_json(text, fallback):
    try:
        return json.loads(text) if text else fallback
    except json.JSONDecodeError:
        return fallback


def activity_ids(values):
    found = []
    for value in values or []:
        try:
            number = int(value)
        except (TypeError, ValueError):
            continue
        if 1 <= number <= 5 and number not in found:
            found.append(number)
    return found


def user_public(row):
    keys = row.keys()
    return {
        "id": row["id"],
        "name": row["name"],
        "username": row["username"] if "username" in keys else "",
        "age": row["age"],
        "email": row["email"],
        "language": row["language"],
        "fontSize": row["font_size"],
        "joinedDate": row["joined_date"],
        "completedActivities": load_json(row["completed_activities"], []),
        "mustChangePassword": bool(row["must_change_password"]) if "must_change_password" in keys else False,
    }


def save_drawing(user_id, data_url):
    if not isinstance(data_url, str) or "," not in data_url or not data_url.startswith("data:image"):
        return None
    try:
        raw = base64.b64decode(data_url.split(",", 1)[1])
    except (ValueError, TypeError):
        return None
    os.makedirs(DRAWING_DIR, exist_ok=True)
    relative = os.path.join("data", "drawings", user_id + ".png")
    with open(os.path.join(ROOT, relative), "wb") as handle:
        handle.write(raw)
    return relative


def sorted_texts(raw):
    parsed = load_json(raw, None) if isinstance(raw, str) else raw
    if not isinstance(parsed, list):
        return []
    texts = []
    for item in parsed:
        if isinstance(item, dict):
            text = str(item.get("text") or "").strip()
        else:
            text = str(item).strip()
        if text:
            texts.append(text)
    return texts


def aut_record(submission):
    if not submission:
        return None
    payload = submission["responses"] if isinstance(submission["responses"], dict) else {}
    result = payload.get("result") if isinstance(payload.get("result"), dict) else {}
    answers = payload.get("answers") if isinstance(payload.get("answers"), dict) else {}
    named_answers = {}
    for object_id, lines in answers.items():
        named_answers[AUT_OBJECTS.get(object_id, object_id)] = list(lines or [])
    return {
        "fluency": result.get("fluency"),
        "flexibility": result.get("flexibility"),
        "totalCreativityScore": result.get("total"),
        "answers": named_answers,
        "savedAt": payload.get("savedAt") or submission.get("savedAt"),
    }


def score_change(post_score, pre_score):
    if post_score is None or pre_score is None:
        return None
    return post_score - pre_score


def readable_record(user, consent, submissions):
    by_activity = {item["activityId"]: item for item in submissions}
    animal = (by_activity.get(1) or {}).get("responses") or {}
    what_if = (by_activity.get(2) or {}).get("responses") or {}
    words = (by_activity.get(3) or {}).get("responses") or {}
    penguin = (by_activity.get(4) or {}).get("responses") or {}
    brainstorm = (by_activity.get(5) or {}).get("responses") or {}
    drawing = ((by_activity.get(1) or {}).get("metadata") or {}).get("drawingFile")
    pre = aut_record(by_activity.get(101))
    post = aut_record(by_activity.get(102))
    improvement = None
    if pre and post:
        improvement = {
            "fluencyChange": score_change(post.get("fluency"), pre.get("fluency")),
            "flexibilityChange": score_change(post.get("flexibility"), pre.get("flexibility")),
            "totalScoreChange": score_change(post.get("totalCreativityScore"), pre.get("totalCreativityScore")),
        }
    return {
        "name": user["name"],
        "age": user["age"],
        "email": user["email"],
        "language": user["language"],
        "joinedDate": user["joinedDate"],
        "consent": {
            "participantName": (consent or {}).get("participantName"),
            "signingDate": (consent or {}).get("participantDate"),
            "signedAt": (consent or {}).get("signedDate"),
        } if consent else None,
        "animalActivity": {
            "nameOfNewAnimal": animal.get("animalName", ""),
            "descriptionOfNewAnimal": animal.get("animalDescription", ""),
            "drawingFile": drawing,
        },
        "whatIfChallenge": {
            "result1": what_if.get("Result1", ""),
            "result2": what_if.get("Result2", ""),
            "result3": what_if.get("Result3", ""),
            "result4": what_if.get("Result4", ""),
            "result5": what_if.get("Result5", ""),
            "result6": what_if.get("Result6", ""),
        },
        "wordAssociation": {
            "word1": words.get("word1", ""),
            "word2": words.get("word2", ""),
            "word3": words.get("word3", ""),
            "word4": words.get("word4", ""),
            "word5": words.get("word5", ""),
            "story": words.get("wordStory", ""),
        },
        "penguinInTheDesert": {
            "idea1": penguin.get("idea1", ""),
            "idea2": penguin.get("idea2", ""),
            "idea3": penguin.get("idea3", ""),
            "idea4": penguin.get("idea4", ""),
            "idea5": penguin.get("idea5", ""),
        },
        "brainstorming": {
            "solution1": brainstorm.get("solution1", ""),
            "solution2": brainstorm.get("solution2", ""),
            "solution3": brainstorm.get("solution3", ""),
            "solution4": brainstorm.get("solution4", ""),
            "sortedBoxes": {
                SORT_BOXES["1"]: sorted_texts(brainstorm.get("category1")),
                SORT_BOXES["2"]: sorted_texts(brainstorm.get("category2")),
                SORT_BOXES["3"]: sorted_texts(brainstorm.get("category3")),
                SORT_BOXES["4"]: sorted_texts(brainstorm.get("category4")),
            },
        },
        "creativityAssessment": {
            "pretest": pre,
            "posttest": post,
            "improvement": improvement,
        },
    }


def submission_from_row(row):
    metadata = load_json(row["metadata_json"], {})
    if "animalDrawingDataUrl" in metadata and len(metadata["animalDrawingDataUrl"]) > 80:
        metadata = dict(metadata)
    return {
        "activityId": row["activity_id"],
        "responses": load_json(row["responses_json"], {}),
        "completedActivities": load_json(row["completed_activities"], []),
        "metadata": metadata,
        "savedAt": row["saved_at"],
    }


def write_records(connection):
    users = []
    for row in connection.execute("SELECT * FROM users ORDER BY joined_date"):
        user = user_public(row)
        consent_row = connection.execute(
            "SELECT consent_json FROM consents WHERE user_id = ?", (user["id"],)
        ).fetchone()
        consent = load_json(consent_row["consent_json"], None) if consent_row else None
        submissions = []
        for item in connection.execute(
            "SELECT * FROM submissions WHERE user_id = ? ORDER BY activity_id", (user["id"],)
        ):
            record = submission_from_row(item)
            metadata = dict(record["metadata"])
            metadata.pop("animalDrawingDataUrl", None)
            record["metadata"] = metadata
            submissions.append(record)
        users.append(readable_record(user, consent, submissions))
    payload = {"savedAt": now_iso(), "participants": users}
    with open(RECORDS_PATH, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def upsert_user(body):
    name = str(body.get("name") or "").strip()
    email = str(body.get("email") or "").strip().lower()
    age = str(body.get("age") or "").strip()
    if not name or not email:
        return 400, {"error": "Name and email are required"}
    with connect() as connection:
        existing = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            user_id = existing["id"]
            connection.execute(
                """
                UPDATE users
                SET name = ?, age = ?, language = ?, font_size = ?, updated_at = ?
                WHERE id = ?
                """,
                (name, age, body.get("language"), body.get("fontSize"), now_iso(), user_id),
            )
        else:
            user_id = str(uuid.uuid4())
            connection.execute(
                """
                INSERT INTO users
                    (id, name, age, email, language, font_size, joined_date, completed_activities, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?)
                """,
                (
                    user_id,
                    name,
                    age,
                    email,
                    body.get("language"),
                    body.get("fontSize"),
                    body.get("joinedDate") or now_iso(),
                    now_iso(),
                ),
            )
        write_records(connection)
    return 200, {"userId": user_id}


def dify_api_key():
    try:
        with open(DIFY_KEY_PATH, encoding="utf-8") as handle:
            return handle.read().strip()
    except OSError:
        return ""


def https_context():
    context = ssl.create_default_context()
    if os.path.exists("/etc/ssl/cert.pem"):
        context.load_verify_locations("/etc/ssl/cert.pem")
    return context


def chatbot_answer(payload):
    if not isinstance(payload, dict):
        return ""
    answer = payload.get("answer") or ""
    if not answer and isinstance(payload.get("data"), dict):
        answer = payload["data"].get("answer") or ""
    return answer


def post_json(url, payload, headers, timeout):
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json",
            **headers,
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout, context=https_context()) as response:
        return json.loads(response.read().decode("utf-8"))


def get_json(url, headers, timeout):
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json", **headers},
        method="GET",
    )
    with urllib.request.urlopen(request, timeout=timeout, context=https_context()) as response:
        return json.loads(response.read().decode("utf-8"))


def rate_with_public_app(query, user):
    passport = get_json(
        DIFY_WEB_API + "/passport",
        {"X-App-Code": DIFY_APP_CODE},
        20,
    )
    token = str(passport.get("access_token") or "")
    if not token:
        return ""
    payload = post_json(
        DIFY_WEB_API + "/chat-messages",
        {
            "inputs": {},
            "query": query,
            "response_mode": "blocking",
            "user": user,
            "conversation_id": "",
        },
        {
            "X-App-Passport": token,
            "X-App-Code": DIFY_APP_CODE,
            "Content-Type": "application/json",
        },
        60,
    )
    return chatbot_answer(payload)


def rate_with_chatbot(body):
    query = str(body.get("query") or "").strip()
    user = str(body.get("user") or "participant")[:80]
    if not query:
        return 400, {"error": "query is required"}
    key = dify_api_key()
    if key.startswith("app-"):
        try:
            payload = post_json(
                DIFY_CHAT_URL,
                {
                    "inputs": {},
                    "query": query,
                    "response_mode": "blocking",
                    "user": user,
                    "conversation_id": "",
                },
                {
                    "Authorization": "Bearer " + key,
                    "Content-Type": "application/json",
                },
                60,
            )
            answer = chatbot_answer(payload)
            if answer:
                return 200, {"answer": answer}
        except urllib.error.HTTPError:
            pass
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            pass
    try:
        answer = rate_with_public_app(query, user)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError):
        return 502, {"error": "The creativity chatbot could not score this answer"}
    if answer:
        return 200, {"answer": answer}
    return 502, {"error": "The creativity chatbot could not score this answer"}


def save_consent(body):
    user_id = body.get("userId")
    consent = body.get("consentData")
    if not user_id or not isinstance(consent, dict):
        return 400, {"error": "userId and consentData are required"}
    with connect() as connection:
        found = connection.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if not found:
            return 404, {"error": "User not found"}
        connection.execute(
            """
            INSERT INTO consents (user_id, consent_json, saved_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET consent_json = excluded.consent_json, saved_at = excluded.saved_at
            """,
            (user_id, json.dumps(consent, ensure_ascii=False), now_iso()),
        )
        write_records(connection)
    return 200, {"ok": True}


def save_submission(body):
    user_id = body.get("userId")
    try:
        activity_id = int(body.get("activityId"))
    except (TypeError, ValueError):
        return 400, {"error": "activityId is required"}
    responses = body.get("responses")
    if not user_id or not isinstance(responses, dict):
        return 400, {"error": "userId and responses are required"}
    if activity_id not in (1, 2, 3, 4, 5, 101, 102):
        return 400, {"error": "Unknown activity"}
    metadata = body.get("metadata") if isinstance(body.get("metadata"), dict) else {}
    metadata = dict(metadata)
    drawing_file = save_drawing(user_id, metadata.get("animalDrawingDataUrl"))
    if drawing_file:
        metadata["drawingFile"] = drawing_file
    completed = activity_ids(body.get("completedActivities"))
    with connect() as connection:
        found = connection.execute(
            "SELECT completed_activities FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        if not found:
            return 404, {"error": "User not found"}
        merged = activity_ids(load_json(found["completed_activities"], []) + completed)
        connection.execute(
            "UPDATE users SET completed_activities = ?, updated_at = ? WHERE id = ?",
            (json.dumps(merged), now_iso(), user_id),
        )
        connection.execute(
            """
            INSERT INTO submissions
                (user_id, activity_id, responses_json, completed_activities, metadata_json, saved_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, activity_id) DO UPDATE SET
                responses_json = excluded.responses_json,
                completed_activities = excluded.completed_activities,
                metadata_json = excluded.metadata_json,
                saved_at = excluded.saved_at
            """,
            (
                user_id,
                activity_id,
                json.dumps(responses, ensure_ascii=False),
                json.dumps(completed),
                json.dumps(metadata, ensure_ascii=False),
                now_iso(),
            ),
        )
        write_records(connection)
    return 200, {"ok": True}


def drawing_data_url(user_id, metadata):
    path = os.path.join(DRAWING_DIR, user_id + ".png")
    if os.path.isfile(path):
        with open(path, "rb") as handle:
            encoded = base64.b64encode(handle.read()).decode("ascii")
        return "data:image/png;base64," + encoded
    saved = metadata.get("animalDrawingDataUrl") if isinstance(metadata, dict) else ""
    if isinstance(saved, str) and saved.startswith("data:image"):
        return saved
    return ""


def names_match(stored, typed):
    return str(stored or "").strip().casefold() == str(typed or "").strip().casefold()


def account_payload(connection, row, token=""):
    user = user_public(row)
    consent_row = connection.execute(
        "SELECT consent_json FROM consents WHERE user_id = ?", (user["id"],)
    ).fetchone()
    submissions = [
        submission_from_row(item)
        for item in connection.execute(
            "SELECT * FROM submissions WHERE user_id = ? ORDER BY activity_id", (user["id"],)
        )
    ]
    consent = load_json(consent_row["consent_json"], None) if consent_row else None
    activities = []
    creativity = {"pre": None, "post": None}
    drawing = ""
    puzzle_progress = None
    for item in submissions:
        metadata = item.get("metadata") if isinstance(item.get("metadata"), dict) else {}
        if metadata.get("puzzleProgress") is not None:
            puzzle_progress = metadata.get("puzzleProgress")
        activity_id = item["activityId"]
        if activity_id == 1:
            drawing = drawing_data_url(user["id"], metadata)
        if activity_id in (101, 102):
            phase = "pre" if activity_id == 101 else "post"
            creativity[phase] = item.get("responses")
            continue
        if activity_id in (1, 2, 3, 4, 5):
            activities.append({
                "id": activity_id,
                "savedAt": item.get("savedAt"),
                "responses": item.get("responses") or {},
            })
    payload = {
        "user": user,
        "consentSigned": bool(consent),
        "drawingDataUrl": drawing,
        "puzzleProgress": puzzle_progress,
        "activities": activities,
        "creativityCheck": creativity,
        "mustChangePassword": user["mustChangePassword"],
    }
    if token:
        payload["token"] = token
    return payload


def username_taken(connection, username, except_id=""):
    row = connection.execute(
        "SELECT id FROM users WHERE lower(username) = ?",
        (username.lower(),),
    ).fetchone()
    return bool(row and row["id"] != except_id)


def sign_up(body):
    name = str(body.get("name") or "").strip()
    email = str(body.get("email") or "").strip().lower()
    age = str(body.get("age") or "").strip()
    username = clean_username(body.get("username"))
    password = str(body.get("password") or "")
    if not name or not email or "@" not in email or not age:
        return 400, {"error": "missing-details"}
    if not username:
        return 400, {"error": "username-invalid"}
    if len(password) < 4:
        return 400, {"error": "password-short"}
    with connect() as connection:
        if username_taken(connection, username):
            return 409, {"error": "username-taken"}
        existing = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        password_hash = hash_password(password)
        if existing and existing["password_hash"]:
            return 409, {"error": "email-taken"}
        if existing:
            user_id = existing["id"]
            connection.execute(
                """
                UPDATE users
                SET name = ?, age = ?, language = ?, font_size = ?, username = ?,
                    password_hash = ?, must_change_password = 0, updated_at = ?
                WHERE id = ?
                """,
                (
                    name,
                    age,
                    body.get("language"),
                    body.get("fontSize"),
                    username,
                    password_hash,
                    now_iso(),
                    user_id,
                ),
            )
        else:
            user_id = str(uuid.uuid4())
            connection.execute(
                """
                INSERT INTO users
                    (id, name, age, email, language, font_size, joined_date, completed_activities,
                     updated_at, username, password_hash, must_change_password)
                VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, 0)
                """,
                (
                    user_id,
                    name,
                    age,
                    email,
                    body.get("language"),
                    body.get("fontSize"),
                    body.get("joinedDate") or now_iso(),
                    now_iso(),
                    username,
                    password_hash,
                ),
            )
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        token = start_session(connection, user_id)
        payload = account_payload(connection, row, token)
        write_records(connection)
    return 200, payload


def sign_in(body):
    username = clean_username(body.get("username"))
    password = str(body.get("password") or "")
    if not username or not password:
        return 401, {"error": "sign-in-failed"}
    with connect() as connection:
        row = connection.execute(
            "SELECT * FROM users WHERE lower(username) = ?",
            (username.lower(),),
        ).fetchone()
        if not row or not password_matches(row["password_hash"], password):
            return 401, {"error": "sign-in-failed"}
        token = start_session(connection, row["id"])
        payload = account_payload(connection, row, token)
    return 200, payload


def send_account_email(recipient, username, temporary):
    subject = "Creativity Corner account / 創意角落帳戶"
    message = (
        "Creativity Corner\n\n"
        "Your username is: %s\n"
        "Your temporary password is: %s\n\n"
        "Sign in with these, then choose a new password. You can also choose a new username.\n\n"
        "創意角落\n\n"
        "你的用戶名是：%s\n"
        "你的臨時密碼是：%s\n\n"
        "請用以上資料登入，然後設定新密碼。你也可以更改用戶名。\n"
    ) % (username, temporary, username, temporary)
    settings = None
    try:
        with open(MAIL_SETTINGS_PATH, encoding="utf-8") as handle:
            settings = json.load(handle)
    except (OSError, json.JSONDecodeError):
        settings = None
    if not isinstance(settings, dict) or not settings.get("host") or not settings.get("from"):
        return False
    email = EmailMessage()
    email["Subject"] = subject
    email["From"] = settings.get("from")
    email["To"] = recipient
    email.set_content(message)
    try:
        port = int(settings.get("port") or 465)
        if port == 465:
            smtp = smtplib.SMTP_SSL(settings["host"], port, timeout=30, context=https_context())
        else:
            smtp = smtplib.SMTP(settings["host"], port, timeout=30)
            smtp.ehlo()
            smtp.starttls(context=https_context())
            smtp.ehlo()
        with smtp:
            if settings.get("username"):
                smtp.login(settings["username"], settings.get("password") or "")
            smtp.send_message(email)
    except (OSError, smtplib.SMTPException):
        return False
    return True


def spare_username(connection, name, email):
    stem = re.sub(r"[^A-Za-z0-9]", "", str(name or ""))[:12]
    if len(stem) < 3:
        stem = re.sub(r"[^A-Za-z0-9]", "", email.split("@", 1)[0])[:12]
    if len(stem) < 3:
        stem = "user"
    candidate = stem
    number = 1
    while username_taken(connection, candidate):
        number += 1
        candidate = (stem[:16] + str(number))[:20]
    return candidate


def forgot_account(body):
    email = str(body.get("email") or "").strip().lower()
    if "@" not in email:
        return 400, {"error": "missing-email"}
    with connect() as connection:
        row = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not row:
            return 200, {"ok": True}
        username = row["username"] or spare_username(connection, row["name"], email)
        temporary = temporary_password()
        if not send_account_email(email, username, temporary):
            return 503, {"error": "email-failed"}
        connection.execute(
            """
            UPDATE users
            SET username = ?, password_hash = ?, must_change_password = 1, updated_at = ?
            WHERE id = ?
            """,
            (username, hash_password(temporary), now_iso(), row["id"]),
        )
        write_records(connection)
    return 200, {"ok": True}


def set_password(body):
    token = str(body.get("token") or "")
    password = str(body.get("password") or "")
    username = clean_username(body.get("username"))
    if len(password) < 4:
        return 400, {"error": "password-short"}
    if not username:
        return 400, {"error": "username-invalid"}
    with connect() as connection:
        row = user_by_token(connection, token)
        if not row:
            return 401, {"error": "sign-in-failed"}
        if username_taken(connection, username, row["id"]):
            return 409, {"error": "username-taken"}
        connection.execute(
            """
            UPDATE users
            SET username = ?, password_hash = ?, must_change_password = 0, updated_at = ?
            WHERE id = ?
            """,
            (username, hash_password(password), now_iso(), row["id"]),
        )
        updated = connection.execute("SELECT * FROM users WHERE id = ?", (row["id"],)).fetchone()
        payload = account_payload(connection, updated, token)
        write_records(connection)
    return 200, payload


def my_account(body):
    token = str(body.get("token") or "")
    name = str(body.get("name") or "").strip()
    email = str(body.get("email") or "").strip().lower()
    with connect() as connection:
        if token:
            row = user_by_token(connection, token)
            if not row:
                return 401, {"error": "sign-in-failed"}
            return 200, account_payload(connection, row, token)
        if not name or not email:
            return 400, {"error": "Name and email are required"}
        row = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not row:
            return 404, {"error": "No account found"}
        if not names_match(row["name"], name):
            return 401, {"error": "Name and email do not match"}
        return 200, account_payload(connection, row)


def list_users():
    with connect() as connection:
        users = [user_public(row) for row in connection.execute("SELECT * FROM users ORDER BY joined_date")]
    return 200, {"users": users}


def clear_all_users():
    with connect() as connection:
        connection.execute("DELETE FROM submissions")
        connection.execute("DELETE FROM consents")
        connection.execute("DELETE FROM sessions")
        connection.execute("DELETE FROM users")
        write_records(connection)
    if os.path.isdir(DRAWING_DIR):
        for name in os.listdir(DRAWING_DIR):
            path = os.path.join(DRAWING_DIR, name)
            if name.endswith(".png") and os.path.isfile(path):
                os.remove(path)
    return 200, {"cleared": True}


def user_details(user_id):
    with connect() as connection:
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            return 404, {"error": "User not found"}
        consent_row = connection.execute(
            "SELECT consent_json FROM consents WHERE user_id = ?", (user_id,)
        ).fetchone()
        submissions = [
            submission_from_row(item)
            for item in connection.execute(
                "SELECT * FROM submissions WHERE user_id = ? ORDER BY activity_id", (user_id,)
            )
        ]
    consent = load_json(consent_row["consent_json"], None) if consent_row else None
    drawing = ""
    for item in submissions:
        if item["activityId"] == 1:
            drawing = drawing_data_url(user_id, item.get("metadata") or {})
    return 200, {
        "user": user_public(row),
        "consent": consent,
        "submissions": submissions,
        "drawingDataUrl": drawing,
    }


class RecordHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        origin = self.headers.get("Origin") or ""
        if origin == "https://eugenialee0704-alt.github.io":
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path.startswith("/data"):
            self.send_error(404)
            return
        if path.startswith("/api/"):
            self.handle_api("GET")
            return
        if path in ("/", ""):
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path.startswith("/api/"):
            self.handle_api("POST")
            return
        self.send_error(404)

    def read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > 12_000_000:
            return None
        raw = self.rfile.read(length) if length else b"{}"
        try:
            value = json.loads(raw.decode("utf-8") or "{}")
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None
        return value if isinstance(value, dict) else None

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def admin_ok(self):
        header = self.headers.get("Authorization") or ""
        if not header.startswith("Basic "):
            self.send_json(401, {"error": "Login required"})
            return False
        try:
            decoded = base64.b64decode(header[6:].strip()).decode("utf-8")
        except (ValueError, UnicodeDecodeError):
            self.send_json(401, {"error": "Login required"})
            return False
        username, separator, password = decoded.partition(":")
        if not separator or username != ADMIN_USERNAME or password != admin_password():
            self.send_json(401, {"error": "Invalid username or password"})
            return False
        return True

    def handle_api(self, method):
        path = urlparse(self.path).path.rstrip("/")
        if method == "POST" and path == "/api/public/sign-up":
            body = self.read_json()
            if body is None:
                self.send_json(400, {"error": "Invalid JSON"})
                return
            status, payload = sign_up(body)
            self.send_json(status, payload)
            return
        if method == "POST" and path == "/api/public/sign-in":
            body = self.read_json()
            if body is None:
                self.send_json(400, {"error": "Invalid JSON"})
                return
            status, payload = sign_in(body)
            self.send_json(status, payload)
            return
        if method == "POST" and path == "/api/public/forgot-account":
            body = self.read_json()
            if body is None:
                self.send_json(400, {"error": "Invalid JSON"})
                return
            status, payload = forgot_account(body)
            self.send_json(status, payload)
            return
        if method == "POST" and path == "/api/public/set-password":
            body = self.read_json()
            if body is None:
                self.send_json(400, {"error": "Invalid JSON"})
                return
            status, payload = set_password(body)
            self.send_json(status, payload)
            return
        if method == "POST" and path == "/api/public/my-account":
            body = self.read_json()
            if body is None:
                self.send_json(400, {"error": "Invalid JSON"})
                return
            status, payload = my_account(body)
            self.send_json(status, payload)
            return
        if method == "POST" and path == "/api/public/upsert-user":
            body = self.read_json()
            if body is None:
                self.send_json(400, {"error": "Invalid JSON"})
                return
            status, payload = upsert_user(body)
            self.send_json(status, payload)
            return
        if method == "POST" and path == "/api/public/consent":
            body = self.read_json()
            if body is None:
                self.send_json(400, {"error": "Invalid JSON"})
                return
            status, payload = save_consent(body)
            self.send_json(status, payload)
            return
        if method == "POST" and path == "/api/public/aut-rate":
            body = self.read_json()
            if body is None:
                self.send_json(400, {"error": "Invalid JSON"})
                return
            status, payload = rate_with_chatbot(body)
            self.send_json(status, payload)
            return
        if method == "POST" and path == "/api/public/activity-submission":
            body = self.read_json()
            if body is None:
                self.send_json(400, {"error": "Invalid JSON"})
                return
            status, payload = save_submission(body)
            self.send_json(status, payload)
            return
        if method == "GET" and path == "/api/admin/users":
            if not self.admin_ok():
                return
            status, payload = list_users()
            self.send_json(status, payload)
            return
        if method == "POST" and path == "/api/admin/clear-users":
            self.read_json()
            if not self.admin_ok():
                return
            status, payload = clear_all_users()
            self.send_json(status, payload)
            return
        prefix = "/api/admin/users/"
        if method == "GET" and path.startswith(prefix):
            if not self.admin_ok():
                return
            status, payload = user_details(path[len(prefix):])
            self.send_json(status, payload)
            return
        self.send_json(404, {"error": "Not found"})

    def log_message(self, format, *args):
        print("[%s] %s" % (self.log_date_time_string(), format % args))


def main():
    init_db()
    server = ThreadingHTTPServer(("127.0.0.1", 8765), RecordHandler)
    print("Creativity Corner is running at http://127.0.0.1:8765/index.html")
    print("Saved records: data/records.json")
    server.serve_forever()


if __name__ == "__main__":
    main()
