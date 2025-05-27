document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in to access the chat');
        window.location.href = '/login.html';
        return;
    }

    // Get DOM elements
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    const chatHistory = document.getElementById('chat-history');
    const newChatButton = document.getElementById('new-chat');
    const profileButton = document.getElementById('profile-button');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const logoutButton = document.getElementById('logout');
    const deleteChatsButton = document.getElementById('delete-chats');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    // Check if all elements exist
    if (!chatForm || !userInput || !chatMessages || !chatHistory || !newChatButton ||
        !profileButton || !dropdownMenu || !logoutButton || !deleteChatsButton || !darkModeToggle) {
        console.error('One or more DOM elements not found');
        alert('Error loading the chat interface. Please refresh the page.');
        return;
    }

    let currentChatId = null;

    // Configure marked
    marked.setOptions({
        breaks: true,
        gfm: true
    });

    // Dark mode functionality
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        try {
            localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
            console.log(`Dark mode ${isDarkMode ? 'enabled' : 'disabled'}`);
        } catch (e) {
            console.warn('localStorage not available:', e.message);
        }
    }

    // Load dark mode preference
    try {
        if (localStorage.getItem('darkMode') === 'enabled') {
            document.body.classList.add('dark-mode');
        }
    } catch (e) {
        console.warn('localStorage not available:', e.message);
    }

    // Dark mode toggle event
    darkModeToggle.addEventListener('click', toggleDarkMode);

    // Profile dropdown functionality
    profileButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('active');
        console.log('Profile dropdown toggled');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!profileButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('active');
            console.log('Dropdown closed');
        }
    });

    // Logout
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            try {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
                console.log('User logged out');
            } catch (e) {
                console.warn('localStorage not available:', e.message);
            }
        }
    });

    // Delete all chats
    deleteChatsButton.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to delete all chats? This action cannot be undone.')) {
            try {
                const response = await fetch(`${window.location.origin}/api/chats`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    chatHistory.innerHTML = '';
                    chatMessages.innerHTML = '';
                    currentChatId = null;
                    showEmptyState();
                    alert('All chats deleted');
                    console.log('All chats deleted successfully');
                } else {
                    const data = await response.json();
                    alert(data.message || 'Failed to delete chats');
                    console.error('Delete all chats failed:', data);
                }
            } catch (error) {
                alert('Failed to delete chats. Please try again.');
                console.error('Error deleting all chats:', error.message, error.stack);
            }
        }
    });

    // Load chat history
    async function loadChatHistory() {
        try {
            const response = await fetch(`${window.location.origin}/api/chats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            const chats = await response.json();
            chatHistory.innerHTML = '';
            chats.forEach((chat, index) => {
                const li = document.createElement('li');
                li.className = 'chat-history-item';
                li.dataset.chatId = chat._id;
                if (chat._id === currentChatId) {
                    li.classList.add('active');
                }
                const preview = chat.messages.length > 0
                    ? chat.messages[0].content.substring(0, 50) + '...'
                    : 'No messages yet';
                li.innerHTML = `
                    <div class="chat-item-header">
                        <span class="chat-item-title">${chat.title}</span>
                        <button class="delete-chat-btn" data-chat-id="${chat._id}">×</button>
                    </div>
                    <div class="chat-item-date">${formatDate(new Date(chat.createdAt))}</div>
                    <div class="chat-item-preview">${preview}</div>
                `;
                li.addEventListener('click', () => loadChat(chat._id));
                li.style.animationDelay = `${index * 0.1}s`;
                chatHistory.appendChild(li);
            });
            document.querySelectorAll('.delete-chat-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteChat(btn.dataset.chatId);
                });
            });
            console.log('Chat history loaded:', chats.length, 'chats');
        } catch (error) {
            alert('Failed to load chat history. Please try again.');
            console.error('Error loading chat history:', error.message, error.stack);
        }
    }

    // Delete individual chat
    async function deleteChat(chatId) {
        if (confirm('Are you sure you want to delete this chat?')) {
            try {
                const response = await fetch(`${window.location.origin}/api/chats/${chatId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    if (currentChatId === chatId) {
                        currentChatId = null;
                        chatMessages.innerHTML = '';
                        showEmptyState();
                    }
                    loadChatHistory();
                    console.log(`Chat ${chatId} deleted`);
                } else {
                    const data = await response.json();
                    alert(data.message || 'Failed to delete chat');
                    console.error('Delete chat failed:', data);
                }
            } catch (error) {
                alert('Failed to delete chat. Please try again.');
                console.error('Error deleting chat:', error.message, error.stack);
            }
        }
    }

    // Load a specific chat
    async function loadChat(chatId) {
        currentChatId = chatId;
        try {
            const response = await fetch(`${window.location.origin}/api/chats/${chatId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            const chat = await response.json();
            chatMessages.innerHTML = '';
            if (chat.messages.length === 0) {
                showEmptyState();
            } else {
                displayMessages(chat.messages);
            }
            loadChatHistory();
            console.log(`Chat ${chatId} loaded`);
        } catch (error) {
            alert('Failed to load chat. Please try again.');
            console.error('Error loading chat:', error.message, error.stack);
        }
    }

    // Display messages
    function displayMessages(messages) {
        chatMessages.innerHTML = '';
        messages.forEach((msg, index) => {
            const div = document.createElement('div');
            div.className = `message ${msg.role}`;
            div.style.animationDelay = `${index * 0.1}s`;
            const content = msg.role === 'ai' ? marked.parse(msg.content) : msg.content;
            div.innerHTML = `
                <div class="message-bubble">${content}</div>
                <div class="message-time">${formatTime(new Date())}</div>
            `;
            chatMessages.appendChild(div);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Show empty state
    function showEmptyState() {
        chatMessages.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <h3>Start a New Conversation</h3>
                <p>Ask me about any LeetCode problem and I'll help you understand the logic, provide pseudocode, and guide you through the solution!</p>
            </div>
        `;
    }

    // Start a new chat
    newChatButton.addEventListener('click', () => {
        currentChatId = null;
        chatMessages.innerHTML = '';
        userInput.value = '';
        showEmptyState();
        console.log('New chat started');
    });

    // Submit chat message
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prompt = userInput.value.trim();
        if (!prompt) return;

        // Display user message
        const userDiv = document.createElement('div');
        userDiv.className = 'message user';
        userDiv.innerHTML = `
            <div class="message-bubble">${prompt}</div>
            <div class="message-time">${formatTime(new Date())}</div>
        `;
        chatMessages.appendChild(userDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        userInput.value = '';

        try {
            console.log('Sending message with chatId:', currentChatId);
            const response = await fetch(`${window.location.origin}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ prompt, chatId: currentChatId })
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            const data = await response.json();
            const aiDiv = document.createElement('div');
            aiDiv.className = 'message ai';
            aiDiv.innerHTML = `
                <div class="message-bubble">${marked.parse(data.response)}</div>
                <div class="message-time">${formatTime(new Date())}</div>
            `;
            chatMessages.appendChild(aiDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            currentChatId = data.chatId;
            loadChatHistory();
            console.log('AI response received:', data.response);
        } catch (error) {
            alert('Failed to communicate with AI. Please try again.');
            console.error('Error sending message:', error.message, error.stack);
        }
    });

    // Utility functions
    function formatDate(date) {
        return date.toLocaleDateString();
    }

    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Auto-resize textarea
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    // Initialize
    showEmptyState();
    loadChatHistory();
    console.log('Chat interface initialized');
});