# ==========================================
# 1. IMPORTS & DEPENDENCIES
# ==========================================
import io                      # Imports input/output operations for handling raw byte streams in memory
import json                    # Imports JavaScript Object Notation parser for reading and writing json files
import os                      # Imports operating system module to check file paths and environment states
import re                      # Imports regular expression module for string pattern matching and cleaning
import random                  # Imports random number generator for creating mock tokens or codes
import urllib.parse            # Imports URL parser to safely encode query parameters for web requests
import datetime                # Imports standard date and time classes for log tracking and calculations
from datetime import date, timedelta # Imports specific date and timedelta classes for calendar ranges
import base64                  # Imports base64 encoding library for binary-to-text string conversion
import requests                # Imports HTTP library to make external GET/POST requests to REST APIs
import bcrypt                  # Imports hashing library to securely encrypt and verify user passwords
import jwt                     # Imports JSON Web Token library to issue and verify secure session tokens
import psycopg2                # Imports PostgreSQL database driver adapter for Python
import psycopg2.extras         # Imports PostgreSQL dictionary cursor extensions for clean row parsing
from fastapi import FastAPI, File, UploadFile, HTTPException, Header # Imports core FastAPI web framework tools and request headers
from fastapi.middleware.cors import CORSMiddleware # Imports CORS middleware to permit cross-origin browser requests
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType # Imports mail framework for sending SMTP messages
from PIL import Image          # Python Imaging Library (Pillow) to open, resize, and inspect uploaded images
import google.generativeai as genai # Imports official Google Gemini AI library for computer vision analysis
from dotenv import load_dotenv
load_dotenv()

# ==========================================
# 2. FASTAPI APP INITIALIZATION & CORS SETUP
# ==========================================
app = FastAPI(title="SceneScout API") # Initializes the main FastAPI application instance with a custom app title

# Adds cross-origin resource sharing middleware rules to the FastAPI application
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Permits incoming requests from any domain name or origin
    allow_credentials=True,       # Permits cookies, tokens, and authorization headers across domains
    allow_methods=["*"],          # Permits all HTTP action verbs (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],          # Permits all HTTP headers in incoming client requests
)

SECRET_KEY = "SUPER_SECRET_JWT_KEY_CHANGE_THIS_IN_PRODUCTION" # Sets the cryptographic signing key for user session tokens
ALGORITHM = "HS256"             # Defines the standard HMAC-SHA256 encryption algorithm for JSON Web Tokens
DATABASE_URL = os.getenv("DATABASE_URL") # Loads the Supabase PostgreSQL connection string from environment variables

# ==========================================
# 3. SUPABASE DATABASE HELPERS & STORAGE
# ==========================================
def get_db_connection():
    """Establishes and returns a secure SSL connection to the Supabase PostgreSQL database."""
    if not DATABASE_URL:
        print("Database Error: DATABASE_URL environment variable is missing.") # Logs error if connection string is absent
        return None
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require') # Connects securely to PostgreSQL with required SSL mode
        return conn
    except Exception as e:
        print(f"Database Connection Error: {e}") # Logs connection failures
        return None

def load_users():
    """Loads all user records from the Supabase users table into an in-memory dictionary for rapid lookups."""
    users = {}
    conn = get_db_connection() # Opens database connection helper
    if not conn:
        return users
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT * FROM users;") # Executes query to fetch all rows from users table
            rows = cur.fetchall()
            for row in rows:
                username = row["username"]
                users[username] = {
                    "display_name": row["display_name"],
                    "password_hash": row["password_hash"],
                    "email": row["email"],
                    "mfa_code": row["mfa_code"],
                    "profile": row["profile"] if row["profile"] else {}
                }
    except Exception as e:
        print(f"Error loading users from Supabase: {e}") # Logs exceptions during load
    finally:
        conn.close() # Always closes the database connection socket
    return users

