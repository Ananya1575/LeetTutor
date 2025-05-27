function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    
    // Save the user's preference
    const isDarkMode = document.body.classList.contains('dark-mode');
    try {
        if (isDarkMode) {
            localStorage?.setItem('darkMode', 'enabled');
        } else {
            localStorage?.setItem('darkMode', 'disabled');
        }
    } catch (e) {
        console.warn('localStorage not available:', e.message);
    }
}

// Load the user's preference on page load
document.addEventListener('DOMContentLoaded', function() {
    try {
        const darkMode = localStorage?.getItem('darkMode');
        if (darkMode === 'enabled') {
            document.body.classList.add('dark-mode');
        }
    } catch (e) {
        console.warn('localStorage not available:', e.message);
    }

    // Add focus animations to inputs
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'translateX(5px)';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'translateX(0)';
        });
    });
});

// Form validation and submission
document.getElementById('signup-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!username) {
        alert('Username is required');
        return;
    }
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }
    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }

    try {
        const response = await fetch(`${window.location.origin}/api/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            alert('Sign-up successful! Redirecting to chat...');
            window.location.href = 'chat.html';
        } else {
            alert(data.message || 'Sign-up failed. Please try again.');
        }
    } catch (error) {
        console.error('Signup error:', error.message, error.stack);
        alert('Failed to connect to server. Please try again later.');
    }
});