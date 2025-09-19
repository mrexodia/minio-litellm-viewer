let currentBuckets = [];
let currentFiles = [];
let currentFileContent = '';
let currentView = 'buckets'; // 'buckets' or 'files'
let selectedBucket = '';
let selectedFile = ''; // Track currently selected file

// Cache for better performance
let bucketsCache = null;
let filesCache = new Map(); // Map of bucketName -> files array
let fileContentCache = new Map(); // Map of filename -> content

// Load initial view on page load
document.addEventListener('DOMContentLoaded', () => {
    // Handle initial route from URL hash
    handleRouteChange();

    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', handleRouteChange);
});

// Handle URL routing based on hash
function handleRouteChange() {
    const hash = window.location.hash.slice(1); // Remove the #

    if (!hash) {
        // No hash, load buckets view
        loadBuckets();
        return;
    }

    const parts = hash.split('/');

    if (parts.length === 1) {
        // Format: #bucket-name
        const bucketName = decodeURIComponent(parts[0]);
        loadFiles(bucketName);
    } else if (parts.length === 2) {
        // Format: #bucket-name/file-name
        const bucketName = decodeURIComponent(parts[0]);
        const fileName = decodeURIComponent(parts[1]);

        // First load the bucket, then the file
        loadFiles(bucketName).then(() => {
            // Wait a bit for the files to render, then load the specific file
            setTimeout(() => {
                const fullFileName = `${bucketName}/${fileName}`;
                loadFileByPath(fullFileName);
            }, 100);
        });
    } else {
        // Invalid hash, load buckets
        loadBuckets();
    }
}

// Load file by full path (for routing)
async function loadFileByPath(fullFileName) {
    try {
        // Find the file in current files list
        const file = currentFiles.find(f => f.name === fullFileName);
        if (!file) {
            console.error('File not found:', fullFileName);
            return;
        }

        // Update selected file tracking
        selectedFile = fullFileName;

        // Update URL hash
        const bucketName = fullFileName.split('/')[0];
        const fileName = fullFileName.split('/').slice(1).join('/');
        const expectedHash = `#${encodeURIComponent(bucketName)}/${encodeURIComponent(fileName)}`;
        if (window.location.hash !== expectedHash) {
            window.history.replaceState(null, null, expectedHash);
        }

        // Update active file in sidebar
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active');
        });

        // Find and activate the correct file item
        const fileItems = document.querySelectorAll('.file-item');
        fileItems.forEach(item => {
            const fileName = item.onclick.toString().match(/'([^']+)'/)?.[1];
            if (decodeURIComponent(fileName || '') === fullFileName) {
                item.classList.add('active');
            }
        });

        // Check cache first
        const encodedFileName = encodeURIComponent(fullFileName);
        if (fileContentCache.has(encodedFileName)) {
            currentFileContent = fileContentCache.get(encodedFileName);
        } else {
            const response = await fetch(`/api/file/${encodedFileName}`);
            const data = await response.json();
            currentFileContent = data.content;
            fileContentCache.set(encodedFileName, currentFileContent);
        }

        const displayName = fullFileName.split('/').pop();
        document.getElementById('currentFile').textContent = displayName;

        // Update file info
        if (file) {
            document.getElementById('fileSize').textContent = formatFileSize(file.size);
            document.getElementById('fileDate').textContent = new Date(file.lastModified).toLocaleString('en-GB', { hour12: false });
        }

        displayContent(currentFileContent);
    } catch (error) {
        console.error('Error loading file by path:', error);
        document.getElementById('logContent').innerHTML = '<div class="placeholder">Error loading file</div>';
    }
}

async function loadBuckets() {
    try {
        // Check cache first
        if (bucketsCache) {
            currentBuckets = bucketsCache;
        } else {
            const response = await fetch('/api/buckets');
            currentBuckets = await response.json();
            bucketsCache = currentBuckets; // Cache the result
        }

        currentView = 'buckets';
        selectedBucket = '';
        selectedFile = '';

        // Update URL hash
        window.history.replaceState(null, null, '#');

        document.getElementById('sidebarTitle').textContent = 'Date Buckets';
        document.getElementById('backBtn').style.display = 'none';

        renderBuckets();
    } catch (error) {
        console.error('Error loading buckets:', error);
        document.getElementById('itemList').innerHTML = '<div class="loading">Error loading date buckets</div>';
    }
}

function renderBuckets() {
    const itemList = document.getElementById('itemList');

    if (currentBuckets.length === 0) {
        itemList.innerHTML = '<div class="loading">No date buckets found</div>';
        return;
    }

    itemList.innerHTML = currentBuckets.map(bucket => `
        <div class="bucket-item" onclick="navigateToFiles('${bucket}')">
            <div class="bucket-name">${bucket}</div>
        </div>
    `).join('');
}