def save_user_to_db(username: str, user_data: dict):
    """Saves or updates a single user record securely in Supabase using an upsert query."""
    conn = get_db_connection() # Opens database connection helper
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO users (username, display_name, password_hash, email, mfa_code, profile)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (username) 
                DO UPDATE SET 
                    display_name = EXCLUDED.display_name,
                    password_hash = EXCLUDED.password_hash,
                    email = EXCLUDED.email,
                    mfa_code = EXCLUDED.mfa_code,
                    profile = EXCLUDED.profile;
            """, (
                username,
                user_data.get("display_name"),
                user_data.get("password_hash"),
                user_data.get("email"),
                user_data.get("mfa_code"),
                json.dumps(user_data.get("profile"))
            )) # Upserts user record data securely to avoid duplicate keys or missing entries
            conn.commit() # Commits transaction changes to the database
    except Exception as e:
        print(f"Error saving user {username} to Supabase: {e}") # Logs save errors
    finally:
        conn.close() # Closes database connection socket

def delete_user_from_db(username: str):
    """Deletes a specific user record from the Supabase users table."""
    conn = get_db_connection() # Opens database connection helper
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE username = %s;", (username,)) # Deletes row by username key
            conn.commit() # Commits deletion transaction
    except Exception as e:
        print(f"Error deleting user {username} from Supabase: {e}") # Logs deletion errors
    finally:
        conn.close() # Closes database connection socket

users_db = load_users() # Executes loader function to populate user memory cache from Supabase on startup

# ==========================================
# 4. EMAIL & EXTERNAL AI/API CONFIGURATIONS
# ==========================================
mail_config = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"), # Loads SMTP login account username string from environment variables
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"), # Loads SMTP login app password string from environment variables
    MAIL_FROM=os.getenv("MAIL_FROM"),         # Loads sender email address header string from environment variables
    MAIL_PORT=587,                            # Sets standard TLS SMTP port number integer
    MAIL_SERVER="smtp.gmail.com",             # Sets standard Gmail SMTP relay server hostname string
    MAIL_STARTTLS=True,                       # Enables STARTTLS secure connection protocol flag
    MAIL_SSL_TLS=False,                       # Disables direct SSL/TLS socket wrapping flag
    USE_CREDENTIALS=True                      # Instructs mail client to authenticate using username and password
) # Configures connection settings container for automated email delivery services
fastmail = FastMail(mail_config) # Initializes the active FastMail dispatch client instance

# SECURELY LOAD KEYS FROM .ENV FILE
GEMINI_API_KEY = os.getenv("GCP_API_KEY") # Loads Gemini API key from environment variables
genai.configure(api_key=GEMINI_API_KEY) # Configures the Google generative AI SDK client with the provided token
model = genai.GenerativeModel("gemini-3.6-flash") # Loads the specific Gemini flash model instance for vision tasks

TMDB_READ_TOKEN = os.getenv("TMDB_READ_TOKEN") # Loads TMDb API bearer token securely from environment variables

# ==========================================
# 5. SECURITY & UTILITY FUNCTIONS
# ==========================================
def hash_password(password: str) -> str:
    """Securely hashes a plaintext password using bcrypt with a salt."""
    pwd_bytes = password.encode("utf-8")[:72] # Encodes password string into bytes and truncates to 72 bytes max for bcrypt
    salt = bcrypt.gensalt() # Generates a secure random cryptographic salt string
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8") # Computes and returns the secure bcrypt hash string

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a stored bcrypt password hash."""
    pwd_bytes = plain_password.encode("utf-8")[:72] # Converts input password to byte array with truncation
    hash_bytes = hashed_password.encode("utf-8")    # Converts stored string hash into byte array format
    return bcrypt.checkpw(pwd_bytes, hash_bytes)    # Returns boolean indicator verifying password match status

def create_access_token(data: dict) -> str:
    """Generates a JSON Web Token (JWT) with a 12-hour expiration time."""
    to_encode = data.copy() # Duplicates input dictionary to prevent mutation of original payload
    expire = datetime.datetime.utcnow() + datetime.timedelta(hours=12) # Calculates expiration timestamp 12 hours from now
    to_encode.update({"exp": expire}) # Injects expiration claim key into token payload dictionary
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM) # Encodes and signs JWT token string using secret key

def generate_mfa_code() -> str:
    """Generates a random 6-digit numeric verification code string."""
    return str(random.randint(100000, 999999)) # Generates a random integer between 100,000 and 999,999 as a string

# ==========================================
# 6. AUTHENTICATION API ROUTES
# ==========================================
@app.post("/api/register")
async def register(data: dict):
    """API endpoint to register a new user account."""
    raw_username = data.get("username", "").strip() # Extracts and trims raw username string from request body
    username = raw_username.lower()                 # Converts username to lowercase for uniform database keys
    password = data.get("password", "").strip()     # Extracts and trims password string from request body
    email = data.get("email", "").strip()           # Extracts and trims email string from request body

    if not username or not password or not email:   # Validates that all required fields contain values
        raise HTTPException(status_code=400, detail="Username, password, and email are required.") # Raises 400 error if any field is empty
    if username in users_db:                        # Checks if the username already exists in database dictionary
        raise HTTPException(status_code=400, detail="Username already exists.") # Raises 400 error if username is taken

    users_db[username] = {
        "display_name": raw_username,               # Stores original casing username for UI display purposes
        "password_hash": hash_password(password),   # Stores secure bcrypt password hash string
        "email": email,                             # Stores registered user email address string
        "mfa_code": None,                           # Initializes pending multi-factor authentication code as null
        "profile": {"bio": "", "birthdate": "", "gender": "", "avatar": "🎬", "email": email, "phone": ""} # Sets default profile dictionary fields
    }
    save_user_to_db(username, users_db[username]) # Persists newly created user record directly into Supabase

    return {"success": True, "message": "SceneScout account created successfully."} # Returns success JSON response

