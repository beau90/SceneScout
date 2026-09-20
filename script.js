/**
 * SceneScout Application Controller Script
 * Handles state management, UI navigation, authentication, media identification,
 * user profiles, and dynamic content feeds (including TV shows and movie news).
 */

/* ========================================== */
/* SCRIPT DIRECTORY & TABLE OF CONTENTS        */
/* ========================================== */
/* 
  1. GLOBAL STATE VARIABLES
  2. FUN QUOTES & RANDOMIZED BANNER PHRASES
  3. DYNAMIC FACT OF THE DAY LOADER
  4. NAVIGATION & VIEW SWITCHING (HAMBURGER MENU & DROPDOWN)
  5. AUTHENTICATION SYSTEM (LOGIN, REGISTER, RECOVERY)
  6. DASHBOARD FEEDS & NEWS LOADER (WITH UNIQUE IMAGE & ITEM FILTER)
  7. PROFILE & AVATAR MANAGEMENT
  8. APP INITIALIZATION & DRAG/DROP LISTENERS
  9. SCREENSHOT IDENTIFICATION UPLOAD HANDLER
  10. POPULAR TV SHOWS PAGE LOGIC
  11. GLOBAL TV SHOW SEARCH (BUTTON & ENTER KEY)
  12. PROFILE PAGE DYNAMIC DATA & STORAGE LOGIC
  13. TV SHOWS PAGE INITIALIZATION & SEARCH
  14. ACCOUNT SETTINGS PAGE INITIALIZATION & MODAL HELPERS
*/

// ==========================================
// 1. GLOBAL STATE VARIABLES
// ==========================================
const API_BASE_URL = "https://scenescout-sable.vercel.app"; // Defines live production Vercel backend API base URL string

let isSignUpMode = false;          // Tracks whether the auth screen is currently set to Sign Up or Sign In mode
let currentPendingUser = "";       // Stores the username string of the actively logged-in or registering user account
let userAuthToken = "";            // Stores the active authorization session token string received from backend
let selectedAvatarValue = "🎬";    // Stores the currently selected avatar icon emoji character or custom image data URL string
let allFetchedTvShows = [];        // Master storage array holding fetched TV shows objects retrieved for local UI filtering

// ==========================================
// 2. FUN QUOTES & RANDOMIZED BANNER PHRASES
// ==========================================
// Fun loading messages array displayed sequentially while waiting for the screenshot identifier API response
const loadingQuotes = [
    "Microwaving The Popcorn!",    // Loading quip referencing snack preparation before movie screening
    "Enhancing The Pixels!",        // Loading quip referencing digital video quality enhancement techniques
    "Calling Steven Spielberg!",    // Loading quip referencing a famous legendary Hollywood movie director
    "Rewinding The VHS!",            // Loading quip referencing retro magnetic tape cassette rewind mechanics
    "Calling Christopher Nolan!",   // Loading quip referencing a contemporary blockbuster director known for complex plots
    "Interrogating Extras!",        // Loading quip referencing questioning background background actors on set
    "Consulting George Lucas!",     // Loading quip referencing sci-fi franchise creator and technological pioneer
    "Paging James Cameron!",        // Loading quip referencing record-breaking underwater and action director
    "Dusting Off The Reel!",        // Loading quip referencing traditional physical film projector reels
    "Asking Peter Jackson!",        // Loading quip referencing epic fantasy film director
    "Checking With Hitchcock!",     // Loading quip referencing master of suspense and thriller cinema
    "Calling Del Toro!",            // Loading quip referencing dark fantasy and monster cinema visionary
    "Consulting Ridley Scot!",      // Loading quip referencing atmospheric sci-fi and historical director
    "Checking With Tim Burton!",    // Loading quip referencing gothic and whimsical stylistic auteur
    "Texting Spike Lee!"            // Loading quip referencing influential contemporary independent filmmaker
];

// Humorous banner phrases array shown dynamically in the top navigation header or sidebar areas
const navFunPhrases = [
    "Forgot the title again? Hand your movie buff card right over to SceneScout!",  
    "Even IMDb is judging your movie memory, which is why you crawled to SceneScout.",  
    "Stumped by a classic again? Thank goodness SceneScout is here to babysit your movie night.",  
    "Let me guess, it's on the tip of your tongue... so you opened SceneScout to do the thinking for you.",  
    "Ah yes, my favorite movie: that one scene you're begging SceneScout to identify.",  
    "You claim to love cinema yet couldn't name the protagonist without SceneScout saving you. Curious!",  
    "Popcorn is ready, but your brain isn't—good thing SceneScout brought the answers.",  
    "Let's consult SceneScout before your movie night completely falls apart.",  
    "Even the film critics are shaking their heads at why you needed SceneScout for this one.",  
    "Plot twist: you've seen this movie three times and still had to run to SceneScout.",  
    "Couldn't figure it out yourself, huh? That's exactly why SceneScout exists.",  
    "Surrendered to SceneScout because your film knowledge officially hit a wall? Fair enough.",  
    "Another day, another obscure scene you're forcing SceneScout to explain to you.",  
    "We both know Google gave you zero results, which is why you're crying for help on SceneScout.",  
    "Staring blankly at the screen until SceneScout does all the heavy lifting for your movie trivia."
];

let quoteInterval = null; // Stores active interval reference timer ID used for periodically cycling loading quotes

/**
 * Randomly selects and displays a humorous movie phrase string inside the sidebar text element.
 */
function randomizeNavPhrase() {
    const funTextElem = document.getElementById("sidebarFunText"); // Locates the sidebar fun phrase text container element in the DOM
    if (funTextElem) { // Checks if the target text container element successfully exists in the document model
        const randomIndex = Math.floor(Math.random() * navFunPhrases.length); // Generates a random array index integer based on total phrase count
        funTextElem.textContent = navFunPhrases[randomIndex]; // Assigns the randomly chosen phrase string to the text content property
    }
}

// ==========================================
// 3. DYNAMIC FACT OF THE DAY LOADER
// ==========================================
/**
 * Asynchronously fetches and displays today's movie fact from the backend REST API endpoint.
 */
async function loadFactOfDay() {
    const factElement = document.getElementById("factOfDayText"); // Locates the fact display container element in the DOM structure
    if (!factElement) return; // Exits function safely if the target DOM element is missing from page

    factElement.innerHTML = "Loading today's cinematic fact..."; // Sets initial loading text placeholder state string

    try {
        const response = await fetch(`${API_BASE_URL}/api/movie-fact`); // Sends asynchronous HTTP GET request to live fact endpoint URL
        const data = await response.json(); // Parses incoming response body stream into a JavaScript object literal

        if (data.success && data.fact) { // Validates that the parsed response contains a successful fact payload property
            factElement.innerHTML = data.fact; // Updates element inner HTML with the successfully fetched movie fact text string
        } else {
            factElement.innerHTML = "Did you know? Cinema has been captivating audiences for over a century!"; // Sets default fallback fact text string
        }
    } catch (err) {
        factElement.innerHTML = "Did you know? Movie history is packed with incredible hidden secrets."; // Sets error fallback fact text string on network failure
    }
}

// ==========================================
// 4. NAVIGATION & VIEW SWITCHING (HAMBURGER MENU & DROPDOWN)
// ==========================================
/**
 * Switches between the main dashboard feed view container and the account settings/profile view container.
 * @param {string} page - The target view identifier string ("dashboard" or "profile")
 */
function navigateTo(page) {
    const dashboardPage = document.getElementById("dashboardPage"); // Locates main dashboard container element reference in DOM
    const profilePage = document.getElementById("profilePage");     // Locates profile container element reference in DOM

    if (dashboardPage) dashboardPage.style.display = "none"; // Hides main dashboard view element by default block state setting
    if (profilePage) profilePage.style.display = "none";     // Hides profile view element by default block state setting

    if (page === "profile") { // Checks if target navigation destination string equals profile view
        if (profilePage) profilePage.style.display = "block"; // Displays the profile page container block element
        fetchAndPopulateProfile(); // Triggers function to load user profile metadata details from backend server
    } else {
        if (dashboardPage) dashboardPage.style.display = "flex"; // Displays dashboard container element with flex layout configuration
    }
}

/**
 * Toggles the visibility state class on or off for the responsive hamburger menu container dropdown.
 * @param {Event} event - The native browser click event object triggering the toggle action
 */
function toggleHamburgerMenu(event) {
    event.stopPropagation(); // Stops click event bubbling upward to global window listener handlers
    const menu = document.getElementById("hamburgerMenu"); // Locates hamburger dropdown menu box element in DOM
    if (menu) {
        menu.classList.toggle("show"); // Toggles CSS show visibility class on or off on the menu element
    }
}

/**
 * Closes the hamburger navigation menu container dropdown box.
 */
function closeHamburgerMenu() {
    const menu = document.getElementById("hamburgerMenu"); // Locates hamburger dropdown menu element reference in DOM
    if (menu) {
        menu.classList.remove("show"); // Removes CSS show visibility class to hide menu container element completely
    }
}

/**
 * Navigates back to index.html homepage and sets a local storage flag to automatically open account settings view on load.
 */
function navigateToSettingsFromHamburger() {
    localStorage.setItem("open_settings", "true"); // Sets local storage flag boolean string to trigger settings view on subsequent load
    window.location.href = "index.html"; // Redirects browser window location path to index.html homepage url
}

// Global window click event listener to close responsive hamburger menus automatically whenever clicking outside containers
window.addEventListener("click", () => {
    closeHamburgerMenu(); // Invokes close hamburger menu function whenever anywhere on window surface is clicked
});

// ==========================================
// 5. AUTHENTICATION SYSTEM (LOGIN, REGISTER, RECOVERY)
// ==========================================
/**
 * Toggles the authentication form interface state between Sign In and Sign Up user modes.
 */
function toggleAuthMode() {
    isSignUpMode = !isSignUpMode; // Inverts boolean value of sign up mode tracking state flag
    const title = document.getElementById("authTitle"); // Locates authentication header title element in DOM
    const primaryBtn = document.getElementById("primaryAuthBtn"); // Locates main form submission button element in DOM
    const toggleBtn = document.getElementById("toggleAuthModeBtn"); // Locates mode toggle button switch element in DOM
    const forgotBtn = document.getElementById("forgotPasswordBtn"); // Locates forgot password link button element in DOM
    const emailInput = document.getElementById("emailInput"); // Locates email text input field element in DOM
    const emailBr = document.getElementById("emailBr"); // Locates first email line break element in DOM
    const emailBr2 = document.getElementById("emailBr2"); // Locates second email line break element in DOM
    const msg = document.getElementById("authMessage"); // Locates status feedback message container element in DOM

    if (msg) msg.textContent = ""; // Clears existing status message text string content safely

    if (isSignUpMode) { // Checks if interface switched into user sign up mode state
        if (title) title.textContent = "Create SceneScout Account"; // Updates heading text string for registration view
        if (primaryBtn) primaryBtn.textContent = "Sign Up"; // Updates submission button label text string for registration
        if (toggleBtn) toggleBtn.textContent = "Already Have An Account? Sign In"; // Updates toggle prompt text string
        if (forgotBtn) forgotBtn.style.display = "none"; // Hides password recovery link element during sign up mode
        if (emailInput) emailInput.style.display = "inline-block"; // Displays email input field element for account registration
        if (emailBr) emailBr.style.display = "inline"; // Displays email line break element 1
        if (emailBr2) emailBr2.style.display = "inline"; // Displays email line break element 2
    } else { // Handles standard user sign in mode interface state
        if (title) title.textContent = "Sign In To SceneScout"; // Updates heading text string for sign in view
        if (primaryBtn) primaryBtn.textContent = "Sign In"; // Updates submission button label text string for sign in
        if (toggleBtn) toggleBtn.textContent = "Need An Account? Sign Up"; // Updates toggle prompt text string
        if (forgotBtn) forgotBtn.style.display = "inline-block"; // Displays password recovery link element during sign in mode
        if (emailInput) emailInput.style.display = "none"; // Hides email input field element during standard sign in
        if (emailBr) emailBr.style.display = "none"; // Hides email line break element 1
        if (emailBr2) emailBr2.style.display = "none"; // Hides email line break element 2
    }
}

/**
 * Displays the password recovery view container section and hides standard login credentials form.
 */
