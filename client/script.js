function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    
    // Save the user's preference
    const isDarkMode = document.body.classList.contains('dark-mode');
    if (isDarkMode) {
        localStorage.setItem('darkMode', 'enabled');
    } else {
        localStorage.setItem('darkMode', 'disabled');
    }
}

// Load the user's preference on page load
document.addEventListener('DOMContentLoaded', function() {
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'enabled') {
        document.body.classList.add('dark-mode');
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});