@app.post("/api/login")
async def login(data: dict):
    """API endpoint to authenticate user credentials and send real MFA code via email."""
    username = data.get("username", "").strip().lower() # Extracts and normalizes username string from request body
    password = data.get("password", "").strip()         # Extracts and trims password input string

    user = users_db.get(username) # Looks up user record in database dictionary by username key
    if not user or not verify_password(password, user["password_hash"]): # Validates account existence and password hash match
        raise HTTPException(status_code=401, detail="Invalid username or password.") # Raises 401 unauthorized error on failure

    code = generate_mfa_code() # Generates a fresh 6-digit MFA numeric verification code string
    user["mfa_code"] = code    # Assigns the generated verification code to the user record
    save_user_to_db(username, user) # Commits updated MFA code state to Supabase database

    # Constructs the email message payload schema to send to user's registered email address
    message = MessageSchema(
        subject="Your SceneScout Verification Code",
        recipients=[user["email"]],
        body=f"Your 6-digit SceneScout verification code is: {code}",
        subtype=MessageType.plain
    )
    try:
        await fastmail.send_message(message) # Dispatches real email message asynchronously via SMTP server
    except Exception as e:
        print(f"Email Dispatch Error: {e}") # Logs exception if email transmission fails

    return {
        "success": True,
        "mfa_required": True,
        "username": user.get("display_name", username),
        "message": f"Verification code sent to {user['email']}"
    } # Returns JSON response instructing frontend to display MFA code input step

@app.post("/api/verify-mfa")
def verify_mfa(data: dict):
    """API endpoint to verify the 6-digit MFA code and issue a JWT session token."""
    username = data.get("username", "").strip().lower() # Extracts and normalizes username from request payload
    user = users_db.get(username)                      # Retrieves user dictionary record from memory database
    if not user:
        raise HTTPException(status_code=404, detail="User not found.") # Raises 404 error if user does not exist

    code = data.get("code", "").strip()                # Extracts numerical code input string from request body
    if not user.get("mfa_code") or user["mfa_code"] != code: # Validates verification code equality
        raise HTTPException(status_code=401, detail="Invalid verification code.") # Raises 401 error if code mismatches

    user["mfa_code"] = None # Clears out used MFA code string from record for security
    save_user_to_db(username, user) # Persists updated clearance state to Supabase database
    
    token = create_access_token({"sub": username}) # Generates signed JWT session token string for user
    return {
        "success": True,
        "token": token,
        "username": user.get("display_name", username),
        "profile": user["profile"]
    } # Returns authentication success JSON response including token and profile metadata

@app.post("/api/forgot-password")
async def forgot_password(data: dict):
    """API endpoint to handle password reset requests by emailing a reset link."""
    email = data.get("email", "").strip() # Extracts target email address string from request payload
    if not email:
        raise HTTPException(status_code=400, detail="Email address is required.") # Raises 400 error if empty

    found_user = None
    for uname, udata in users_db.items(): # Loops through all stored user records to find matching email
        if udata.get("email") == email:
            found_user = udata.get("display_name", uname)
            break

    if not found_user:
        raise HTTPException(status_code=404, detail="Email address not found in our records.") # Raises 404 if email unmatched

    reset_token = generate_mfa_code() # Generates a random reset verification token string
    reset_link = f"http://localhost:8000/reset-password?token={reset_token}" # Constructs mockup password reset URL string

    print(f"\n[TESTING] PASSWORD RESET LINK FOR {found_user}: {reset_link}\n") # Prints reset link to terminal for testing

    return {"success": True, "message": "Password reset link has been simulated in your terminal."} # Returns success response

# ==========================================
# 7. USER PROFILE & ACCOUNT MANAGEMENT ROUTES
# ==========================================
@app.get("/api/profile")
def get_profile(username: str = Header(None)):
    """API endpoint to fetch profile data for the authenticated user based on request header with email injection."""
    if not username:
        raise HTTPException(status_code=401, detail="User not found.") # Raises 401 error if username header is missing
    
    current_key = username.strip().lower() # Normalizes username string for database key lookup
    if current_key not in users_db:
        raise HTTPException(status_code=401, detail="User not found.") # Raises 401 error if user record absent

    user = users_db[current_key] # Retrieves target user record dictionary
    
    # Ensures profile dictionary contains account email so frontend profile page populates correctly
    profile_data = user.get("profile", {})
    if not profile_data.get("email"):
        profile_data["email"] = user.get("email", "")

    return {
        "success": True,
        "username": user.get("display_name", current_key),
        "profile": profile_data
    } # Returns JSON response containing profile settings data with email

