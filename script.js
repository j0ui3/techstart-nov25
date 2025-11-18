// Configuration
const REPO_OWNER = 'aremis9'; // Update this with your GitHub username
const REPO_NAME = 'techstart-nov25';
const MESSAGES_FOLDER = 'messages';
const BRANCH = 'main';

// GitHub API endpoint to get repository contents (only for listing directory)
const GITHUB_API_BASE = 'https://api.github.com/repos';
// Raw GitHub URL for direct file access (no API rate limits)
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

/**
 * Fetch all JSON files from the messages folder using GitHub API
 */
async function fetchMessages() {
    const loadingEl = document.getElementById('loading');
    const containerEl = document.getElementById('messagesContainer');
    
    loadingEl.classList.add('show');
    containerEl.innerHTML = '';

    // Get JSON files in /messages (local, static) for testing
    const messageFiles = [
        "messages/example.json",
        "messages/techstart-team.json"
    ];

    // use messageFiles to fetch the messages
    const messages = [];
    for (let i = 0; i < messageFiles.length; i++) {
        const req = new XMLHttpRequest();
        req.open('GET', messageFiles[i], false); // synchronous request
        req.send(null);
        if (req.status === 200) {
            messages.push(JSON.parse(req.responseText));
        }
    }
    
    displayMessages(messages, containerEl);
    loadingEl.classList.remove('show');

    return;

    


    try {
        // Fetch the contents of the messages folder
        const folderUrl = `${GITHUB_API_BASE}/${REPO_OWNER}/${REPO_NAME}/contents/${MESSAGES_FOLDER}?ref=${BRANCH}`;
        const folderResponse = await fetch(folderUrl);
        
        if (!folderResponse.ok) {
            if (folderResponse.status === 404) {
                throw new Error('Repository not found. Please check that the repository name and owner are correct.');
            } else if (folderResponse.status === 403) {
                throw new Error('Access denied. Make sure the repository is public.');
            }
            throw new Error(`Failed to fetch messages folder: ${folderResponse.status}`);
        }

        const folderData = await folderResponse.json();
        
        // Filter for JSON files only
        const jsonFiles = folderData.filter(file => 
            file.type === 'file' && file.name.endsWith('.json')
        );

        if (jsonFiles.length === 0) {
            showEmptyState(containerEl);
            loadingEl.classList.remove('show');
            return;
        }

        // Fetch and parse each JSON file using raw GitHub URLs (no API rate limits)
        const messages = await Promise.all(
            jsonFiles.map(async (file) => {
                try {
                    // Use raw GitHub URL instead of API download_url
                    const rawUrl = `${GITHUB_RAW_BASE}/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${MESSAGES_FOLDER}/${file.name}`;
                    const fileResponse = await fetch(rawUrl);
                    if (!fileResponse.ok) {
                        console.warn(`Failed to fetch ${file.name}`);
                        return null;
                    }
                    const messageData = await fileResponse.json();
                    return {
                        ...messageData,
                        filename: file.name,
                        lastModified: file.name // We'll use filename as identifier
                    };
                } catch (error) {
                    console.warn(`Error parsing ${file.name}:`, error);
                    return null;
                }
            })
        );

        // Filter out null values and sort by timestamp if available
        const validMessages = messages.filter(msg => msg !== null);
        
        // Sort messages (newest first if timestamp exists, otherwise by filename)
        validMessages.sort((a, b) => {
            if (a.timestamp && b.timestamp) {
                return new Date(b.timestamp) - new Date(a.timestamp);
            }
            return a.filename.localeCompare(b.filename);
        });

        displayMessages(validMessages, containerEl);
        loadingEl.classList.remove('show');

    } catch (error) {
        console.error('Error fetching messages:', error);
        showErrorState(containerEl, error.message);
        loadingEl.classList.remove('show');
    }
}

/**
 * Display messages in the container
 */
function displayMessages(messages, containerEl) {
    if (messages.length === 0) {
        showEmptyState(containerEl);
        return;
    }

    containerEl.innerHTML = messages.map(message => createMessageCard(message)).join('');
}

/**
 * Create HTML for a message card
 */
function createMessageCard(message) {
    const author = message.author || message.name || 'Anonymous';
    const content = message.message || message.content || message.text || 'No message provided';
    const timestamp = message.timestamp ? formatDate(message.timestamp) : '';

    return `
        <div class="message-card">
            <div class="message-content">${escapeHtml(content)}</div>
            <div class="message-footer">
                <span>${escapeHtml(author)}</span>
            </div>
        </div>
    `;
}

/**
 * Show empty state when no messages are found
 */
function showEmptyState(containerEl) {
    containerEl.innerHTML = `
        <div class="empty-state">
            <h2>No messages yet!</h2>
            <p>Be the first to contribute by adding your message file to the messages folder.</p>
        </div>
    `;
}

/**
 * Show error state when something goes wrong
 */
function showErrorState(containerEl, errorMessage) {
    containerEl.innerHTML = `
        <div class="error-state">
            <h2>⚠️ Error loading messages</h2>
            <p>${escapeHtml(errorMessage)}</p>
            <p style="margin-top: 10px;">Make sure the repository is public and the GitHub username is correctly configured.</p>
        </div>
    `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format date to readable string
 */
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchMessages();
    
    // Optional: Refresh messages every 5 minutes
    setInterval(fetchMessages, 5 * 60 * 1000);
});