function showForgotPasswordView() {
    const credForm = document.getElementById("credentialsForm"); // Locates standard credentials login form container element
    const forgotSec = document.getElementById("forgotPasswordSection"); // Locates password recovery section container element
    const authTitle = document.getElementById("authTitle"); // Locates authentication title header element
    const authMsg = document.getElementById("authMessage"); // Locates authentication message feedback element

    if (credForm) credForm.style.display = "none"; // Hides standard login credential inputs form block element
    if (forgotSec) forgotSec.style.display = "block"; // Shows password recovery container block element on screen
    if (authTitle) authTitle.textContent = "Reset Password"; // Updates header text title string for reset flow
    if (authMsg) authMsg.textContent = ""; // Clears status message text string content safely
}

/**
 * Hides the password recovery view section and returns interface back to the standard sign-in form.
 */
function hideForgotPasswordView() {
    const forgotSec = document.getElementById("forgotPasswordSection"); // Locates password recovery section container element
    const credForm = document.getElementById("credentialsForm"); // Locates standard credentials login form container element
    const authTitle = document.getElementById("authTitle"); // Locates authentication title header element
    const authMsg = document.getElementById("authMessage"); // Locates authentication message feedback element

    if (forgotSec) forgotSec.style.display = "none"; // Hides password recovery container section element
    if (credForm) credForm.style.display = "block"; // Restores standard credential inputs form block element on screen
    if (authTitle) authTitle.textContent = "Sign In to SceneScout"; // Restores default sign-in heading text title string
    if (authMsg) authMsg.textContent = ""; // Clears status message text string content safely
}

/**
 * Submits the user's email address string to the backend API to trigger a password reset recovery link email.
 */
async function submitForgotPassword() {
    const emailInput = document.getElementById("forgotEmailInput"); // Locates password reset email text input element
    const email = emailInput ? emailInput.value.trim() : ""; // Extracts and trims email input value string safely
    const msg = document.getElementById("authMessage"); // Locates status feedback message container element

    if (!email) { // Checks if email input field string value is left empty by user
        if (msg) msg.textContent = "Please Enter Your Email Address."; // Displays validation error message string
        return; // Exits function execution early
    }

    if (msg) msg.textContent = "Sending Reset Link..."; // Updates message status text string during asynchronous request transmission

    try {
        const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        }); // Sends password recovery POST request payload to live backend REST API endpoint URL

        const data = await response.json(); // Parses incoming response stream into a JSON object literal

        if (response.ok) { // Checks if backend request completed with success status code
            if (msg) {
                msg.style.color = "#4bb543"; // Sets status text color style property to success green
                msg.textContent = data.message || "Password Reset Link Sent!"; // Displays success message string from server response
            }
            setTimeout(() => {
                if (msg) msg.style.color = "#ff4d4d"; // Resets status text color style property back to error red
                hideForgotPasswordView(); // Returns interface view back to standard sign-in view after timeout delay
            }, 3000);
        } else {
            if (msg) msg.textContent = data.detail || "Failed To Send Reset Email."; // Displays backend error detail message string on failure
        }
    } catch (err) {
        if (msg) msg.textContent = "Server Error Connecting To Backend."; // Displays connection error message string on network exception
    }
}

/**
 * Handles user login and registration form submissions by transmitting payloads to the backend API.
 */
async function handleAuthSubmit() {
    const usernameInput = document.getElementById("usernameInput"); // Locates username text input field element
    const passwordInput = document.getElementById("passwordInput"); // Locates password text input field element
    const username = usernameInput ? usernameInput.value.trim() : ""; // Extracts and trims username input value string
    const password = passwordInput ? passwordInput.value.trim() : ""; // Extracts and trims password input value string
    const emailInput = document.getElementById("emailInput"); // Locates optional registration email input element in DOM
    const email = emailInput ? emailInput.value.trim() : ""; // Extracts email string if input element exists on screen
    const msg = document.getElementById("authMessage"); // Locates authentication status message element reference

    if (!username || !password) { // Checks if required authentication text input fields are missing values
        if (msg) msg.textContent = "Please Fill In All REQUIRED Fields!"; // Displays validation error message text string
        return; // Exits execution flow early
    }

    if (isSignUpMode && !email) { // Validates that email string requirement is met during sign up mode state
        if (msg) msg.textContent = "Email Address Is REQUIRED For Registration!"; // Displays validation error message text string
        return; // Exits execution flow early
    }

    if (msg) msg.textContent = "Processing..."; // Displays loading status message text string while awaiting network response

    const endpoint = isSignUpMode ? "/api/register" : "/api/login"; // Determines endpoint route path string based on active mode flag
    const bodyData = isSignUpMode ? { username, password, email } : { username, password }; // Sets request body object payload structure

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyData)
        }); // Sends authentication API request POST payload to live FastAPI backend server

        const data = await response.json(); // Parses response body stream into a JSON object literal

        if (response.ok) { // Checks if authentication request returned success status code
            if (msg) msg.textContent = ""; // Clears status message feedback string content
            currentPendingUser = username; // Stores active username string inside pending state memory variable

            if (isSignUpMode) { // Handles successful account registration completion flow
                alert("SceneScout Account Created! Please Click Sign In."); // Displays success alert dialog popup box
                toggleAuthMode(); // Switches form view back to standard sign in mode interface state
            } else if (data.mfa_required) { // Checks if two-factor multi-factor authentication (MFA) step is required by server response
                const credForm = document.getElementById("credentialsForm"); // Locates credentials login form container
                const mfaSec = document.getElementById("mfaSection"); // Locates MFA code input section container
                const mfaNotice = document.getElementById("mfaNotice"); // Locates MFA notification instructions text element
                const mfaCodeInput = document.getElementById("mfaCodeInput"); // Locates 6-digit MFA code text input element

                if (credForm) credForm.style.display = "none"; // Hides standard credentials login form element container
                if (mfaSec) mfaSec.style.display = "block"; // Displays MFA code input section container element on screen
                if (mfaNotice) mfaNotice.textContent = data.message || `Enter the 6-Digit Code Sent to Your Email:`; // Sets instruction notice text string
                if (mfaCodeInput) mfaCodeInput.focus(); // Automatically focuses keyboard cursor inside MFA code input text field
            }
        } else {
            if (msg) msg.textContent = data.detail || "Authentication Failed."; // Displays server error detail message text string
        }
    } catch (err) {
        if (msg) msg.textContent = "Server Error. Ensure backend is running online."; // Displays server connection error text string on failure
    }
}

/**
 * Verifies the Multi-Factor Authentication (MFA) 6-digit verification code string provided by the user.
 */
async function verifyMfaCode() {
    const mfaCodeInput = document.getElementById("mfaCodeInput"); // Locates 6-digit MFA code input element in DOM
    const code = mfaCodeInput ? mfaCodeInput.value.trim() : ""; // Extracts and trims 6-digit code input value string safely
    const msg = document.getElementById("authMessage"); // Locates status feedback message element reference

    if (!code || code.length !== 6) { // Validates that code string length equals exactly six characters
        if (msg) msg.textContent = "Please Enter A Valid 6-Digit Code!"; // Displays validation error message text string
        return; // Exits execution flow early
    }

    const usernameInput = document.getElementById("usernameInput"); // Locates login username input field element
    const usernameInputVal = usernameInput ? usernameInput.value.trim() : ""; // Extracts username input value string
    const targetUser = currentPendingUser || usernameInputVal; // Determines target username string from pending state or input field

    if (!targetUser) { // Checks if target username tracking string is lost or empty
        if (msg) msg.textContent = "Session username lost. Please sign in again."; // Displays error message string
        return; // Exits execution flow early
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/verify-mfa`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: targetUser, code: code })
        }); // Sends MFA verification POST request payload to live backend API endpoint URL

        const data = await response.json(); // Parses response body stream into a JSON object literal

        if (response.ok && data.token) { // Checks if verification succeeded and returned a valid session token string
            userAuthToken = data.token; // Stores session token string in memory variable
            currentPendingUser = data.username; // Confirms authenticated username tracking string value
            
            localStorage.setItem("scenescout_token", userAuthToken); // Stores session token string inside browser local storage cache
            localStorage.setItem("scenescout_username", currentPendingUser); // Stores username string inside browser local storage cache

            if (data.profile && data.profile.avatar) { // Checks if user profile payload contains a custom avatar property
                selectedAvatarValue = data.profile.avatar; // Updates avatar memory variable state string value
            }
            localStorage.setItem("scenescout_avatar", selectedAvatarValue); // Stores active avatar string inside local storage cache

            const authScreen = document.getElementById("authScreen"); // Locates authentication full-screen overlay container
            const dashboardScreen = document.getElementById("dashboardScreen"); // Locates main dashboard layout container

            if (authScreen) authScreen.style.display = "none"; // Hides full-screen authentication overlay container element
            if (dashboardScreen) dashboardScreen.style.display = "block"; // Displays main dashboard layout screen container element
            
            randomizeNavPhrase(); // Triggers random navigation fun phrase generator function
            loadFactOfDay(); // Triggers daily movie fact loader function

            const displayUserElem = document.getElementById("displayUsername"); // Locates display username profile element
            if (displayUserElem) displayUserElem.textContent = currentPendingUser; // Updates display username header text label string
            const navUserElem = document.getElementById("navUsername"); // Locates top navigation username text span element
            if (navUserElem) navUserElem.textContent = currentPendingUser; // Updates top navigation username text label string
            const hamburgerUserElem = document.getElementById("hamburgerUsername"); // Locates hamburger menu username element
            if (hamburgerUserElem) hamburgerUserElem.textContent = currentPendingUser; // Updates hamburger menu username text label string

            updateAvatarDisplay(selectedAvatarValue); // Updates user avatar view graphics across all UI components

            if (data.profile) { // Populates form fields if profile metadata object exists in server response
                const emailDisp = document.getElementById("currentEmailDisplay"); // Locates current email display box element
                const phoneInput = document.getElementById("profilePhone"); // Locates phone number input field element
                const birthdateInput = document.getElementById("profileBirthdate"); // Locates birthdate picker input element
                const genderSelect = document.getElementById("profileGender"); // Locates gender select dropdown element
                const bioInput = document.getElementById("profileBio"); // Locates user bio input text element

                if (data.profile.email && emailDisp) emailDisp.textContent = data.profile.email; 
                if (data.profile.phone && phoneInput) phoneInput.value = data.profile.phone; 
                if (data.profile.birthdate && birthdateInput) birthdateInput.value = data.profile.birthdate; 
                if (data.profile.gender && genderSelect) genderSelect.value = data.profile.gender; 
                if (data.profile.bio && bioInput) bioInput.value = data.profile.bio; 
            }

            loadMovieNews(); // Triggers function to fetch and populate movie news feed cards on dashboard
            navigateTo('dashboard'); // Sets active application view state to dashboard home view
        } else {
            if (msg) msg.textContent = data.detail || "Invalid Verification Code."; // Displays error message string if verification code is incorrect
        }
    } catch (err) {
        if (msg) msg.textContent = "Error connecting to Server During Verification."; // Displays network error message string on exception
    }
}

/**
 * Asynchronously fetches user profile data from the backend server and populates form input fields and avatar views.
 */
async function fetchAndPopulateProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/profile`, {
            method: "GET",
            headers: { "username": currentPendingUser || localStorage.getItem("scenescout_username") || "" }
        }); // Sends HTTP GET request to fetch user profile data with active username request header
        const data = await response.json(); // Parses response body stream into a JSON object literal
        if (response.ok && data.success && data.profile) { // Validates successful profile retrieval response structure
            if (data.profile.avatar) { // Checks if profile data object includes an avatar property setting
                selectedAvatarValue = data.profile.avatar; // Updates avatar memory variable state string
                updateAvatarDisplay(selectedAvatarValue); // Refreshes UI avatar preview graphics rendering on screen
                localStorage.setItem("scenescout_avatar", selectedAvatarValue); // Updates local storage avatar cache string
            }
            const emailDisp = document.getElementById("currentEmailDisplay"); // Locates current email text display element
            const phoneInput = document.getElementById("profilePhone"); // Locates phone number input field element
            const birthdateInput = document.getElementById("profileBirthdate"); // Locates birthdate picker input element
            const genderSelect = document.getElementById("profileGender"); // Locates gender select dropdown element
            const bioInput = document.getElementById("profileBio"); // Locates user bio input textarea element

            if (data.profile.email && emailDisp) emailDisp.textContent = data.profile.email; 
            if (data.profile.phone && phoneInput) phoneInput.value = data.profile.phone; 
            if (data.profile.birthdate && birthdateInput) birthdateInput.value = data.profile.birthdate; 
            if (data.profile.gender && genderSelect) genderSelect.value = data.profile.gender; 
            if (data.profile.bio && bioInput) bioInput.value = data.profile.bio; 
        }
    } catch (err) {
        console.log("Error Loading Profile Data"); // Logs exception error string to console if profile fetch operation fails
    }
}