@app.post("/api/profile/update")
async def update_profile(data: dict, username: str = Header(None)):
    """API endpoint to update user profile details with global reload and body fallback lookup."""
    global users_db
    users_db = load_users() # Forces cache refresh from Supabase on every update request

    # Fallback: if header is missing, check if username was included in request body payload
    if not username:
        username = data.get("username", "")

    if not username:
        raise HTTPException(status_code=401, detail="User not found. Missing username identifier.") # Validates username presence
    
    current_key = username.strip().lower() # Normalizes active user database lookup key string
    if current_key not in users_db:
        raise HTTPException(status_code=401, detail=f"User '{current_key}' not found in database.") # Verifies user record exists

    user = users_db[current_key]           # Retrieves active user dictionary reference
    updated_username_key = current_key     # Initializes tracking variable for updated username keys

    raw_new_username = data.get("new_username", "").strip() # Extracts optional new display username string
    email = data.get("email", "").strip()                   # Extracts optional updated email string
    phone = data.get("phone", "").strip()                   # Extracts optional phone number string
    current_password = data.get("current_password", "").strip() # Extracts current password for verification
    new_password = data.get("password", "").strip()         # Extracts optional new account password string
    birthdate = data.get("birthdate")                       # Extracts date of birth string value
    gender = data.get("gender")                             # Extracts gender selection string value
    bio = data.get("bio")                                   # Extracts user profile biographical description string
    avatar = data.get("avatar")                             # Extracts avatar icon identifier or data URL string

    if new_password: # Checks if password modification was requested by user
        if not current_password or not verify_password(current_password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Incorrect current password.") # Validates current password accuracy
        user["password_hash"] = hash_password(new_password) # Updates stored hash with new encrypted password string

    if raw_new_username: # Checks if username modification was requested
        new_key = raw_new_username.lower()
        if new_key != current_key:
            if new_key in users_db:
                raise HTTPException(status_code=400, detail="Username already taken.") # Prevents duplicate usernames
            
            # Re-keys user record in Supabase database safely
            delete_user_from_db(current_key)
            users_db[new_key] = users_db.pop(current_key)
            user = users_db[new_key]
            updated_username_key = new_key
        user["display_name"] = raw_new_username

    if email: # Updates email address if provided
        user["email"] = email
        user["profile"]["email"] = email

    if phone is not None:      # Updates phone number field if present in payload
        user["profile"]["phone"] = phone
    if birthdate is not None:  # Updates birthdate value if present
        user["profile"]["birthdate"] = birthdate
    if gender is not None:     # Updates gender setting if present
        user["profile"]["gender"] = gender
    if bio is not None:        # Updates biography text if present
        user["profile"]["bio"] = bio
    if avatar:                 # Updates avatar picture string if present
        user["profile"]["avatar"] = avatar

    save_user_to_db(updated_username_key, user) # Persists all profile updates permanently to Supabase database

    return {
        "success": True,
        "message": "Profile updated successfully!",
        "new_username": user.get("display_name", updated_username_key),
        "profile": user["profile"]
    } # Returns successful profile modification JSON response

@app.post("/api/account/delete")
def delete_account(username: str = Header(None)):
    """API endpoint to permanently delete a user account from the database."""
    if not username:
        raise HTTPException(status_code=401, detail="User not found.") # Validates header username presence
    
    current_key = username.strip().lower() # Normalizes lookup username string key
    if current_key not in users_db:
        raise HTTPException(status_code=401, detail="User not found.") # Verifies user database record exists

    del users_db[current_key] # Deletes target user record dictionary entry from memory cache
    delete_user_from_db(current_key) # Permanently removes user account row from Supabase database table
    return {"success": True, "message": "Account deleted successfully."} # Returns deletion success response

# ==========================================
# 8. DASHBOARD FEEDS & EXTERNAL API INTEGRATIONS
# ==========================================
@app.get("/api/movie-news")
def get_movie_news():
    """API endpoint that aggregates movie feeds from TMDB, NewsAPI, and Collider RSS."""
    recent_items = []     # Initializes list container for now-playing movie cards
    upcoming_items = []   # Initializes list container for upcoming movie cards
    news_items = []       # Initializes list container for filtered news articles
    discussion_items = [] # Initializes list container for discussion feed articles
    
    tmdb_headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {TMDB_READ_TOKEN}"
    } # Defines authentication header dictionary for TMDb REST requests

    try:
        now_playing_url = "https://api.themoviedb.org/3/movie/now_playing?language=en-US&page=1" # Sets TMDb now playing endpoint URL
        res = requests.get(now_playing_url, headers=tmdb_headers, timeout=5).json() # Fetches currently playing films JSON data
        results = res.get("results", [])[:12] # Limits result array to top 12 items
        for item in results:
            recent_items.append({
                "title": item.get("title"),
                "release_date": f"Release: {item.get('release_date', 'N/A')}",
                "poster": f"https://image.tmdb.org/t/p/w500{item.get('poster_path')}" if item.get('poster_path') else "",
                "url": ""
            }) # Appends formatted movie item dictionaries to recent releases list
    except Exception as e:
        print(f"TMDB Now Playing Error: {e}") # Logs exception if TMDb request fails

    try:
        today = date.today() # Gets current calendar date object
        three_months_ahead = today + timedelta(days=90) # Calculates future date 90 days ahead
        upcoming_url = (
            f"https://api.themoviedb.org/3/discover/movie?"
            f"include_adult=false&include_video=false&language=en-US&page=1"
            f"&primary_release_date.gte={today.isoformat()}"
            f"&primary_release_date.lte={three_months_ahead.isoformat()}"
            f"&sort_by=popularity.desc"
        ) # Constructs TMDb discover query URL string for upcoming movies
        res = requests.get(upcoming_url, headers=tmdb_headers, timeout=5).json() # Fetches discovery API response JSON
        results = res.get("results", [])[:12] # Limits results array to top 12 items
        
        for item in results:
            upcoming_items.append({
                "title": item.get("title"),
                "release_date": f"Release: {item.get('release_date', 'TBA')}",
                "poster": f"https://image.tmdb.org/t/p/w500{item.get('poster_path')}" if item.get('poster_path') else "",
                "url": ""
            }) # Appends formatted upcoming movie dictionaries to list
    except Exception as e:
        print(f"TMDB Upcoming Window Error: {e}") # Logs exception if upcoming feed fetch fails

    try:
        NEWSAPI_KEY = os.getenv("NEWSAPI_KEY") # Loads NewsAPI key securely from environment variables
        if NEWSAPI_KEY and NEWSAPI_KEY != "YOUR_NEWSAPI_KEY_HERE":
            newsapi_url = f"https://newsapi.org/v2/everything?q=movie+film+cinema+actor+director+hollywood&language=en&sortBy=publishedAt&pageSize=50&apiKey={NEWSAPI_KEY}" # Sets NewsAPI endpoint search URL
            res = requests.get(newsapi_url, timeout=12) # Makes HTTP GET request to NewsAPI server
            if res.status_code == 200:
                articles = res.json().get("articles", []) # Extracts article objects array from JSON response
                movie_keywords = ["movie", "film", "cinema", "actor", "actress", "director", "box office", "hollywood", "netflix", "marvel", "disney", "trailer", "premiere"] # Sets keyword filters
                seen_titles = set() # Initializes tracking set to filter duplicate articles
                
                for art in articles:
                    title = art.get('title') or "" # Extracts article title string
                    description = art.get('description') or "" # Extracts description text string
                    combined_text = (title + " " + description).lower() # Joins title and description for keyword screening
                    
                    clean_title_key = re.sub(r'[^a-zA-Z0-9\s]', '', title).lower().strip() # Cleans title string of punctuation symbols
                    clean_title_key = re.sub(r'\s+', ' ', clean_title_key) # Normalizes whitespace spacing
                    
                    if title != "[Removed]" and clean_title_key and clean_title_key not in seen_titles and any(kw in combined_text for kw in movie_keywords):
                        seen_titles.add(clean_title_key) # Adds clean key to tracking set to prevent duplicates
                        news_items.append({
                            "title": f"📰 {title}",
                            "release_date": f"Source: {art.get('source', {}).get('name', 'News')}",
                            "poster": art.get('urlToImage') or "",
                            "url": art.get('url')
                        }) # Appends article dictionary to news feed list
                        if len(news_items) >= 12:
                            break # Breaks loop once 12 unique news articles are collected
    except Exception as e:
        print(f"NewsAPI Error: {e}") # Logs exception if NewsAPI call fails

    try:
        import xml.etree.ElementTree as ET # Imports XML parser library for RSS feeds
        rss_url = "https://collider.com/feed/" # Sets Collider movie review RSS feed URL string
        resp = requests.get(rss_url, timeout=5) # Fetches RSS feed XML content via HTTP GET
        
        if resp.status_code == 200:
            root = ET.fromstring(resp.content) # Parses raw XML response content bytes into element tree root
            items = root.findall(".//item")[:12] # Finds first 12 XML item elements
            
            for item in items:
                title = item.find("title").text if item.find("title") is not None else "Movie Review & Discussion" # Extracts review title text
                link = item.find("link").text if item.find("link") is not None else "#" # Extracts review article link URL string
                pub_date = item.find("pubDate").text if item.find("pubDate") is not None else "Recent" # Extracts publication date string
                short_date = pub_date.split(",")[1].strip()[:12] if "," in pub_date else "Review" # Formats publication date string
                
                discussion_items.append({
                    "title": f"⭐ [Review/Discussion] {title}",
                    "release_date": f"Published: {short_date}",
                    "poster": "",
                    "url": link
                }) # Appends review discussion dictionary to list
    except Exception as e:
        print(f"Review Feed Error: {e}") # Logs exception if RSS feed parsing fails

    return {
        "success": True, 
        "recent_releases": recent_items,
        "upcoming_releases": upcoming_items,
        "news": news_items, 
        "discussions": discussion_items
    } # Returns aggregated news and feeds dictionary JSON object