async function loadFiles(bucketName, preserveSelection = false) {
    try {
        const previousSelectedFile = selectedFile;
        const logContent = document.getElementById('logContent');
        const previousScrollTop = logContent.scrollTop;
        const previousScrollLeft = logContent.scrollLeft;

        selectedBucket = bucketName;

        // Check cache first
        if (filesCache.has(bucketName)) {
            currentFiles = filesCache.get(bucketName);
        } else {
            const response = await fetch(`/api/files/${encodeURIComponent(bucketName)}`);
            currentFiles = await response.json();
            filesCache.set(bucketName, currentFiles); // Cache the result
        }

        currentView = 'files';

        // Update URL hash only if not preserving selection (i.e., not during auto-refresh)
        if (!preserveSelection) {
            window.history.replaceState(null, null, `#${encodeURIComponent(bucketName)}`);
        }

        document.getElementById('sidebarTitle').textContent = `Files in ${bucketName}`;
        document.getElementById('backBtn').style.display = 'inline-block';

        renderFiles();

        if (!preserveSelection) {
            // Clear main content only if not preserving selection
            selectedFile = '';
            document.getElementById('currentFile').textContent = 'Select a JSON file to view';
            document.getElementById('fileSize').textContent = '';
            document.getElementById('fileDate').textContent = '';
            document.getElementById('logContent').innerHTML = '<div class="placeholder">Select a JSON file from the left to view its contents</div>';
        } else if (previousSelectedFile && currentFiles.some(f => f.name === previousSelectedFile)) {
            // Restore the previously selected file if it still exists
            setTimeout(() => {
                // Find and highlight the previously selected file
                const fileItems = document.querySelectorAll('.file-item');
                fileItems.forEach(item => {
                    const fileName = item.onclick.toString().match(/'([^']+)'/)?.[1];
                    if (decodeURIComponent(fileName || '') === previousSelectedFile) {
                        item.classList.add('active');
                    }
                });

                // Restore scroll position
                logContent.scrollTop = previousScrollTop;
                logContent.scrollLeft = previousScrollLeft;
            }, 0);
        }

    } catch (error) {
        console.error('Error loading files:', error);
        document.getElementById('itemList').innerHTML = '<div class="loading">Error loading files</div>';
    }
}

function renderFiles() {
    const itemList = document.getElementById('itemList');

    if (currentFiles.length === 0) {
        itemList.innerHTML = '<div class="loading">No JSON files found in this date bucket</div>';
        return;
    }

    itemList.innerHTML = currentFiles.map(file => `
        <div class="file-item" onclick="navigateToFile('${encodeURIComponent(file.name)}')">
            <div class="file-name">${file.displayName}</div>
            <div class="file-meta">
                <span>${formatFileSize(file.size)}</span>
                <span>${new Date(file.lastModified).toLocaleTimeString('en-GB', { hour12: false })}</span>
            </div>
        </div>
    `).join('');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function loadFile(filename) {
    try {
        // Update active file in sidebar
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.closest('.file-item').classList.add('active');

        // Track the selected file
        selectedFile = decodeURIComponent(filename);

        // Update URL hash only if not already set correctly
        const bucketName = selectedFile.split('/')[0];
        const fileName = selectedFile.split('/').slice(1).join('/');
        const expectedHash = `#${encodeURIComponent(bucketName)}/${encodeURIComponent(fileName)}`;
        if (window.location.hash !== expectedHash) {
            window.history.replaceState(null, null, expectedHash);
        }

        // Check cache first
        if (fileContentCache.has(filename)) {
            currentFileContent = fileContentCache.get(filename);
        } else {
            const response = await fetch(`/api/file/${filename}`);
            const data = await response.json();
            currentFileContent = data.content;
            fileContentCache.set(filename, currentFileContent); // Cache the result
        }

        const displayName = decodeURIComponent(filename).split('/').pop();
        document.getElementById('currentFile').textContent = displayName;

        // Update file info
        const file = currentFiles.find(f => f.name === decodeURIComponent(filename));
        if (file) {
            document.getElementById('fileSize').textContent = formatFileSize(file.size);
            document.getElementById('fileDate').textContent = new Date(file.lastModified).toLocaleString('en-GB', { hour12: false });
        }

        displayContent(currentFileContent);
    } catch (error) {
        console.error('Error loading file:', error);
        document.getElementById('logContent').innerHTML = '<div class="placeholder">Error loading file</div>';
    }
}

function displayContent(content) {
    const logContent = document.getElementById('logContent');

    if (!content.trim()) {
        logContent.innerHTML = '<div class="placeholder">File is empty</div>';
        return;
    }

    // Try to parse and pretty print JSON
    try {
        const jsonData = JSON.parse(content);
        const prettyJson = JSON.stringify(jsonData, null, 2);
        logContent.innerHTML = `<pre>${escapeHtml(prettyJson)}</pre>`;
    } catch (e) {
        // If not valid JSON, display as plain text
        logContent.innerHTML = `<pre>${escapeHtml(content)}</pre>`;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function goBack() {
    if (currentView === 'files') {
        selectedFile = ''; // Clear selected file when going back
        loadBuckets();
    }
}

// Navigation wrapper functions for URL hash management
function navigateToFiles(bucketName) {
    window.location.hash = `#${encodeURIComponent(bucketName)}`;
}

function navigateToFile(filename) {
    const bucketName = decodeURIComponent(filename).split('/')[0];
    const fileName = decodeURIComponent(filename).split('/').slice(1).join('/');
    window.location.hash = `#${encodeURIComponent(bucketName)}/${encodeURIComponent(fileName)}`;
}

// Auto-refresh every 30 seconds
setInterval(() => {
    if (currentView === 'buckets') {
        loadBuckets();
    } else if (currentView === 'files' && selectedBucket) {
        // Preserve selection and scroll position during refresh
        loadFiles(selectedBucket, true);
    }
}, 30000);