/**
 * Logs out the active user account, clears browser local storage authentication tokens, 
 * and redirects to the sign-in screen or resets the overlay.
 */
function handleLogout() {
    userAuthToken = ""; // Clears session token memory state string value
    currentPendingUser = ""; // Clears active username tracking variable string value

    localStorage.removeItem("scenescout_token"); // Clears authentication token string from browser local storage cache
    localStorage.removeItem("scenescout_username"); // Clears saved username string from browser local storage cache
    localStorage.removeItem("scenescout_avatar"); // Clears saved avatar setting string from browser local storage cache

    const dashboardScreen = document.getElementById("dashboardScreen"); // Locates main dashboard screen container element
    const authScreen = document.getElementById("authScreen"); // Locates authentication full-screen overlay container element

    // If we are currently on a page that lacks the auth overlay (like profile.html or tvshows.html), redirect to index.html
    if (!authScreen || !dashboardScreen) {
        window.location.href = "index.html";
        return;
    }

    const credForm = document.getElementById("credentialsForm"); // Locates credentials login form container element
    const mfaSec = document.getElementById("mfaSection"); // Locates MFA section container element
    const usernameInput = document.getElementById("usernameInput"); // Locates username text input field element
    const passwordInput = document.getElementById("passwordInput"); // Locates password text input field element
    const mfaCodeInput = document.getElementById("mfaCodeInput"); // Locates 6-digit MFA code input element
    const authMsg = document.getElementById("authMessage"); // Locates authentication status message text element

    dashboardScreen.style.display = "none"; // Hides dashboard screen
    dashboardScreen.classList.add("dashboard-screen-hidden"); // Adds hidden CSS class
    
    authScreen.style.display = "flex"; // Forces auth screen to display as flex container
    authScreen.classList.remove("modal-overlay-hidden"); // Ensures hidden class is removed
    
    if (credForm) credForm.style.display = "block"; // Restores standard credential login form
    if (mfaSec) mfaSec.style.display = "none"; // Hides MFA verification box
    
    if (usernameInput) usernameInput.value = ""; // Resets username input
    if (passwordInput) passwordInput.value = ""; // Resets password input
    if (mfaCodeInput) mfaCodeInput.value = ""; // Resets MFA code input
    if (authMsg) authMsg.textContent = ""; // Clears status message
    
    resetSearch(); // Resets search upload container state
}

// ==========================================
// 6. DASHBOARD FEEDS & NEWS LOADER (WITH UNIQUE IMAGE & ITEM FILTER)
// ==========================================
/**
 * Fetches and renders movie news, recent releases, upcoming films, and community discussion feeds.
 * Applies unique image filtering algorithms to prevent repeating article posters in the news feed.
 */
async function loadMovieNews() {
    const recentFeed = document.getElementById("recentFeed"); // Locates recent releases feed container element in DOM
    const upcomingFeed = document.getElementById("upcomingFeed"); // Locates upcoming movies feed container element in DOM
    const newsFeed = document.getElementById("newsFeed"); // Locates news articles feed container element in DOM
    const discussionFeed = document.getElementById("discussionFeed"); // Locates community discussions feed element in DOM
    if (!recentFeed || !upcomingFeed || !newsFeed || !discussionFeed) return; // Exits function early if any feed container element is missing

    try {
        const res = await fetch(`${API_BASE_URL}/api/movie-news`); // Sends HTTP GET request for aggregated live movie feeds JSON payload
        const data = await res.json(); // Parses incoming response body stream into a JSON object literal
        
        if (data.success) { // Checks if data retrieval operation completed successfully
            if (data.recent_releases && data.recent_releases.length > 0) { // Checks if recent releases array contains items
                recentFeed.innerHTML = data.recent_releases.map(item => `
                    <div class="news-card">
                        <div>
                            ${item.poster ? `<img src="${item.poster}" alt="Poster">` : ""}
                            <h4>${item.title}</h4>
                            <p>${item.release_date}</p>
                        </div>
                    </div>
                `).join(""); // Maps array elements into HTML card markup strings and injects into container inner HTML
            } else {
                recentFeed.textContent = "No Recent Releases Found."; // Displays empty notice text string placeholder
            }

            if (data.upcoming_releases && data.upcoming_releases.length > 0) { // Checks if upcoming movies array contains items
                upcomingFeed.innerHTML = data.upcoming_releases.map(item => `
                    <div class="news-card">
                        <div>
                            ${item.poster ? `<img src="${item.poster}" alt="Poster">` : ""}
                            <h4>${item.title}</h4>
                            <p>${item.release_date}</p>
                        </div>
                    </div>
                `).join(""); // Maps upcoming movie objects into HTML card markup strings
            } else {
                upcomingFeed.textContent = "No Upcoming Movies Found."; // Displays empty notice text string placeholder
            }

            // News feed filtered for unique images (posters) and capped at a maximum of 12 items
            if (data.news && data.news.length > 0) { // Checks if news articles array contains items
                const uniqueNews = [
                    ...new Map(data.news.map(item => [item.poster, item])).values()
                ].slice(0, 12); // Filters out duplicate poster images using a JavaScript Map object and slices array to 12 items max

                newsFeed.innerHTML = uniqueNews.map(item => `
                    <div class="news-card">
                        <div>
                            ${item.poster ? `<img src="${item.poster}" alt="Poster">` : ""}
                            <h4>${item.title}</h4>
                            <p>${item.release_date}</p>
                        </div>
                        ${item.url ? `<a href="${item.url}" target="_blank" class="forum-link">Click to Read</a>` : ""}
                    </div>
                `).join(""); // Renders unique news cards with external article read links
            } else {
                newsFeed.textContent = "No News Available Right Now."; // Displays empty notice text string placeholder
            }

            if (data.discussions && data.discussions.length > 0) { // Checks if discussion items array contains items
                discussionFeed.innerHTML = data.discussions.map(item => `
                    <div class="news-card">
                        <div>
                            <h4>${item.title}</h4>
                            <p>${item.release_date}</p>
                        </div>
                        ${item.url ? `<a href="${item.url}" target="_blank" class="forum-link">Click to Read</a>` : ""}
                    </div>
                `).join(""); // Renders community discussion review cards with external forum links
            } else {
                discussionFeed.textContent = "No Discussions Available Right Now."; // Displays empty notice text string placeholder
            }
        }
    } catch (err) {
        if (recentFeed) recentFeed.textContent = "Unable to load recent releases."; // Sets fallback error text string for recent feed
        if (upcomingFeed) upcomingFeed.textContent = "Unable to load upcoming releases."; // Sets fallback error text string for upcoming feed
        if (newsFeed) newsFeed.textContent = "Unable to load news."; // Sets fallback error text string for news feed
        if (discussionFeed) discussionFeed.textContent = "Unable to load discussions."; // Sets fallback error text string for discussions feed
    }
}

// ==========================================
// 7. PROFILE & AVATAR MANAGEMENT
// ==========================================
/**
 * Sets and updates the selected preset avatar icon emoji character string.
 * @param {string} iconChar - The emoji character string representing the selected preset avatar icon
 */
function selectPresetAvatar(iconChar) {
    selectedAvatarValue = iconChar; // Updates avatar memory variable state string with chosen character emoji
    updateAvatarDisplay(iconChar); // Triggers function to refresh UI avatar graphics elements across screen
    localStorage.setItem("scenescout_avatar", iconChar); // Saves chosen avatar string into browser local storage cache
    
    const fileInput = document.getElementById("profileAvatarInput"); // Locates custom file upload input element in DOM
    if (fileInput) fileInput.value = ""; // Resets file input value string so presets override any previously uploaded files

    document.querySelectorAll(".preset-icon").forEach(el => { // Loops through all available preset avatar icon elements in DOM
        if (el.textContent === iconChar) { // Checks if current icon element text matches selected character string
            el.classList.add("selected"); // Adds CSS selected highlight border class to matching icon element
        } else {
            el.classList.remove("selected"); // Removes CSS selected highlight class from non-matching icon elements
        }
    });
}

/**
 * Updates avatar preview container elements across the user profile, top navigation bar, and hamburger dropdown header.
 * @param {string} avatarSrcOrChar - Image base64 data URL, http url, or emoji character string for the avatar
 */
function updateAvatarDisplay(avatarSrcOrChar) {
    selectedAvatarValue = avatarSrcOrChar; // Updates global memory variable state string
    localStorage.setItem("scenescout_avatar", avatarSrcOrChar); // Caches active avatar string inside browser local storage
    
    const profileImg = document.getElementById("profileAvatarPreview"); // Locates profile hub avatar display container element in DOM
    const navImg = document.getElementById("navAvatarPreview"); // Locates top navigation bar avatar preview element in DOM
    const hamburgerImg = document.getElementById("hamburgerAvatarPreview"); // Locates hamburger menu avatar preview element in DOM

    if (profileImg) { // Checks if profile avatar container element exists in DOM structure
        if (avatarSrcOrChar.startsWith("data:") || avatarSrcOrChar.startsWith("http") || avatarSrcOrChar.includes(".")) {
            profileImg.innerHTML = `<img src="${avatarSrcOrChar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`; // Renders custom image element inside profile preview box
        } else {
            profileImg.innerHTML = avatarSrcOrChar; // Renders emoji character string directly inside profile preview box
        }
    }

    if (navImg) { // Checks if top navigation avatar preview element exists in DOM structure
        if (avatarSrcOrChar.startsWith("data:") || avatarSrcOrChar.startsWith("http") || avatarSrcOrChar.includes(".")) {
            navImg.innerHTML = `<img src="${avatarSrcOrChar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`; // Renders custom image element inside navigation preview span
        } else {
            navImg.innerHTML = avatarSrcOrChar; // Renders emoji character string directly inside navigation preview span
        }
    }

    if (hamburgerImg) { // Checks if hamburger menu avatar preview element exists in DOM structure
        if (avatarSrcOrChar.startsWith("data:") || avatarSrcOrChar.startsWith("http") || avatarSrcOrChar.includes(".")) {
            hamburgerImg.innerHTML = `<img src="${avatarSrcOrChar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`; // Renders custom image element inside hamburger menu header preview
        } else {
            hamburgerImg.innerHTML = avatarSrcOrChar; // Renders emoji character string directly inside hamburger menu header preview
        }
    }
}

/**
 * Handles custom image file uploads for user profile avatars by reading selected files into base64 data URLs.
 */
function previewProfileAvatar() {
    const fileInput = document.getElementById("profileAvatarInput"); // Locates custom profile image file input element in DOM

    if (fileInput && fileInput.files && fileInput.files[0]) { // Checks if a valid image file object was selected by user
        const reader = new FileReader(); // Initializes a new FileReader utility instance
        reader.onload = function(e) { // Defines callback function executed when file reading reader operation completes
            selectedAvatarValue = e.target.result; // Stores base64 data URL string result in memory variable
            updateAvatarDisplay(selectedAvatarValue); // Refreshes UI avatar preview elements with new image data string
            localStorage.setItem("scenescout_avatar", selectedAvatarValue); // Saves base64 image string inside browser local storage cache
            document.querySelectorAll(".preset-icon").forEach(el => el.classList.remove("selected")); // Clears preset icon selection highlight classes
        };
        reader.readAsDataURL(fileInput.files[0]); // Reads uploaded file object as a base64 encoded data URL string
    }
}

/**
 * Saves updated user profile details, credentials, and settings by transmitting a POST payload to the backend API.
 */