# ==========================================
# 9. TV SHOWS API ENDPOINT (TMDB POPULAR LIST)
# ==========================================
@app.get("/api/tv-shows")
def get_tv_shows():
    """API endpoint to fetch popular TV shows from TMDB with actual network, season, and streaming info."""
    tv_items = [] # Initializes empty list container for TV show dictionaries
    tmdb_headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {TMDB_READ_TOKEN}"
    } # Defines TMDb authentication headers dictionary
    
    for page in range(1, 4): # Loops through pages 1, 2, and 3 to fetch popular TV shows
        try:
            url = f"https://api.themoviedb.org/3/tv/popular?language=en-US&page={page}" # Sets TMDb popular TV endpoint URL for page loop iteration
            res = requests.get(url, headers=tmdb_headers, timeout=5).json() # Fetches popular TV list JSON response
            results = res.get("results", []) # Extracts array of TV show objects from result dictionary
            
            if results:
                for item in results:
                    show_id = item.get("id") # Extracts unique TMDb show identification integer ID
                    network_name = "Original Network Unavailable" # Sets default fallback network string
                    seasons_str = "Season info unavailable" # Sets default fallback seasons string
                    streaming_str = "Streaming details unavailable" # Sets default fallback streaming string
                    
                    if show_id:
                        try:
                            detail_url = f"https://api.themoviedb.org/3/tv/{show_id}?language=en-US" # Sets endpoint URL for individual show metadata
                            detail_res = requests.get(detail_url, headers=tmdb_headers, timeout=3).json() # Fetches show details JSON response
                            
                            networks = detail_res.get("networks", []) # Extracts networks array from show detail response
                            if networks:
                                network_name = networks[0].get("name", "Original Network") # Grabs name of first broadcasting network
                                
                            num_seasons = detail_res.get("number_of_seasons") # Extracts total season count integer
                            num_episodes = detail_res.get("number_of_episodes") # Extracts total episode count integer
                            if num_seasons is not None and num_episodes is not None:
                                seasons_str = f"{num_seasons} Season{'s' if num_seasons > 1 else ''}, {num_episodes} Episode{'s' if num_episodes > 1 else ''}" # Formats seasons and episodes string
                            elif num_seasons is not None:
                                seasons_str = f"{num_seasons} Season{'s' if num_seasons > 1 else ''}"
                        except Exception:
                            pass # Silently handles minor individual show metadata lookup failures

                        try:
                            providers_url = f"https://api.themoviedb.org/3/tv/{show_id}/watch/providers" # Sets watch providers endpoint URL for show ID
                            prov_res = requests.get(providers_url, headers=tmdb_headers, timeout=3).json() # Fetches streaming providers JSON data
                            results_data = prov_res.get("results", {}) # Extracts regional provider mapping dictionary
                            
                            region_data = results_data.get("US") or next(iter(results_data.values()), None) # Retrieves US region providers or falls back to first available region
                            if region_data:
                                flatrate = region_data.get("flatrate", []) # Extracts subscription flatrate streaming providers list array
                                if flatrate:
                                    provider_names = [p.get("provider_name") for p in flatrate] # Maps provider dictionaries to name strings list
                                    streaming_str = ", ".join(provider_names) # Joins streaming provider names into comma-separated string
                                else:
                                    streaming_str = "Available to Rent/Buy or Check JustWatch" # Sets fallback string if no subscription streaming available
                        except Exception:
                            pass # Silently handles watch provider lookup errors

                    tv_items.append({
                        "title": item.get("name"),
                        "release_date": f"First Air: {item.get('first_air_date', 'N/A')}",
                        "poster": f"https://image.tmdb.org/t/p/w500{item.get('poster_path')}" if item.get('poster_path') else "",
                        "overview": item.get("overview", ""),
                        "network": network_name,
                        "seasons_episodes": seasons_str,
                        "streaming": streaming_str,
                        "genre": item.get("genre_ids", []),
                        "url": ""
                    }) # Appends populated TV show dictionary item to list
            else:
                break # Breaks out of loop if pagination results return empty
        except Exception as e:
            print(f"TMDB TV Shows Error on page {page}: {e}") # Logs pagination request errors
            break

    return {"success": True, "tv_shows": tv_items[:50]} # Returns success response with list sliced to exactly 50 shows

