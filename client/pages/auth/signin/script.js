// 1. Select the form element
const loginForm = document.querySelector(".actual-form");

// 2. Listen for the 'submit' event
loginForm.addEventListener("submit", function(event) {
    // Stop the page from refreshing
    event.preventDefault();

    // 3. Get the values from the inputs
    const email = document.querySelector('input[type="email"]').value;
    const password = document.querySelector('input[type="password"]').value;

    // 4. Simple Validation
    if (email === "" || password === "") {
        alert("Please fill in both email and password.");
        return;
    }

    // 5. Simulate Login (In a real app, you'd send this to a database)
    console.log("Attempting login with:", email);
    
    // For your testing:
    if (email === "test@example.com" && password === "password123") {
        alert("Success! Redirecting to Dashboard...");
        // window.location.href = "dashboard.html"; // Uncomment when dashboard is ready
    } else {
        alert("Login failed. Check your credentials.");
    }
});