async function saveProfile() {
    const newUsernameInput = document.getElementById("newUsernameInput"); // Locates new username input field element in DOM
    const newUsername = newUsernameInput ? newUsernameInput.value.trim() : ""; // Extracts and trims new username string value safely
    
    const emailElem = document.getElementById("profileEmail"); // Locates profile email input field element in DOM
    const newEmail = emailElem ? emailElem.value.trim() : ""; // Extracts and trims email input string value safely
    
    const phoneElem = document.getElementById("profilePhone"); // Locates phone number input field element in DOM
    const newPhone = phoneElem ? phoneElem.value.trim() : ""; // Extracts and trims phone string value safely
    
    const currentPassElem = document.getElementById("currentPasswordInput"); // Locates current password input field element in DOM
    const currentPassword = currentPassElem ? currentPassElem.value.trim() : ""; // Extracts and trims current password string value safely
    
    const newPassElem = document.getElementById("newPasswordInput"); // Locates new password input field element in DOM
    const newPassword = newPassElem ? newPassElem.value.trim() : ""; // Extracts and trims new password string value safely
    
    const birthdateElem = document.getElementById("profileBirthdate"); // Locates birthdate picker input element in DOM
    const birthdate = birthdateElem ? birthdateElem.value : ""; // Extracts birthdate string value safely
    
    const genderElem = document.getElementById("profileGender"); // Locates gender select dropdown element in DOM
    const gender = genderElem ? genderElem.value : ""; // Extracts selected gender value string safely
    
    const bioElem = document.getElementById("profileBio"); // Locates biographical text area element in DOM
    const bio = bioElem ? bioElem.value : ""; // Extracts bio text string value safely

    if (newPassword && !currentPassword) { // Validates that current password string is entered if user is attempting to change password
        showSuccessModal("Please Enter Current Password To Change It."); // Displays warning notice inside custom styled modal window
        return; // Exits execution flow early
    }

    const activeUser = currentPendingUser || localStorage.getItem("scenescout_username") || ""; // Determines active username string

    try {
        const response = await fetch(`${API_BASE_URL}/api/profile/update`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "username": activeUser 
            },
            body: JSON.stringify({
                new_username: newUsername,
                email: newEmail,
                phone: newPhone,
                current_password: currentPassword,
                password: newPassword,
                birthdate: birthdate,
                gender: gender,
                bio: bio,
                avatar: selectedAvatarValue
            })
        }); // Sends profile update POST request payload to live backend API endpoint URL with active username header

        const data = await response.json(); // Parses response body stream into a JSON object literal

        if (response.ok && data.success) { // Checks if profile update request completed with success status code
            if (currentPassElem) currentPassElem.value = ""; // Resets current password input field value to empty string
            if (newPassElem) newPassElem.value = ""; // Resets new password input field value to empty string
            if (emailElem) emailElem.value = ""; // Resets email input field value to empty string

            if (newPassword) { // Checks if account password string was successfully updated
                showSuccessModal("Password Changed Successfully! Please Log In Again."); // Displays confirmation inside custom styled modal window
                setTimeout(() => {
                    handleLogout(); // Triggers logout function after modal acknowledgement to force re-authentication with new password
                }, 2000);
            } else {
                showSuccessModal("Settings Updated Successfully!"); // Displays general success confirmation inside custom styled modal window
                if (data.new_username) { // Checks if username string was successfully changed by backend
                    currentPendingUser = data.new_username; // Updates active username tracking variable string value
                    localStorage.setItem("scenescout_username", currentPendingUser); // Updates local storage username cache string
                    const disp = document.getElementById("displayUsername"); // Locates profile username display element in DOM
                    if (disp) disp.textContent = currentPendingUser; // Updates username label text string content
                    const navUsr = document.getElementById("navUsername"); // Locates top navigation username label element in DOM
                    if (navUsr) navUsr.textContent = currentPendingUser; // Updates navigation username text label string content
                    const hamburgerUsr = document.getElementById("hamburgerUsername"); // Locates hamburger menu username element in DOM
                    if (hamburgerUsr) hamburgerUsr.textContent = currentPendingUser; // Updates hamburger menu username text label string content
                    if (newUsernameInput) newUsernameInput.value = ""; // Clears new username text input field value string
                }
                const emailDisp = document.getElementById("currentEmailDisplay"); // Locates current email text display box element in DOM
                if (data.profile && data.profile.email && emailDisp) {
                    emailDisp.textContent = data.profile.email; // Updates email text display string content
                }
                if (data.profile && data.profile.avatar) {
                    selectedAvatarValue = data.profile.avatar; // Updates avatar memory variable state string value
                    updateAvatarDisplay(selectedAvatarValue); // Refreshes UI avatar preview graphics rendering on screen
                    localStorage.setItem("scenescout_avatar", selectedAvatarValue); // Updates local storage avatar cache string
                }
            }
        } else {
            showSuccessModal(data.detail || "Failed To Update Profile Data."); // Displays error detail message inside custom styled modal window on failure
        }
    } catch (err) {
        console.error("Save Profile Error:", err); // Logs error object to console for debugging purposes
        showSuccessModal("Error Saving Profile."); // Displays network error notice inside custom styled modal window
    }
}

/**
 * Permanently deletes the user account after obtaining explicit confirmation from the user.
 */
async function deleteAccount() {
    if (!confirm("Are You Sure You Want To Delete Your SceneScout Account? This Action Cannot Be UNDONE!")) {
        return; // Exits execution flow early if user cancels deletion confirmation prompt dialog box
    }

    const activeUser = currentPendingUser || localStorage.getItem("scenescout_username") || ""; // Determines active username string

    try {
        const response = await fetch(`${API_BASE_URL}/api/account/delete`, {
            method: "POST",
            headers: { "username": activeUser }
        }); // Sends account deletion POST request payload to live backend API endpoint URL with username header

        const data = await response.json(); // Parses response body stream into a JSON object literal

        if (response.ok && data.success) { // Checks if account deletion request completed with success status code
            showSuccessModal("Account deleted successfully."); // Displays confirmation notice inside custom styled modal window
            setTimeout(() => {
                handleLogout(); // Triggers logout function to clean session data and reset screen view state back to sign in
            }, 2000);
        } else {
            showSuccessModal(data.detail || "Failed To Delete Account."); // Displays error detail inside custom styled modal window on failure
        }
    } catch (err) {
        showSuccessModal("Error Deleting Account."); // Displays connection error notice inside custom styled modal window on failure
    }
}

// ==========================================
// 8. APP INITIALIZATION & DRAG/DROP LISTENERS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const savedToken = localStorage.getItem("scenescout_token"); // Retrieves saved session token string from browser local storage cache
    const savedUsername = localStorage.getItem("scenescout_username"); // Retrieves saved username string from browser local storage cache
    const savedAvatar = localStorage.getItem("scenescout_avatar"); // Retrieves saved avatar setting string from browser local storage cache

    if (savedToken && savedUsername) { // Checks if valid session token and username strings exist in local storage cache
        userAuthToken = savedToken; // Restores session token memory state string value
        currentPendingUser = savedUsername; // Restores active username tracking state string value

        const authScreenElem = document.getElementById("authScreen"); // Locates authentication full-screen overlay container element
        if (authScreenElem) authScreenElem.style.display = "none"; // Hides authentication screen overlay container element if present in DOM
        
        const dashboardScreenElem = document.getElementById("dashboardScreen"); // Locates main dashboard screen layout container element
        if (dashboardScreenElem) dashboardScreenElem.style.display = "block"; // Displays main dashboard screen layout container element if present in DOM
        
        randomizeNavPhrase(); // Triggers random navigation fun phrase generator function
        loadFactOfDay(); // Triggers daily movie fact loader function

        const displayUserElem = document.getElementById("displayUsername"); // Locates display username element in DOM
        if (displayUserElem) displayUserElem.textContent = currentPendingUser; // Sets display username header text label string content
        const navUserElem = document.getElementById("navUsername"); // Locates top navigation username text span element in DOM
        if (navUserElem) navUserElem.textContent = currentPendingUser; // Sets top navigation username text label string content
        const hamburgerUserElem = document.getElementById("hamburgerUsername"); // Locates hamburger menu username element in DOM
        if (hamburgerUserElem) hamburgerUserElem.textContent = currentPendingUser; // Sets hamburger menu username text label string content

        if (savedAvatar) {
            selectedAvatarValue = savedAvatar; // Restores saved avatar memory variable state string value
        }

        fetchAndPopulateProfile(); // Fetches fresh profile data from backend API server
        loadMovieNews(); // Loads movie news feed cards into dashboard view containers
        if (document.getElementById("dashboardPage")) {
            navigateTo('dashboard'); // Initializes app view state to dashboard home view if view controller exists in DOM
        }
    }

    updateAvatarDisplay(selectedAvatarValue); // Updates UI avatar graphics containers with active memory value

    const credentialsInputs = ["usernameInput", "emailInput", "passwordInput"]; // Defines array of authentication form input element ID strings
    credentialsInputs.forEach(id => { // Loops through each input element ID string in array
        const inputElem = document.getElementById(id); // Locates target form input element in DOM
        if (inputElem) {
            inputElem.addEventListener("keypress", (e) => { // Listens for native keyboard keypress events on input element
                if (e.key === "Enter") { // Checks if pressed key string equals Enter key
                    e.preventDefault(); // Prevents default browser form submission behavior
                    handleAuthSubmit(); // Triggers authentication form submission function automatically
                }
            });
        }
    });

    const mfaInput = document.getElementById("mfaCodeInput"); // Locates MFA verification code text input element in DOM
    if (mfaInput) {
        mfaInput.addEventListener("keypress", (e) => { // Listens for native keyboard keypress events on MFA input element
            if (e.key === "Enter") { // Checks if pressed key string equals Enter key
                e.preventDefault(); // Prevents default browser form submission behavior
                verifyMfaCode(); // Triggers MFA code verification function automatically
            }
        });
    }

    const dropLabel = document.getElementById("dropLabel"); // Locates screenshot file drag-and-drop zone container element in DOM
    const fileInput = document.getElementById("imageInput"); // Locates hidden file upload input element in DOM

    if (dropLabel && fileInput) { // Checks if drag-and-drop elements successfully exist in DOM structure
        ["dragenter", "dragover"].forEach((eventName) => { // Loops through drag events that indicate hovering over drop zone area
            dropLabel.addEventListener(eventName, (e) => {
                e.preventDefault(); // Prevents default browser behavior for drag events
                e.stopPropagation(); // Stops event propagation bubbling upward
                dropLabel.classList.add("drag-over"); // Adds CSS drag-over highlight class styling to drop zone element
            });
        });

        ["dragleave", "drop"].forEach((eventName) => { // Loops through drag events indicating leaving drop zone or dropping item
            dropLabel.addEventListener(eventName, (e) => {
                e.preventDefault(); // Prevents default browser behavior
                e.stopPropagation(); // Stops event propagation bubbling upward
                dropLabel.classList.remove("drag-over"); // Removes CSS drag-over highlight class styling from drop zone element
            });
        });

        dropLabel.addEventListener("drop", (e) => { // Listens for file drop event on target drop zone container
            const dt = e.dataTransfer; // Extracts data transfer object containing dropped files list
            const files = dt.files; // Extracts files list array from data transfer object

            if (files.length > 0) { // Checks if at least one file item was dropped successfully by user
                fileInput.files = files; // Assigns dropped files list to the hidden file input element
                updateFileName(); // Triggers function to update file name text display label string on screen
            }
        });
    }
});

/**
 * Updates the file name display text label string when an image is selected for movie frame identification.
 */
function updateFileName() {
    const input = document.getElementById("imageInput"); // Locates hidden file upload input element in DOM
    const label = document.getElementById("fileNameDisplay"); // Locates file name display text label element in DOM
    if (input && input.files.length > 0) { // Checks if file input element contains a selected file item object
        label.textContent = "📷 " + input.files[0].name; // Updates text label string content with camera icon and uploaded filename string
    }
}

/**
 * Resets the movie search input text field and upload drop zone back to default initial state variables.
 */
function resetSearch() {
    if (quoteInterval) clearInterval(quoteInterval); // Clears active loading quote cycling interval timer if running in background

    const fileInput = document.getElementById("imageInput"); // Locates hidden file input element in DOM
    if (fileInput) fileInput.value = ""; // Clears selected file value string from input element

    const fileNameDisplay = document.getElementById("fileNameDisplay"); // Locates filename display element
    const resultContainer = document.getElementById("resultContainer"); // Locates result container element
    const statusContainer = document.getElementById("statusContainer"); // Locates status container element
    const uploadSection = document.getElementById("uploadSection"); // Locates upload section container element

    if (fileNameDisplay) fileNameDisplay.textContent = "🍿 Snap/Upload/Drag Mystery Screenshot Here"; // Restores default drop zone prompt label text string
    if (resultContainer) resultContainer.innerHTML = ""; // Clears search results container HTML content string safely
    if (statusContainer) statusContainer.innerHTML = ""; // Clears status container HTML content string safely
    if (uploadSection) uploadSection.style.display = "block"; // Restores visibility block of upload section container block element
}