# ==========================================
# 9B. TVMAZE FLEXIBLE GLOBAL TV SHOW SEARCH ROUTE
# ==========================================
@app.get("/api/tv-search")
def search_tv_show(query: str):
    """Searches TVmaze using the flexible search endpoint and formats time/streaming accurately."""
    try:
        url = f"https://api.tvmaze.com/search/shows?q={urllib.parse.quote(query)}"
        res = requests.get(url, timeout=5)
        
        if res.status_code == 200:
            results = res.json()
            if results and len(results) > 0:
                show = results[0].get("show", {})
                
                # Extract network or web channel name and format streaming availability
                network = show.get("network")
                web_channel = show.get("webChannel")
                
                network_name = "Original Network"
                streaming_str = "Check JustWatch / Official Streaming App"
                
                if web_channel and web_channel.get("name"):
                    network_name = web_channel.get("name")
                    streaming_str = f"Available on {network_name}"
                elif network and network.get("name"):
                    network_name = network.get("name")
                    if "abc" in network_name.lower():
                        streaming_str = "Airs on ABC, Available on Hulu the next day"
                    else:
                        streaming_str = f"Broadcast on {network_name} (Check JustWatch for streaming options)"

                # Format schedule details and convert military time (e.g. 20:00) to 12-hour AM/PM format
                schedule = show.get("schedule", {})
                days = schedule.get("days", [])
                raw_time = schedule.get("time", "")
                
                time_formatted = raw_time
                if raw_time:
                    try:
                        parts = raw_time.split(":")
                        hour = int(parts[0])
                        minute = parts[1] if len(parts) > 1 else "00"
                        period = "AM" if hour < 12 else "PM"
                        if hour == 0:
                            hour = 12
                        elif hour > 12:
                            hour -= 12
                        time_formatted = f"{hour}:{minute} {period}"
                    except Exception:
                        pass

                # Build clean network airtime string with slash separator (e.g., "ABC / Thursday at 8:00 PM")
                days_str = ", ".join(days) if days else ""
                if days_str and time_formatted:
                    network_airtime_str = f"{network_name} / {days_str} at {time_formatted}"
                else:
                    network_airtime_str = network_name

                # Extract accurate seasons and episodes count from TVmaze endpoints
                seasons_str = "Seasons and episodes information available upon broadcast."
                show_id = show.get("id")
                if show_id:
                    try:
                        seasons_url = f"https://api.tvmaze.com/shows/{show_id}/seasons"
                        seas_res = requests.get(seasons_url, timeout=3).json()
                        total_seasons = len(seas_res) if isinstance(seas_res, list) else 0

                        episodes_url = f"https://api.tvmaze.com/shows/{show_id}/episodes"
                        eps_res = requests.get(episodes_url, timeout=3).json()
                        total_episodes = len(eps_res) if isinstance(eps_res, list) else 0

                        if total_seasons > 0 and total_episodes > 0:
                            seasons_str = f"{total_seasons} Season{'s' if total_seasons > 1 else ''}, {total_episodes} Episode{'s' if total_episodes > 1 else ''}"
                        elif total_seasons > 0:
                            seasons_str = f"{total_seasons} Season{'s' if total_seasons > 1 else ''}"
                    except Exception:
                        pass

                # Format poster image safely
                image_data = show.get("image")
                poster_url = image_data.get("medium") or image_data.get("original") if image_data else ""

                # Clean up HTML tags in summary overview if present
                raw_overview = show.get("summary", "No overview available.")
                clean_overview = re.sub(r'<.*?>', '', raw_overview) if raw_overview else "No overview available."

                show_data = {
                    "title": show.get("name", "Unknown Title"),
                    "release_date": f"First Air: {show.get('premiered', 'N/A')}",
                    "poster": poster_url,
                    "overview": clean_overview,
                    "network": network_airtime_str,      # Network / Airtime combined string with separator
                    "seasons_episodes": seasons_str,     # Total seasons & episodes count string
                    "streaming": streaming_str           # Streaming platforms / Hulu logic string
                }
                return {"success": True, "show": show_data}
            
        return {"success": False, "message": "Show not found on TVmaze."}
    except Exception as e:
        return {"success": False, "message": str(e)}