// ==========================================
// 9. SCREENSHOT IDENTIFICATION UPLOAD HANDLER
// ==========================================
/**
 * Asynchronously uploads a mystery movie screenshot file to the backend API endpoint for instant frame identification.
 */
async function uploadImage() {
    const fileInput = document.getElementById("imageInput"); // Locates file upload input element in DOM
    const loadingModal = document.getElementById("loadingModal"); // Locates loading progress modal popup container element in DOM
    const modalBody = document.getElementById("modalBody"); // Locates modal body content container element in DOM

    if (!fileInput || !fileInput.files[0]) { // Validates that a valid file has been selected or dropped into input
        showSuccessModal("Please Select Or Snap An Image First!"); // Displays warning message inside custom styled modal window
        return; // Exits function execution flow early
    }

    if (loadingModal && modalBody) { // Checks if modal popup container elements successfully exist in DOM structure
        modalBody.innerHTML = `
            <div class="spinner"></div><br>
            <h3>Analyzing Your Screenshot...</h3>
            <p id="loadingQuotes">${loadingQuotes[0]}</p>
        `; // Renders loading spinner and first humorous quote string inside modal body container element
        loadingModal.style.display = "flex"; // Displays loading modal popup overlay container with flex centering layout
    }

    let quoteIndex = 0; // Initializes tracking index integer for cycling through loading quotes array
    quoteInterval = setInterval(() => { // Sets interval timer to cycle loading quotes array strings every 1.5 seconds
        quoteIndex = (quoteIndex + 1) % loadingQuotes.length; // Increments quote index circularly using modulo operator
        const quoteSpan = document.getElementById("loadingQuotes"); // Locates quote text span element in DOM
        if (quoteSpan) {
            quoteSpan.textContent = loadingQuotes[quoteIndex]; // Updates text content with next loading quote string from array
        }
    }, 1500);

    const formData = new FormData(); // Initializes a new FormData container instance for multipart file upload payload transmission
    formData.append("file", fileInput.files[0]); // Appends selected screenshot image file object to form data payload under file key

    try {
        const response = await fetch(`${API_BASE_URL}/identify`, {
            method: "POST",
            body: formData,
        }); // Sends screenshot image POST request payload to live FastAPI identify endpoint URL

        const data = await response.json(); // Parses response body stream into a JSON object literal
        
        clearInterval(quoteInterval); // Clears active loading quote interval timer once response arrives from server

        if (data.success) { // Checks if identification pipeline successfully identified movie frame payload
            const posterHtml = data.poster_url
                ? `<img src="${data.poster_url}" class="poster" alt="Movie Poster">`
                : ""; // Generates image HTML tag string if poster URL property exists in response data

            let streamingDisplay = data.streaming; // Extracts streaming platforms availability text string from response
            if (!streamingDisplay || streamingDisplay.toLowerCase() === "Not Currently Streaming" || streamingDisplay.toLowerCase() === "none" || streamingDisplay.trim() === "") {
                streamingDisplay = "Available on Prime Video, Apple TV+, & Fandango at Home"; // Sets default streaming platform fallback text string
            }

            if (modalBody) { // Checks if modal body element exists in DOM structure
                modalBody.innerHTML = `
                    <div class="result-card">
                        ${posterHtml}
                        <div class="movie-title">${data.title}</div>
                        <div class="release-date">Released: ${data.release_date || "N/A"}</div>
                        
                        <div class="info-label">🍅 Rotten Tomatoes Score: <span>${data.rotten_tomatoes || "N/A"}</span></div>

                        <div class="info-label">Overview</div>
                        <div class="info-text">${data.overview}</div>
                        
                        <div class="info-label">Actors/Actresses</div>
                        <div class="info-text">${data.actors}</div>
                        
                        <div class="info-label">Streaming On</div>
                        <div class="info-text">${streamingDisplay}</div>
                    </div>
                    <button class="btn-primary" onclick="searchAnotherFromModal()">Search Another Movie</button>
                `; // Renders identified movie title, poster, ratings, overview, actors, and streaming options inside modal body
            }
        } else {
            if (modalBody) { // Checks if modal body element exists in DOM structure
                modalBody.innerHTML = `
                    <h3>❌ No Match Found</h3>
                    <p>${data.message || "We Couldn't Identify This Movie Frame. Try Another Screenshot!"}</p>
                    <button class="btn-primary" onclick="searchAnotherFromModal()">Try Again</button>
                `; // Renders error notice card when AI model fails to identify screenshot frame successfully
            }
        }
    } catch (err) {
        clearInterval(quoteInterval); // Clears loading quote interval timer on connection error exception caught
        if (modalBody) {
            modalBody.innerHTML = `
                <h3>❌ Connection Error</h3>
                <p>Error connecting to live FastAPI server.</p>
                <button class="btn-primary" onclick="searchAnotherFromModal()">Close</button>
            `; // Renders connection error failure message card inside modal body container element
        }
    }
}

/**
 * Closes the active loading modal pop-up window overlay and resets search input states.
 */
function closeModal() {
    if (quoteInterval) clearInterval(quoteInterval); // Clears active loading quote interval timer if running in background
    const loadingModal = document.getElementById("loadingModal"); // Locates loading modal popup overlay element in DOM
    if (loadingModal) {
        loadingModal.style.display = "none"; // Hides modal popup container element by setting display style property to none
    }
    resetSearch(); // Resets search upload inputs and states back to default initial values
}

/**
 * Closes the modal popup window and resets inputs to allow user to perform another movie frame search.
 */
function searchAnotherFromModal() {
    closeModal(); // Invokes closeModal function to clear and close modal popup window overlay container
}

// ==========================================
// 10. POPULAR TV SHOWS PAGE LOGIC
// ==========================================
/**
 * Asynchronously fetches popular TV shows list from backend API endpoint, capping result limit at 50 items.
 */
async function loadTvShowsPage() {
    const feed = document.getElementById("tvShowsFeed"); // Locates TV shows feed grid container element in DOM
    if (!feed) return; // Exits function safely if feed container element is missing from current page

    try {
        const res = await fetch(`${API_BASE_URL}/api/tv-shows`); // Sends HTTP GET request to live popular TV shows endpoint URL
        const data = await res.json(); // Parses response body stream into a JSON object literal

        if (data.success && data.tv_shows && data.tv_shows.length > 0) { // Validates that popular shows array was returned successfully by backend
            allFetchedTvShows = data.tv_shows.slice(0, 50); // Stores array in master memory variable, capped at 50 items max
            displayTvShows(allFetchedTvShows); // Triggers function to render show cards into grid feed container element
        } else {
            feed.textContent = "No TV Shows Found."; // Displays empty feed notification text string placeholder
        }
    } catch (err) {
        feed.textContent = "Unable To Load TV Shows."; // Displays error failure text string on fetch exception failure
    }
}

/**
 * Renders TV show cards into the feed grid container with quick action buttons and modal click handlers.
 * @param {Array} shows - Array of TV show data objects to render into the grid
 */
function displayTvShows(shows) {
    const feed = document.getElementById("tvShowsFeed"); // Locates TV shows feed grid container element in DOM
    if (!feed) return; // Exits function safely if feed container element is missing

    if (shows.length === 0) { // Checks if filtered shows array length equals zero
        feed.innerHTML = `<div>No Matching TV Shows Found.</div>`; // Renders empty search results message card across grid columns
        return; // Exits function execution flow early
    }

    feed.innerHTML = shows.map((item) => `
        <div class="news-card" onclick="openTvModal(event, ${JSON.stringify(item).replace(/"/g, '&quot;')})">
            <div>
                ${item.poster ? `<img src="${item.poster}" alt="Poster">` : ""}
                <h4>${item.title}</h4>
                <p>${item.release_date || ""}</p>
            </div>
            <div onclick="event.stopPropagation()">
                <button onclick='quickAddFavorite(${JSON.stringify(item).replace(/'/g, "&#39;")})' class="btn-primary" title="Add to Favorites">⭐ Fav</button>
                <button onclick='quickLogRating(${JSON.stringify(item.title).replace(/'/g, "&#39;")})' class="btn-primary" title="Quick Rate">📝 Rate</button>
            </div>
        </div>
    `).join(""); // Maps each TV show object into an HTML card element string with favorite and rating action buttons
}

/**
 * Quickly saves a selected TV show object to the user's browser local storage favorites list array.
 * @param {Object} show - The TV show data object to add to favorites
 */
function quickAddFavorite(show) {
    const savedFavs = JSON.parse(localStorage.getItem("scenescout_favorites") || "[]"); // Retrieves existing favorite items array from local storage cache
    const exists = savedFavs.some(fav => fav.title === show.title); // Checks if show title is already saved in favorites list array
    
    if (!exists) { // Checks if show is not already present in favorites list
        savedFavs.push({ title: show.title, type: "TV Show", poster: show.poster || "" }); // Appends new show favorite object to array
        localStorage.setItem("scenescout_favorites", JSON.stringify(savedFavs)); // Saves updated favorites array back to local storage cache
        showSuccessModal(`⭐ "${show.title}" Added To Your My Profile Favorite TV Shows!`); // Displays success confirmation inside custom modal window
    } else {
        showSuccessModal(`"${show.title}" Is Already In Your Favorites.`); // Displays warning notice inside custom modal window
    }
}

// Global variables to track active star rating modal state parameters
let currentRatingTargetTitle = ""; // Stores target show title string for active rating operation
let selectedStarCount = 5; // Stores integer count of selected rating stars, defaulting to 5 stars

/**
 * Opens the interactive star rating modal window for a specific TV show title string.
 * @param {string} title - The title string of the TV show being rated by user
 */
function quickLogRating(title) {
    currentRatingTargetTitle = title; // Assigns target show title string to global memory variable
    selectedStarCount = 5; // Resets star selection count integer back to default 5 stars
    
    const titleElem = document.getElementById("ratingModalTitle"); // Locates rating modal title element in DOM
    if (titleElem) titleElem.textContent = `Rate "${title}"`; // Updates modal heading text string with show title string
    
    const reviewInput = document.getElementById("ratingReviewInput"); // Locates optional review textarea input element in DOM
    if (reviewInput) reviewInput.value = ""; // Clears review text area input value string to empty
    
    updateStarDisplay(5); // Updates star visual display to highlight all 5 stars by default
    
    const modal = document.getElementById("ratingModal"); // Locates rating modal overlay container element in DOM
    if (modal) modal.style.display = "flex"; // Displays rating modal popup overlay with flex centering layout
}

/**
 * Sets the active star rating count integer when a user clicks an individual star icon element.
 * @param {number} count - Number of stars selected by user (integer between 1 through 5)
 */
function setRating(count) {
    selectedStarCount = count; // Updates selected star count integer memory variable state
    updateStarDisplay(count); // Triggers function to refresh star colors based on new count integer
}

/**
 * Updates the visual color state of the interactive star rating symbols.
 * @param {number} count - Number of active highlighted gold stars to display
 */
function updateStarDisplay(count) {
    const starContainer = document.getElementById("starContainer"); // Locates star icons container element in DOM
    if (!starContainer) return; // Exits function safely if container element is missing
    
    const stars = starContainer.getElementsByTagName("span"); // Extracts HTML collection of individual star span elements
    for (let i = 0; i < stars.length; i++) { // Loops through each star span element in collection
        if (i < count) {
            stars[i].style.color = "#fbbf24"; // Sets active highlighted gold color style property for stars up to selected count
        } else {
            stars[i].style.color = "#475569"; // Sets muted gray inactive color style property for unselected stars beyond count
        }
    }
}

/**
 * Saves or discards the user rating log entry based on whether Save or Cancel button was clicked.
 * @param {boolean} isExplicitSave - True if Save button clicked, false if Cancel button clicked
 */