# ==========================================
# 10. 365-DAY MOVIE FACT OF THE DAY API ROUTE
# ==========================================
@app.get("/api/movie-fact")
def get_movie_fact():
    """Loads facts from facts.json and returns today's fact based on the day of the year."""
    facts_file = "facts.json" # Sets filename string for facts storage JSON file
    yearly_facts = {}       # Initializes empty facts dictionary container
    
    if os.path.exists(facts_file): # Checks if facts file exists on disk storage
        try:
            with open(facts_file, "r", encoding="utf-8") as f:
                yearly_facts = json.load(f) # Loads JSON dictionary containing yearly facts
        except Exception as e:
            print(f"Error loading facts.json: {e}") # Logs file loading exception
            
    if not yearly_facts:
        return {"success": True, "fact": "Did you know? Cinema has been captivating audiences for over a century!"} # Returns fallback fact if dictionary is empty

    today = datetime.datetime.now() # Gets current datetime timestamp object
    day_of_year = str(today.timetuple().tm_yday) # Gets the numerical day of the year integer (1-365/366) as a string key
    
    chosen_fact = yearly_facts.get(day_of_year, yearly_facts.get("1", "Classic cinema offers endless history.")) # Looks up fact by day number or defaults to day 1 fact
    
    return {"success": True, "fact": chosen_fact, "day": day_of_year} # Returns success response with today's chosen fact string

# ==========================================
# 11. SCREENSHOT IDENTIFICATION (GEMINI & OMDB/TMDB)
# ==========================================
def get_omdb_details_and_streaming(clean_title: str):
    """Fetches Rotten Tomatoes ratings and plot overviews from the OMDb API."""
    omdb_key = os.getenv("OMDB_API_KEY") # Loads OMDb API key securely from environment variables
    rt_score = "Rating unavailable" # Sets default Rotten Tomatoes score string
    plot_overview = "No overview available." # Sets default plot overview string
    
    try:
        url = f"https://www.omdbapi.com/?t={urllib.parse.quote(clean_title)}&apikey={omdb_key}" # Constructs OMDb query endpoint URL string
        res = requests.get(url, timeout=3).json() # Fetches OMDb metadata JSON response
        if res.get("Response") == "True":
            ratings = res.get("Ratings", []) # Extracts ratings array from response object
            for r in ratings:
                if r.get("Source") == "Rotten Tomatoes":
                    rt_score = r.get("Value") # Extracts Rotten Tomatoes rating value string
            
            if res.get("Plot") and res.get("Plot") != "N/A":
                plot_overview = res.get("Plot") # Extracts plot summary string if available
    except Exception as e:
        print(f"OMDB Error: {e}") # Logs OMDb connection error

    lower_title = clean_title.lower() # Converts title to lowercase for condition checking
    if "goonies" in lower_title:
        streaming = "Amazon Prime Video, Apple TV, Fandango at Home" # Sets custom streaming mock string for Goonies
    else:
        streaming = "Available on major digital storefronts (Prime Video, Apple TV)" # Sets standard streaming mock string

    return rt_score, plot_overview, streaming # Returns tuple of rating, overview, and streaming strings

def get_tmdb_details(raw_title: str):
    """Searches TMDB for movie or TV show posters, release dates, and metadata."""
    clean_title = re.sub(r"\s*\(\d{4}\)", "", raw_title).strip() # Removes trailing release years from title string
    encoded_title = urllib.parse.quote(clean_title) # URL-encodes cleaned title string safely

    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {TMDB_READ_TOKEN}",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    } # Sets headers dictionary for TMDb search requests

    rt_score, custom_overview, streaming = get_omdb_details_and_streaming(clean_title) # Fetches OMDb supplementary details

    movie_url = f"https://api.themoviedb.org/3/search/movie?query={encoded_title}" # Sets TMDb movie search endpoint URL string
    try:
        res = requests.get(movie_url, headers=headers).json() # Fetches movie search JSON data
        if res.get("results") and len(res["results"]) > 0:
            movie = res["results"][0] # Selects top movie search result match dictionary
            poster_path = movie.get("poster_path") # Extracts poster image path string
            poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else "" # Constructs full poster image URL string
            release_date = movie.get("release_date") or "Release date unavailable" # Extracts movie release date string
            overview = movie.get("overview") if (movie.get("overview") and movie.get("overview") != "No overview available.") else custom_overview # Selects plot overview string
            return poster_url, release_date, overview, streaming, rt_score # Returns movie metadata tuple
    except Exception as e:
        print(f"TMDb Movie Search Error: {e}") # Logs movie search exception error

    tv_url = f"https://api.themoviedb.org/3/search/tv?query={encoded_title}" # Sets TMDb TV show search endpoint URL string
    try:
        res = requests.get(tv_url, headers=headers).json() # Fetches TV show search JSON data
        if res.get("results") and len(res["results"]) > 0:
            tv = res["results"][0] # Selects top TV show search result dictionary
            poster_path = tv.get("poster_path") # Extracts TV show poster path string
            poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else "" # Constructs full poster image URL string
            release_date = tv.get("first_air_date") or "Release date unavailable" # Extracts first air date string
            overview = tv.get("overview") if (tv.get("overview") and tv.get("overview") != "No overview available.") else custom_overview # Selects plot overview string
            return poster_url, release_date, overview, streaming, rt_score # Returns TV show metadata tuple
    except Exception as e:
        print(f"TMDb TV Search Error: {e}") # Logs TV search exception error

    return "", "Release date unavailable", custom_overview, streaming, rt_score # Returns default fallback tuple if no search matches found

@app.post("/identify")
async def identify(file: UploadFile = File(...)):
    """API endpoint that receives an uploaded screenshot, analyzes it via Gemini AI, and fetches metadata."""
    try:
        contents = await file.read() # Reads raw binary byte contents of uploaded screenshot file
        image = Image.open(io.BytesIO(contents)) # Opens binary bytes into a Pillow image object instance

        prompt = """
        Identify the movie or TV show from this screenshot frame.
        Return ONLY a raw JSON object with this exact structure:
        {
            "success": true,
            "title": "Exact Title",
            "overview": "Brief plot summary",
            "actors": "Main actors/actresses"
        }
        If you cannot identify it, return:
        {
            "success": false,
            "message": "Could not identify movie frame."
        }
        Do not include markdown tags, code blocks, or extra text.
        """ # Defines strict prompt instructions string for Gemini model visual analysis

        response = model.generate_content([prompt, image]) # Sends prompt text and image object to Gemini vision model
        response_text = response.text.strip()              # Extracts raw response text string and strips whitespace
        
        if response_text.startswith("```json"):
            response_text = response_text[7:]              # Removes opening markdown json block syntax if present
        if response_text.startswith("```"):
            response_text = response_text[3:]              # Removes opening generic code block tags if present
        if response_text.endswith("```"):
            response_text = response_text[:-3]             # Removes closing code block ticks if present

        data = json.loads(response_text.strip())           # Parses cleaned response text string into Python dictionary

        if data.get("success") and data.get("title"):
            poster_url, release_date, tmdb_overview, streaming, rt_score = get_tmdb_details(data["title"]) # Fetches auxiliary TMDb and OMDb metadata for identified title

            data["poster_url"] = poster_url
            data["release_date"] = release_date
            data["streaming"] = streaming
            data["rotten_tomatoes"] = rt_score
            if tmdb_overview != "No overview available.":
                data["overview"] = tmdb_overview # Updates dictionary with enriched metadata fields

        return data # Returns final metadata JSON dictionary object to frontend client

    except Exception as e:
        return {
            "success": False,
            "message": f"An error occurred while analyzing the image: {str(e)}"
        } # Returns error response dictionary if identification pipeline crashes