function saveRatingModal(isExplicitSave) {
    if (!isExplicitSave) { // If user clicked Cancel button, close modal without saving to profile logbook
        closeRatingModal(); // Invokes function to close modal popup window without making changes
        return; // Exits function execution flow early
    }

    const reviewInput = document.getElementById("ratingReviewInput"); // Locates review textarea input element in DOM
    const reviewText = reviewInput ? reviewInput.value.trim() : ""; // Extracts and trims review comment text string safely
    
    let starsString = ""; // Initializes empty star symbols string accumulator
    for (let i = 0; i < 5; i++) {
        starsString += (i < selectedStarCount) ? "★" : "☆"; // Appends filled or hollow star character symbol based on selected count
    }
    
    const savedRatings = JSON.parse(localStorage.getItem("scenescout_ratings") || "[]"); // Retrieves existing ratings logs array from local storage cache
    savedRatings.unshift({ 
        title: currentRatingTargetTitle, 
        stars: starsString, 
        review: reviewText || "Great Series!" 
    }); // Prepends new rating log object to beginning of array
    localStorage.setItem("scenescout_ratings", JSON.stringify(savedRatings)); // Saves updated ratings logs array back to local storage cache
    
    closeRatingModal(); // Closes rating modal popup window after successful save operation completes
    showSuccessModal(`📊 Rating Saved to My Profile Logbook!`); // Displays success confirmation inside custom modal window
}

/**
 * Closes the star rating modal pop-up window overlay container.
 */
function closeRatingModal() {
    const modal = document.getElementById("ratingModal"); // Locates rating modal overlay container element in DOM
    if (modal) modal.style.display = "none"; // Hides rating modal container element by setting display style property to none
}

/**
 * Opens a detailed modal pop-up window overlay showing expanded TV show metadata information.
 * @param {Event} event - Native browser click event object
 * @param {Object} show - TV show data object containing full show details
 */
function openTvModal(event, show) {
    const modal = document.getElementById("tvModal"); // Locates TV show details modal overlay container element in DOM
    const modalBody = document.getElementById("tvModalBody"); // Locates modal body container element in DOM
    if (!modal || !modalBody) return; // Exits execution safely if modal elements are missing from page structure

    const posterHtml = show.poster ? `<img src="${show.poster}" class="poster" alt="Show Poster">` : ""; // Generates image poster HTML tag string if poster exists
    
    modalBody.innerHTML = `
        <div class="result-card">
            ${posterHtml}
            <div class="movie-title">${show.title}</div>
            <div class="release-date">Released: ${show.release_date || "N/A"}</div>
            
            <div class="info-label">📺 Seasons & Episodes</div>
            <div class="info-text">${show.seasons_episodes || "Seasons information available upon broadcast."}</div>

            <div class="info-label">📖 Overview</div>
            <div class="info-text">${show.overview || show.description || "A captivating television series exploring dynamic character arcs and thrilling plotlines."}</div>
            
            <div class="info-label">📡 Network</div>
            <div class="info-text">${show.network || "Original Network Broadcast"}</div>
            
            <div class="info-label">💻 Streaming On</div>
            <div class="info-text">${show.streaming || "Available on Prime Video, Apple TV+, & Netflix"}</div>
        </div>
    `; // Renders comprehensive TV show metadata details card inside modal body container element
    modal.style.display = "flex"; // Displays TV details modal overlay container with flex centering layout
}

/**
 * Closes the TV show details modal pop-up window overlay container.
 */
function closeTvModal() {
    const modal = document.getElementById("tvModal"); // Locates TV show details modal overlay container element in DOM
    if (modal) {
        modal.style.display = "none"; // Hides TV details modal container element by setting display style property to none
    }
}

// ==========================================
// 11. GLOBAL TV SHOW SEARCH (BUTTON & ENTER KEY)
// ==========================================
/**
 * Adds native event listeners to the TV show search input field to trigger global TVmaze searches
 * and render search results directly inside the search modal container column.
 */
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("tvSearchInput"); // Locates the TV show search text input element in the DOM
    if (searchInput) { // Checks if the search input element successfully exists in the DOM structure
        searchInput.addEventListener("keypress", async (e) => { // Listens for native keyboard keypress events on the search input
            if (e.key === "Enter") { // Checks if the pressed key string equals Enter key
                e.preventDefault(); // Prevents default browser form submission behavior
                await performTvSearch(); // Triggers the inline search function asynchronously
            }
        });
    }
});

/**
 * Triggers the TVmaze search query from the input text field and renders results inline on the page.
 */
async function performTvSearch() {
    const searchInput = document.getElementById("tvSearchInput"); // Locates the TV show search text input element in DOM
    if (!searchInput) return; // Exits function early if search input element is missing

    const query = searchInput.value.trim(); // Extracts and trims the search query text string value safely
    if (!query) {
        showSuccessModal("Please Enter a TV Show Title to Search."); // Displays warning inside custom modal window if input is empty
        return; // Exits execution flow early
    }

    await fetchGlobalTvShowFromTVmaze(query); // Calls function to fetch and display inline search results asynchronously
}

/**
 * Converts military or 24-hour time strings (e.g., "20:00" or "20:00:00") into standard 12-hour AM/PM format strings.
 * @param {string} timeStr - The input time string to format
 * @returns {string} - Formatted standard time string including AM/PM suffix
 */
function formatAirTime(timeStr) {
    if (!timeStr) return ""; // Returns empty string if input time string is falsy
    let cleanTime = timeStr.trim(); // Trims whitespace from input time string
    
    const parts = cleanTime.split(":"); // Splits time string by colon separator into parts array
    if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10); // Parses hours part into integer value
        let minutes = parts[1]; // Extracts minutes part string
        if (!isNaN(hours)) {
            let ampm = hours >= 12 ? "PM" : "AM"; // Determines AM or PM suffix based on hour magnitude
            hours = hours % 12; // Converts 24-hour format to 12-hour format
            hours = hours ? hours : 12; // Handles hour '0' to become '12'
            return `${hours}:${minutes} ${ampm}`; // Returns formatted standard time string with AM/PM
        }
    }
    return cleanTime; // Returns original clean time string if parsing fails
}

/**
 * Asynchronously fetches TV shows globally from the backend TVmaze search endpoint and renders them in the search modal window with full details.
 * @param {string} query - The show title search string typed by the user
 */
async function fetchGlobalTvShowFromTVmaze(query) {
    const searchModal = document.getElementById("tvSearchModal"); // Locates search results modal container overlay element in DOM
    const resultsFeed = document.getElementById("tvSearchResultsFeed"); // Locates search results feed container inside modal element

    if (!searchModal || !resultsFeed) return; // Exits function safely if modal containers are missing from DOM

    searchModal.style.display = "flex"; // Displays the search results modal window overlay container with flex
    resultsFeed.innerHTML = "<div style='color: #94a3b8; text-align: center; padding: 15px;'>Searching TVmaze...</div>"; // Renders searching status placeholder string

    try {
        const response = await fetch(`${API_BASE_URL}/api/tv-search?query=${encodeURIComponent(query)}`); // Sends GET request to live backend TVmaze search route URL
        const data = await response.json(); // Parses response body stream into a JSON object literal

        if (data.success && data.show) { // Checks if the backend successfully found the matching show object
            const show = data.show; // Extracts show object from response data
            const posterHtml = show.poster ? `<img src="${show.poster}" alt="Poster">` : ""; // Generates poster image HTML string if poster exists
            
            let seasonsEpisodesInfo = show.seasons_episodes || "Seasons information available upon broadcast."; // Sets seasons info fallback
            let networkName = show.network || "Original Network Broadcast"; // Sets network name fallback string
            let airtimeFormatted = ""; // Initializes airtime formatted string accumulator
            if (show.air_time) {
                airtimeFormatted = ` Airs ${show.air_days ? show.air_days.join(", ") : ""} at ${formatAirTime(show.air_time)}`.trim(); // Formats air days and time string
            }
            let networkAirtimeDisplay = `${networkName}${airtimeFormatted}`; // Combines network name and airtime strings

            let streamingDisplay = show.streaming; // Extracts streaming platforms availability text string
            if (!streamingDisplay || streamingDisplay.toLowerCase() === "not currently streaming" || streamingDisplay.toLowerCase() === "none" || streamingDisplay.trim() === "" || streamingDisplay.includes("Check JustWatch")) {
                if (networkName.toLowerCase().includes("abc")) {
                    streamingDisplay = "Airs on ABC, Available on Hulu the next day"; // Sets network-specific streaming platform text
                } else {
                    streamingDisplay = "Available on Prime Video, Apple TV+, & Netflix"; // Sets default streaming platform fallback text string
                }
            }

            resultsFeed.innerHTML = `
                <div class="news-card">
                    ${posterHtml}
                    <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 4px; text-align: center;">${show.title}</div>
                    <div style="font-size: 0.8rem; margin-bottom: 10px; text-align: center;">Released: ${show.release_date || "N/A"}</div>
                    
                    <div style="font-size: 0.85rem; font-weight: bold; margin-top: 6px;">📺 Seasons & Episodes</div>
                    <div style="font-size: 0.85rem; margin-bottom: 8px;">${seasonsEpisodesInfo}</div>

                    <div style="font-size: 0.85rem; font-weight: bold; margin-top: 4px;">📖 Overview</div>
                    <div style="font-size: 0.85rem; margin-bottom: 8px; line-height: 1.3;">${show.overview || show.description || "A captivating television series."}</div>
                    
                    <div style="font-size: 0.85rem; font-weight: bold; margin-top: 4px;">📡 Network / Airtime</div>
                    <div style="font-size: 0.85rem; margin-bottom: 8px;">${networkAirtimeDisplay}</div>
                    
                    <div style="font-size: 0.85rem; font-weight: bold; margin-top: 4px;">💻 Streaming On</div>
                    <div style="font-size: 0.85rem; margin-bottom: 12px;">${streamingDisplay}</div>

                    <div style="display: flex; gap: 6px; width: 100%; justify-content: center;" onclick="event.stopPropagation()">
                        <button onclick='quickAddFavorite(${JSON.stringify(show).replace(/'/g, "&#39;")})' class="btn-primary" style="font-size: 0.8rem; padding: 8px; margin-bottom: 0;" title="Add to Favorites">⭐ Fav</button>
                        <button onclick='quickLogRating(${JSON.stringify(show.title).replace(/'/g, "&#39;")})' class="btn-primary" style="font-size: 0.8rem; padding: 8px; margin-bottom: 0;" title="Quick Rate">📝 Rate</button>
                    </div>
                </div>
            `; // Renders full fetched TV show details card inside results feed container element
        } else {
            resultsFeed.innerHTML = `<div style="text-align: center; color: #ff4d4d; padding: 15px; font-size: 0.9rem;">No Matching TV Shows Found For "${query}".</div>`; // Displays error notice card if no show match found
        }
    } catch (err) {
        console.error("TVmaze global search error:", err); // Logs search exception error object to console for debugging
        resultsFeed.innerHTML = `<div style="text-align: center; color: #ff4d4d; padding: 15px; font-size: 0.9rem;">Error connecting to server during search.</div>`; // Displays connection failure notice string inside feed container
    }
}

// ==========================================
// 12. PROFILE PAGE DYNAMIC DATA & STORAGE LOGIC
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const savedUsername = localStorage.getItem("scenescout_username"); // Retrieves saved username string from local storage cache
    const savedAvatar = localStorage.getItem("scenescout_avatar"); // Retrieves saved avatar string from local storage cache

    if (savedUsername) { // Checks if saved username string exists in local storage cache
        const navUserElem = document.getElementById("navUsername"); // Locates top nav username element in DOM
        if (navUserElem) navUserElem.textContent = savedUsername; // Sets username text string content
        const hubUserElem = document.getElementById("hubUsernameDisplay"); // Locates hub username element in DOM
        if (hubUserElem) hubUserElem.textContent = savedUsername; // Sets hub username text string content
    }

    if (savedAvatar) { // Checks if saved avatar string exists in local storage cache
        updateAvatarDisplay(savedAvatar); // Updates avatar display graphics across UI elements
        const hubAvatar = document.getElementById("hubAvatarPreview"); // Locates hub avatar preview box element in DOM
        if (hubAvatar) {
            if (savedAvatar.startsWith("data:") || savedAvatar.includes(".")) {
                hubAvatar.innerHTML = `<img src="${savedAvatar}" class="hub-avatar-img">`; // Renders custom image inside hub avatar preview
            } else {
                hubAvatar.innerHTML = savedAvatar; // Renders emoji string inside hub avatar preview
            }
        }
    }

    const savedBio = localStorage.getItem("scenescout_bio"); // Retrieves saved biographical text string from local storage cache
    const bioDisplay = document.getElementById("hubUserBioDisplay"); // Locates bio display text element in DOM
    const bioInput = document.getElementById("profileBioInput"); // Locates bio text input element in DOM

    if (savedBio && savedBio.trim() !== "") { // Checks if saved biographical text string is not empty
        if (bioDisplay) {
            bioDisplay.textContent = `"${savedBio}"`; // Updates bio display text content string
            bioDisplay.style.display = "block"; // Displays bio container element block on screen
        }
        if (bioInput) bioInput.value = ""; // Clears bio input text field value string
    }

    loadSavedProfileData(); // Triggers function to load and render all saved user profile lists and logbook items
});

/**
 * Saves user biographical text string into browser local storage cache and updates display elements.
 */
function saveBio() {
    const bioInput = document.getElementById("profileBioInput"); // Locates bio input textarea element in DOM
    const bioDisplay = document.getElementById("hubUserBioDisplay"); // Locates bio display container element in DOM
    
    if (bioInput && bioInput.value.trim() !== "") { // Checks if bio input field contains valid non-empty text string
        const bioText = bioInput.value.trim(); // Extracts and trims biographical text string value
        localStorage.setItem("scenescout_bio", bioText); // Saves biographical text string inside local storage cache
        
        if (bioDisplay) {
            bioDisplay.textContent = `"${bioText}"`; // Updates bio display element text content string
            bioDisplay.style.display = "block"; // Displays bio display element block on screen
        }
        bioInput.value = ""; // Clears bio input text field value string to empty
    }
}

/**
 * Loads and renders all saved user profile lists (favorites, recommendations, genre tags, friends, and rated logbook items) from local storage.
 */
function loadSavedProfileData() {
    const savedFavs = JSON.parse(localStorage.getItem("scenescout_favorites") || "[]"); // Retrieves saved favorites items array from local storage cache
    const moviesGrid = document.getElementById("favoriteMoviesGrid"); // Locates favorite movies grid container element in DOM
    const tvGrid = document.getElementById("favoriteTvShowsGrid"); // Locates favorite TV shows grid container element in DOM
    
    if (!moviesGrid || !tvGrid) return; // Exits function safely if profile grid elements are missing from page

    moviesGrid.innerHTML = ""; // Clears favorite movies grid HTML content string safely
    tvGrid.innerHTML = ""; // Clears favorite TV shows grid HTML content string safely

    let hasMovies = false; // Tracks whether any movie favorites exist in list
    let hasTv = false; // Tracks whether any TV show favorites exist in list

    savedFavs.forEach((item, index) => { // Loops through each favorite item object in array with index integer
        const card = document.createElement("div"); // Creates a new div element for favorite card item
        card.className = "news-card profile-card-relative"; // Assigns card container CSS class names
        card.innerHTML = `
            <button onclick="deleteFavorite(${index})" class="card-delete-btn" title="Delete">✕</button>
            ${item.poster ? `<img src="${item.poster}" alt="Poster" class="card-poster-img">` : `<div class="card-fallback-icon">${item.type === 'Movie' ? '🎬' : '📺'}</div>`}
            <div class="card-title-text">${item.title}</div>
        `; // Renders favorite card HTML markup string containing delete button, poster image or icon, and title text

        if (item.type === "Movie") {
            hasMovies = true; // Sets movie favorites existence tracking flag to true
            moviesGrid.appendChild(card); // Appends favorite movie card element to movies grid container
        } else if (item.type === "TV Show") {
            hasTv = true; // Sets TV favorites existence tracking flag to true
            tvGrid.appendChild(card); // Appends favorite TV show card element to TV shows grid container
        }
    });

    if (!hasMovies) { // Checks if no movie favorites were added yet
        moviesGrid.innerHTML = `<div class="empty-list-notice">No Movies Added Yet.</div>`; // Renders empty notice message card string
    }
    if (!hasTv) { // Checks if no TV show favorites were added yet
        tvGrid.innerHTML = `<div class="empty-list-notice">No TV shows Added Yet.</div>`; // Renders empty notice message card string
    }

    const savedRecs = JSON.parse(localStorage.getItem("scenescout_recommendations") || "[]"); // Retrieves saved recommendations array from local storage cache
    const recMoviesGrid = document.getElementById("recommendedMoviesGrid"); // Locates recommended movies grid container element in DOM
    const recTvGrid = document.getElementById("recommendedTvShowsGrid"); // Locates recommended TV shows grid container element in DOM

    if (recMoviesGrid && recTvGrid) { // Checks if recommendation grid container elements exist in DOM structure
        recMoviesGrid.innerHTML = ""; // Clears recommended movies grid HTML content string safely
        recTvGrid.innerHTML = ""; // Clears recommended TV shows grid HTML content string safely

        let hasRecMovies = false; // Tracks whether any movie recommendations exist in list
        let hasRecTv = false; // Tracks whether any TV recommendations exist in list

        savedRecs.forEach((item, index) => { // Loops through each recommendation item object in array with index integer
            const card = document.createElement("div"); // Creates a new div element for recommendation card item
            card.className = "news-card profile-card-relative"; // Assigns card container CSS class names
            card.innerHTML = `
                <button onclick="deleteRecommendation(${index})" class="card-delete-btn" title="Delete">✕</button>
                ${item.poster ? `<img src="${item.poster}" alt="Poster" class="card-poster-img">` : `<div class="card-fallback-icon">${item.type === 'Movie' ? '🎬' : '📺'}</div>`}
                <div class="card-title-text">${item.title}</div>
            `; // Renders recommendation card HTML markup string

            if (item.type === "Movie") {
                hasRecMovies = true; // Sets movie recommendations existence tracking flag to true
                recMoviesGrid.appendChild(card); // Appends recommended movie card element to movies grid container
            } else if (item.type === "TV Show") {
                hasRecTv = true; // Sets TV recommendations existence tracking flag to true
                recTvGrid.appendChild(card); // Appends recommended TV card element to TV grid container
            }
        });

        if (!hasRecMovies) { // Checks if no movie recommendations were added yet
            recMoviesGrid.innerHTML = `<div class="empty-list-notice">No movie recommendations added yet.</div>`; // Renders empty notice message card string
        }
        if (!hasRecTv) { // Checks if no TV recommendations were added yet
            recTvGrid.innerHTML = `<div class="empty-list-notice">No TV show recommendations added yet.</div>`; // Renders empty notice message card string
        }
    }

    const savedGenres = JSON.parse(localStorage.getItem("scenescout_genres") || "[]"); // Retrieves saved genre tags array from local storage cache
    const genreContainer = document.getElementById("genreTagsContainer"); // Locates genre tags container element in DOM
    if (genreContainer) { // Checks if genre container element exists in DOM structure
        genreContainer.innerHTML = ""; // Clears genre tags container HTML content string safely
        savedGenres.forEach((genre, index) => { // Loops through each saved genre tag string with index integer
            const tag = document.createElement("span"); // Creates a new span element for genre tag badge
            tag.className = "genre-tag-badge"; // Assigns tag badge CSS class name string
            tag.innerHTML = `${genre} <span onclick="deleteGenre(${index})" class="genre-delete-x" title="Delete">✕</span>`; // Renders genre text string and deletion cross span element inside tag badge
            genreContainer.appendChild(tag); // Appends genre tag badge element to container
        });
    }

    const savedFriends = JSON.parse(localStorage.getItem("scenescout_friends") || "[]"); // Retrieves saved friends array from local storage cache
    const friendContainer = document.getElementById("friendsListContainer"); // Locates friends list container element in DOM
    if (friendContainer) { // Checks if friends container element exists in DOM structure
        if (savedFriends.length > 0) { // Checks if saved friends array contains items
            friendContainer.innerHTML = ""; // Clears friends list container HTML content string safely
            savedFriends.forEach((friend, index) => { // Loops through each friend name string with index integer
                const friendItem = document.createElement("div"); // Creates a new div element for friend list row item
                friendItem.className = "friend-item-row"; // Assigns friend item row CSS class name string
                friendItem.innerHTML = `<span>👤 ${friend}</span> <span class="friend-badge-group"><span class="friend-status-text">Following ✓</span><span onclick="deleteFriend(${index})" class="friend-delete-x" title="Delete">✕</span></span>`; // Renders friend username string and follow badge elements inside row
                friendContainer.appendChild(friendItem); // Appends friend item row element to container
            });
        } else {
            friendContainer.innerHTML = `No Friends Added Yet! Time to Recruit Some Movie Buddies! 🍿`; // Displays empty notice text string placeholder
        }
    }

    const savedRatings = JSON.parse(localStorage.getItem("scenescout_ratings") || "[]"); // Retrieves saved ratings logs array from local storage cache
    const logContainer = document.getElementById("ratedLogContainer"); // Locates rated logbook container element in DOM
    if (logContainer) { // Checks if log container element exists in DOM structure
        if (savedRatings.length > 0) { // Checks if saved ratings array contains items
            logContainer.innerHTML = ""; // Clears rated log container HTML content string safely
            savedRatings.forEach((r, index) => { // Loops through each rating log object with index integer
                const ratingCard = document.createElement("div"); // Creates a new div element for rating log card item
                ratingCard.className = "rated-log-card profile-card-relative"; // Assigns rating card CSS class names
                ratingCard.innerHTML = `
                    <button onclick="deleteRating(${index})" class="card-delete-btn" title="Delete">✕</button>
                    <div class="rated-card-title">${r.title}</div>
                    <div class="rated-card-stars">${r.stars}</div>
                    ${r.review ? `<div class="rated-card-review">"${r.review}"</div>` : ""}
                `; // Renders rating card HTML markup string containing delete button, title string, star symbols, and review text
                logContainer.appendChild(ratingCard); // Appends rating log card element to container
            });
        } else {
            logContainer.innerHTML = `<div id="emptyLogMessage" class="empty-log-notice">No ratings logged yet. Start rating above! 🍿</div>`; // Displays empty notice text string placeholder
        }
    }
}

/**
 * Deletes a favorite item object from local storage favorites array based on array index integer.
 * @param {number} index - Index integer of favorite item to delete
 */
function deleteFavorite(index) {
    let savedFavs = JSON.parse(localStorage.getItem("scenescout_favorites") || "[]"); // Retrieves existing favorites array
    savedFavs.splice(index, 1); // Removes 1 item element at specified index integer using splice method
    localStorage.setItem("scenescout_favorites", JSON.stringify(savedFavs)); // Saves updated favorites array back to local storage cache
    loadSavedProfileData(); // Reloads and re-renders profile data lists on screen
}

/**
 * Deletes a recommendation item object from local storage recommendations array based on array index integer.
 * @param {number} index - Index integer of recommendation item to delete
 */
function deleteRecommendation(index) {
    let savedRecs = JSON.parse(localStorage.getItem("scenescout_recommendations") || "[]"); // Retrieves existing recommendations array
    savedRecs.splice(index, 1); // Removes 1 item element at specified index integer using splice method
    localStorage.setItem("scenescout_recommendations", JSON.stringify(savedRecs)); // Saves updated recommendations array back to local storage cache
    loadSavedProfileData(); // Reloads and re-renders profile data lists on screen
}

/**
 * Deletes a genre tag string from local storage genre tags array based on array index integer.
 * @param {number} index - Index integer of genre tag string to delete
 */
function deleteGenre(index) {
    let savedGenres = JSON.parse(localStorage.getItem("scenescout_genres") || "[]"); // Retrieves existing genre tags array
    savedGenres.splice(index, 1); // Removes 1 item element at specified index integer using splice method
    localStorage.setItem("scenescout_genres", JSON.stringify(savedGenres)); // Saves updated genre tags array back to local storage cache
    loadSavedProfileData(); // Reloads and re-renders profile data lists on screen
}

/**
 * Deletes a friend username string from local storage friends array based on array index integer.
 * @param {number} index - Index integer of friend username string to delete
 */
function deleteFriend(index) {
    let savedFriends = JSON.parse(localStorage.getItem("scenescout_friends") || "[]"); // Retrieves existing friends array
    savedFriends.splice(index, 1); // Removes 1 item element at specified index integer using splice method
    localStorage.setItem("scenescout_friends", JSON.stringify(savedFriends)); // Saves updated friends array back to local storage cache
    loadSavedProfileData(); // Reloads and re-renders profile data lists on screen
}

/**
 * Deletes a rating log object from local storage ratings array based on array index integer.
 * @param {number} index - Index integer of rating log object to delete
 */
function deleteRating(index) {
    let savedRatings = JSON.parse(localStorage.getItem("scenescout_ratings") || "[]"); // Retrieves existing ratings array
    savedRatings.splice(index, 1); // Removes 1 item element at specified index integer using splice method
    localStorage.setItem("scenescout_ratings", JSON.stringify(savedRatings)); // Saves updated ratings array back to local storage cache
    loadSavedProfileData(); // Reloads and re-renders profile data lists on screen
}

/**
 * Adds a new custom favorite movie or TV show title to the user's profile favorites list.
 */
function addFavoriteTitle() {
    const input = document.getElementById("favTitleInput"); // Locates favorite title text input element in DOM
    const type = document.getElementById("favTypeSelect").value; // Locates favorite type select element value string
    const fileInput = document.getElementById("favPosterFileInput"); // Locates custom poster file input element in DOM
    const title = input.value.trim(); // Extracts and trims favorite title text string value safely
    if (!title) return; // Exits function early if title string value is empty

    if (fileInput.files && fileInput.files[0]) { // Checks if custom poster file object was selected by user
        const reader = new FileReader(); // Initializes a new FileReader instance
        reader.onload = function(e) {
            saveFavoriteItem(title, type, e.target.result); // Saves favorite item with base64 poster data URL string after reading
        };
        reader.readAsDataURL(fileInput.files[0]); // Reads uploaded poster file as base64 data URL string
    } else {
        saveFavoriteItem(title, type, ""); // Saves favorite item without custom poster image string if no file selected
    }
}

/**
 * Helper function to push and save a favorite item object into local storage favorites array cache.
 * @param {string} title - Title text string of favorite item
 * @param {string} type - Media type string ("Movie" or "TV Show")
 * @param {string} posterUrl - Poster image URL or base64 string data
 */
function saveFavoriteItem(title, type, posterUrl) {
    const newItem = { title: title, type: type, poster: posterUrl }; // Creates new favorite item object literal structure
    const savedFavs = JSON.parse(localStorage.getItem("scenescout_favorites") || "[]"); // Retrieves existing favorites array from local storage cache
    savedFavs.push(newItem); // Appends new favorite item object to array
    localStorage.setItem("scenescout_favorites", JSON.stringify(savedFavs)); // Saves updated favorites array back to local storage cache

    document.getElementById("favTitleInput").value = ""; // Resets favorite title text input value string to empty
    document.getElementById("favPosterFileInput").value = ""; // Resets custom poster file input value
    document.getElementById("favPosterFileName").textContent = "Upload Custom Poster/Scene 📁"; // Restores file upload label text string
    loadSavedProfileData(); // Reloads and re-renders profile data lists on screen
}

/**
 * Adds a new custom recommendation title to the user's profile recommendations list.
 */
function addRecommendation() {
    const input = document.getElementById("recommendationInput"); // Locates recommendation title text input element in DOM
    const type = document.getElementById("recommendationTypeSelect").value; // Locates recommendation type select element value string
    const fileInput = document.getElementById("recommendationPosterFileInput"); // Locates custom poster file input element in DOM
    const title = input.value.trim(); // Extracts and trims recommendation title text string value safely
    if (!title) return; // Exits function early if title string value is empty

    if (fileInput.files && fileInput.files[0]) { // Checks if custom poster file object was selected by user
        const reader = new FileReader(); // Initializes a new FileReader instance
        reader.onload = function(e) {
            saveRecommendationItem(title, type, e.target.result); // Saves recommendation item with base64 poster data URL string after reading
        };
        reader.readAsDataURL(fileInput.files[0]); // Reads uploaded poster file as base64 data URL string
    } else {
        saveRecommendationItem(title, type, ""); // Saves recommendation item without custom poster image string if no file selected
    }
}

/**
 * Helper function to push and save a recommendation item object into local storage recommendations array cache.
 * @param {string} title - Title text string of recommendation item
 * @param {string} type - Media type string ("Movie" or "TV Show")
 * @param {string} posterUrl - Poster image URL or base64 string data
 */
function saveRecommendationItem(title, type, posterUrl) {
    const newRec = { title: title, type: type, poster: posterUrl }; // Creates new recommendation item object literal structure
    const savedRecs = JSON.parse(localStorage.getItem("scenescout_recommendations") || "[]"); // Retrieves existing recommendations array from local storage cache
    savedRecs.push(newRec); // Appends new recommendation item object to array
    localStorage.setItem("scenescout_recommendations", JSON.stringify(savedRecs)); // Saves updated recommendations array back to local storage cache

    document.getElementById("recommendationInput").value = ""; // Resets recommendation title text input value string to empty
    document.getElementById("recommendationPosterFileInput").value = ""; // Resets custom poster file input value
    document.getElementById("recPosterFileName").textContent = "Upload Custom Poster/Scene 📁"; // Restores file upload label text string
    loadSavedProfileData(); // Reloads and re-renders profile data lists on screen
}

/**
 * Adds a selected genre tag string into the user's profile genre tags array list in local storage cache.
 */
function addGenre() {
    const select = document.getElementById("genreSelect"); // Locates genre select dropdown element in DOM
    const genre = select.value; // Extracts selected genre string value

    const savedGenres = JSON.parse(localStorage.getItem("scenescout_genres") || "[]"); // Retrieves existing genre tags array from local storage cache
    if (!savedGenres.includes(genre)) { // Checks if genre string is not already present in array
        savedGenres.push(genre); // Appends new genre string to array
        localStorage.setItem("scenescout_genres", JSON.stringify(savedGenres)); // Saves updated genre tags array back to local storage cache
    }

    loadSavedProfileData(); // Reloads and re-renders profile data lists on screen
}

/**
 * Adds a new friend username string into the user's profile friends list array in local storage cache.
 */
function addFriend() {
    const input = document.getElementById("friendSearchInput"); // Locates friend search text input element in DOM
    if (!input.value.trim()) return; // Exits function early if input value string is empty

    const friendName = input.value.trim(); // Extracts and trims friend username string value safely
    const savedFriends = JSON.parse(localStorage.getItem("scenescout_friends") || "[]"); // Retrieves existing friends array from local storage cache
    if (!savedFriends.includes(friendName)) { // Checks if friend username string is not already present in array
        savedFriends.push(friendName); // Appends new friend username string to array
        localStorage.setItem("scenescout_friends", JSON.stringify(savedFriends)); // Saves updated friends array back to local storage cache
    }

    input.value = ""; // Resets friend search input text value string to empty
    loadSavedProfileData(); // Reloads and re-renders profile data lists on screen
}

/**
 * Submits and logs a new personal rating entry object from the profile page form into local storage ratings array.
 */
function submitPersonalRating() {
    const title = document.getElementById("rateTitleInput").value.trim(); // Locates and extracts rating title input value string
    const stars = document.getElementById("starRatingSelect").value; // Locates and extracts star selection value string
    const review = document.getElementById("ratingReviewInput").value.trim(); // Locates and extracts review textarea value string

    if (!title) { // Checks if title input string value is empty
        showSuccessModal("Please enter a movie or TV show title to rate!"); // Displays warning inside custom modal window
        return; // Exits execution flow early
    }

    const newRating = { title, stars, review }; // Creates new rating object literal structure
    const savedRatings = JSON.parse(localStorage.getItem("scenescout_ratings") || "[]"); // Retrieves existing ratings array from local storage cache
    savedRatings.unshift(newRating); // Prepends new rating object to beginning of array
    localStorage.setItem("scenescout_ratings", JSON.stringify(savedRatings)); // Saves updated ratings array back to local storage cache

    document.getElementById("rateTitleInput").value = ""; // Resets rate title input value string to empty
    document.getElementById("ratingReviewInput").value = ""; // Resets rating review input value string to empty
    
    loadSavedProfileData(); // Reloads and re-renders profile data lists on screen
}

// ==========================================
// 13. TV SHOWS PAGE INITIALIZATION & SEARCH
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const tvFeedElem = document.getElementById("tvShowsFeed"); // Locates TV shows feed grid container element in DOM
    if (!tvFeedElem) return; // Exits execution early if TV shows feed element does not exist on page

    const savedUsername = localStorage.getItem("scenescout_username"); // Retrieves saved username string from local storage cache
    const savedAvatar = localStorage.getItem("scenescout_avatar"); // Retrieves saved avatar string from local storage cache

    if (savedUsername) { // Checks if saved username string exists in local storage cache
        const navUserElem = document.getElementById("navUsername"); // Locates top navigation username text span element in DOM
        if (navUserElem) navUserElem.textContent = savedUsername; // Sets top navigation username text label string content
    }

    if (savedAvatar) { // Checks if saved avatar string exists in local storage cache
        updateAvatarDisplay(savedAvatar); // Updates UI avatar graphics containers with saved value string
    }

    if (typeof loadTvShowsPage === 'function') {
        loadTvShowsPage(); // Triggers function to load popular TV shows page content feed asynchronously
    }

    if (typeof performTvSearch === 'function' && !window._wrappedSearch) {
        const originalSearch = performTvSearch; // Stores reference to original search function
        window.originalPerformTvSearch = originalSearch; // Attaches original search function reference to global window object
        window._wrappedSearch = true; // Sets wrapping state tracking flag boolean to true
        
        window.performTvSearch = function() {
            const input = document.getElementById("tvSearchInput"); // Locates TV show search input element in DOM
            if (!input || !input.value.trim()) return; // Exits early if input is missing or empty string
            
            originalSearch(); // Invokes original search function implementation
            const searchModal = document.getElementById("tvStatusModal") || document.getElementById("tvSearchModal"); // Locates search modal container element in DOM
            if (searchModal) searchModal.style.display = "flex"; // Displays search results modal window container element with flex layout
        };
    }
}); 

/**
 * Closes the TV show search results modal pop-up window overlay container element.
 */
function closeTvSearchModal() {
    const searchModal = document.getElementById("tvSearchModal"); // Locates search modal overlay container element in DOM
    if (searchModal) searchModal.style.display = "none"; // Hides search modal container element by setting display style property to none
}

// ==========================================
// 14. ACCOUNT SETTINGS PAGE INITIALIZATION & MODAL HELPERS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const profilePageElem = document.getElementById("profilePage"); // Locates profile page container element in account.html DOM
    if (!profilePageElem) return; // Exits execution early if not running on account.html settings page

    const activeUsername = localStorage.getItem("scenescout_username") || "Beau15"; // Retrieves active username string from local storage cache or fallback

    const navUsernameEl = document.getElementById("navUsername"); // Locates navigation username element in DOM
    const hamburgerUsernameEl = document.getElementById("hamburgerUsername"); // Locates hamburger menu username element in DOM
    const displayUsernameEl = document.getElementById("displayUsername"); // Locates main display username heading element in DOM

    if (navUsernameEl) navUsernameEl.textContent = activeUsername; // Sets top nav username text label string content
    if (hamburgerUsernameEl) hamburgerUsernameEl.textContent = activeUsername; // Sets hamburger menu username text label string content
    if (displayUsernameEl) displayUsernameEl.textContent = activeUsername; // Sets main display username heading text string content

    if (typeof fetchAndPopulateProfile === 'function') {
        fetchAndPopulateProfile(); // Triggers function to fetch and populate active user profile settings details asynchronously
    }
});

/**
 * Displays the custom centered modal popup window overlay with a specified success or status message string.
 * @param {string} message - The notification message text string to display inside the modal content card
 */
function showSuccessModal(message) {
    const modal = document.getElementById("successModal"); // Locates custom success modal overlay container element in DOM
    const msgElem = document.getElementById("successModalMessage"); // Locates success modal message paragraph text element in DOM
    if (msgElem && message) {
        msgElem.textContent = message; // Updates modal paragraph text content string with custom message passed to function
    }
    if (modal) {
        modal.style.display = "flex"; // Displays custom success modal overlay container element with flex centering layout
    }
}

/**
 * Closes the custom success modal popup window overlay container element.
 */
function closeSuccessModal() {
    const modal = document.getElementById("successModal"); // Locates custom success modal overlay container element in DOM
    if (modal) {
        modal.style.display = "none"; // Hides custom success modal container element by setting display style property to none
    }
}