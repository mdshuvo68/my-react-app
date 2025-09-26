import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

class QRBarcodeGenerator {
    constructor() {
        this.currentUser = null;
        this.currentCode = null;
        this.savedItems = [];
        this.users = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSavedItems();
        this.loadUsers();
        this.checkAuthState();
    }

    bindEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', this.handleLogin.bind(this));
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', this.handleLogout.bind(this));
        
        // Profile
        document.getElementById('profileBtn').addEventListener('click', this.showProfile.bind(this));
        document.getElementById('updateUsernameBtn').addEventListener('click', this.updateUsername.bind(this));
        
        // Create account
        document.getElementById('createAccountBtn').addEventListener('click', this.showCreateAccountModal.bind(this));
        document.getElementById('createAccountForm').addEventListener('submit', this.handleCreateAccount.bind(this));
        document.getElementById('closeModal').addEventListener('click', this.hideCreateAccountModal.bind(this));
        document.getElementById('cancelCreate').addEventListener('click', this.hideCreateAccountModal.bind(this));
        
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', this.handleTabSwitch.bind(this));
        });
        
        // Generator controls
        document.getElementById('generateBtn').addEventListener('click', this.generateCode.bind(this));
        document.getElementById('saveBtn').addEventListener('click', this.saveCode.bind(this));
        document.getElementById('downloadBtn').addEventListener('click', this.downloadCode.bind(this));
        
        // Search
        document.getElementById('searchInput').addEventListener('input', this.handleSearch.bind(this));
        
        // Auto-update filename based on text input
        document.getElementById('textInput').addEventListener('input', this.updateFileName.bind(this));
        
        // Code type change
        document.querySelectorAll('input[name="codeType"]').forEach(radio => {
            radio.addEventListener('change', this.handleCodeTypeChange.bind(this));
        });
    }

    checkAuthState() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showMainScreen();
        } else {
            this.showLoginScreen();
        }
    }

    handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Check against stored users or demo account
        const user = this.users.find(u => u.username === username && u.password === password);
        const isDemoAccount = username === 'admin' && password === 'password';
        
        if (user || isDemoAccount) {
            this.currentUser = { 
                username, 
                loginTime: new Date().toISOString(),
                createdAt: user ? user.createdAt : new Date().toISOString()
            };
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.showMainScreen();
            this.showNotification('success', 'Login Successful', `Welcome back, ${username}!`);
        } else {
            this.showNotification('error', 'Login Failed', 'Invalid username or password');
        }
    }

    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.showLoginScreen();
        this.showNotification('info', 'Logged Out', 'You have been logged out successfully');
    }

    showLoginScreen() {
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('mainScreen').classList.remove('active');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }

    showMainScreen() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('mainScreen').classList.add('active');
        document.getElementById('welcomeMessage').textContent = `Welcome, ${this.currentUser.username}`;
        this.displaySavedItems();
        this.updateProfileStats();
    }

    showProfile() {
        // Switch to profile tab
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.tab-btn[data-tab="profile"]').classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById('profileTab').classList.add('active');
        
        // Update profile form
        document.getElementById('currentUsername').value = this.currentUser.username;
        document.getElementById('newUsername').value = '';
        document.getElementById('confirmPassword').value = '';
        
        this.updateProfileStats();
    }

    updateProfileStats() {
        const userItems = this.savedItems.filter(item => item.user === this.currentUser.username);
        const qrCodes = userItems.filter(item => item.type === 'qr').length;
        const barcodes = userItems.filter(item => item.type === 'barcode').length;
        const memberSince = new Date(this.currentUser.createdAt).toLocaleDateString();
        
        document.getElementById('totalCodes').textContent = userItems.length;
        document.getElementById('qrCodes').textContent = qrCodes;
        document.getElementById('barcodes').textContent = barcodes;
        document.getElementById('memberSince').textContent = memberSince;
    }

    updateUsername() {
        const newUsername = document.getElementById('newUsername').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!newUsername) {
            this.showNotification('error', 'Invalid Input', 'Please enter a new username');
            return;
        }
        
        if (!confirmPassword) {
            this.showNotification('error', 'Password Required', 'Please enter your current password to confirm');
            return;
        }
        
        // Check if new username already exists
        const existingUser = this.users.find(u => u.username === newUsername);
        if (existingUser || newUsername === 'admin') {
            this.showNotification('error', 'Username Taken', 'This username is already taken');
            return;
        }
        
        // Verify current password (for demo, just check if it's 'password' for admin)
        const isValidPassword = (this.currentUser.username === 'admin' && confirmPassword === 'password') ||
                               this.users.find(u => u.username === this.currentUser.username && u.password === confirmPassword);
        
        if (!isValidPassword) {
            this.showNotification('error', 'Invalid Password', 'Current password is incorrect');
            return;
        }
        
        const oldUsername = this.currentUser.username;
        
        // Update user in users array
        const userIndex = this.users.findIndex(u => u.username === oldUsername);
        if (userIndex !== -1) {
            this.users[userIndex].username = newUsername;
            this.saveUsers();
        }
        
        // Update current user
        this.currentUser.username = newUsername;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        // Update all saved items with new username
        this.savedItems.forEach(item => {
            if (item.user === oldUsername) {
                item.user = newUsername;
            }
        });
        this.saveSavedItems();
        
        // Update UI
        document.getElementById('currentUsername').value = newUsername;
        document.getElementById('newUsername').value = '';
        document.getElementById('confirmPassword').value = '';
        document.getElementById('welcomeMessage').textContent = `Welcome, ${newUsername}`;
        
        this.showNotification('success', 'Username Updated', `Username changed to "${newUsername}"`);
    }

    showCreateAccountModal() {
        document.getElementById('createAccountModal').classList.add('show');
    }

    hideCreateAccountModal() {
        document.getElementById('createAccountModal').classList.remove('show');
        document.getElementById('createAccountForm').reset();
    }

    handleCreateAccount(e) {
        e.preventDefault();
        const username = document.getElementById('newAccountUsername').value.trim();
        const password = document.getElementById('newAccountPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;
        
        if (!username || !password || !confirmPassword) {
            this.showNotification('error', 'Missing Information', 'Please fill in all fields');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showNotification('error', 'Password Mismatch', 'Passwords do not match');
            return;
        }
        
        if (password.length < 4) {
            this.showNotification('error', 'Weak Password', 'Password must be at least 4 characters long');
            return;
        }
        
        // Check if username already exists
        const existingUser = this.users.find(u => u.username === username);
        if (existingUser || username === 'admin') {
            this.showNotification('error', 'Username Taken', 'This username is already taken');
            return;
        }
        
        // Create new user
        const newUser = {
            username,
            password,
            createdAt: new Date().toISOString()
        };
        
        this.users.push(newUser);
        this.saveUsers();
        
        this.hideCreateAccountModal();
        this.showNotification('success', 'Account Created', `Account created successfully for "${username}"`);
        
        // Auto-fill login form
        document.getElementById('username').value = username;
        document.getElementById('password').value = '';
    }

    handleTabSwitch(e) {
        const tabName = e.target.dataset.tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabName + 'Tab').classList.add('active');
        
        if (tabName === 'saved') {
            this.displaySavedItems();
        } else if (tabName === 'profile') {
            this.updateProfileStats();
        }
    }

    updateFileName() {
        const textInput = document.getElementById('textInput').value;
        const fileNameInput = document.getElementById('fileName');
        
        if (textInput && !fileNameInput.value) {
            const sanitized = textInput.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
            fileNameInput.value = sanitized || 'my-code';
        }
    }

    handleCodeTypeChange() {
        const codeType = document.querySelector('input[name="codeType"]:checked').value;
        const textInput = document.getElementById('textInput');
        
        if (codeType === 'barcode') {
            textInput.placeholder = 'Enter numbers or text for barcode (e.g., 123456789012)';
        } else {
            textInput.placeholder = 'Enter text to generate QR code or barcode';
        }
    }

    async generateCode() {
        const textInput = document.getElementById('textInput').value.trim();
        const codeType = document.querySelector('input[name="codeType"]:checked').value;
        const size = parseInt(document.getElementById('codeSize').value);
        const color = document.getElementById('colorPicker').value;
        
        if (!textInput) {
            this.showNotification('error', 'Input Required', 'Please enter text to generate code');
            return;
        }

        try {
            const previewArea = document.getElementById('previewArea');
            previewArea.innerHTML = '';

            let canvas, svg;
            
            if (codeType === 'qr') {
                canvas = document.createElement('canvas');
                await QRCode.toCanvas(canvas, textInput, {
                    width: size,
                    color: {
                        dark: color,
                        light: '#FFFFFF'
                    }
                });
                previewArea.appendChild(canvas);
                
                // Create SVG version
                svg = await QRCode.toString(textInput, {
                    type: 'svg',
                    width: size,
                    color: {
                        dark: color,
                        light: '#FFFFFF'
                    }
                });
            } else {
                // Create canvas for barcode
                canvas = document.createElement('canvas');
                previewArea.appendChild(canvas);
                
                JsBarcode(canvas, textInput, {
                    format: "CODE128",
                    width: Math.max(1, size / 100),
                    height: size / 3,
                    displayValue: true,
                    fontSize: Math.max(12, size / 15),
                    textMargin: 5,
                    background: '#FFFFFF',
                    lineColor: color
                });
                
                // Create SVG version
                const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                JsBarcode(svgElement, textInput, {
                    format: "CODE128",
                    width: Math.max(1, size / 100),
                    height: size / 3,
                    displayValue: true,
                    fontSize: Math.max(12, size / 15),
                    textMargin: 5,
                    background: '#FFFFFF',
                    lineColor: color
                });
                svg = svgElement.outerHTML;
            }
            
            this.currentCode = {
                type: codeType,
                text: textInput,
                size: size,
                color: color,
                canvas: canvas,
                svg: svg,
                timestamp: new Date().toISOString()
            };
            
            document.getElementById('saveBtn').disabled = false;
            document.getElementById('downloadBtn').disabled = false;
            
            this.showNotification('success', 'Generated', `${codeType.toUpperCase()} code generated successfully`);
            
        } catch (error) {
            console.error('Generation error:', error);
            this.showNotification('error', 'Generation Failed', 'Failed to generate code. Please try again.');
        }
    }

    saveCode() {
        if (!this.currentCode) return;
        
        const fileName = document.getElementById('fileName').value.trim() || 'my-code';
        const format = document.getElementById('downloadFormat').value;
        
        const savedItem = {
            id: Date.now().toString(),
            fileName: fileName,
            format: format,
            type: this.currentCode.type,
            text: this.currentCode.text,
            size: this.currentCode.size,
            color: this.currentCode.color,
            svg: this.currentCode.svg,
            canvas: this.currentCode.canvas.toDataURL('image/png'),
            timestamp: this.currentCode.timestamp,
            user: this.currentUser.username
        };
        
        this.savedItems.unshift(savedItem);
        this.saveSavedItems();
        this.displaySavedItems();
        
        this.showNotification('success', 'Saved', `${savedItem.type.toUpperCase()} code saved as "${fileName}"`);
    }

    async downloadCode() {
        if (!this.currentCode) return;
        
        const fileName = document.getElementById('fileName').value.trim() || 'my-code';
        const format = document.getElementById('downloadFormat').value;
        
        try {
            let dataUrl, mimeType;
            
            if (format === 'svg') {
                const blob = new Blob([this.currentCode.svg], { type: 'image/svg+xml' });
                dataUrl = URL.createObjectURL(blob);
                mimeType = 'image/svg+xml';
            } else {
                dataUrl = this.currentCode.canvas.toDataURL(`image/${format}`);
                mimeType = `image/${format}`;
            }
            
            const link = document.createElement('a');
            link.download = `${fileName}.${format}`;
            link.href = dataUrl;
            link.click();
            
            if (format === 'svg') {
                URL.revokeObjectURL(dataUrl);
            }
            
            this.showNotification('success', 'Downloaded', `File downloaded as "${fileName}.${format}"`);
            
        } catch (error) {
            console.error('Download error:', error);
            this.showNotification('error', 'Download Failed', 'Failed to download file');
        }
    }

    loadSavedItems() {
        const saved = localStorage.getItem('savedItems');
        this.savedItems = saved ? JSON.parse(saved) : [];
    }

    loadUsers() {
        const users = localStorage.getItem('users');
        this.users = users ? JSON.parse(users) : [];
    }

    saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    saveSavedItems() {
        localStorage.setItem('savedItems', JSON.stringify(this.savedItems));
    }

    displaySavedItems() {
        const container = document.getElementById('savedItems');
        const userItems = this.savedItems.filter(item => item.user === this.currentUser.username);
        
        if (userItems.length === 0) {
            container.innerHTML = '<p class="no-items">No saved items yet</p>';
            return;
        }
        
        container.innerHTML = userItems.map(item => this.createSavedItemHTML(item)).join('');
        
        // Bind events for saved items
        container.querySelectorAll('.download-saved').forEach(btn => {
            btn.addEventListener('click', (e) => this.downloadSavedItem(e.target.dataset.id));
        });
        
        container.querySelectorAll('.delete-saved').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteSavedItem(e.target.dataset.id));
        });
    }

    createSavedItemHTML(item) {
        const date = new Date(item.timestamp).toLocaleDateString();
        const time = new Date(item.timestamp).toLocaleTimeString();
        
        return `
            <div class="saved-item">
                <div class="saved-item-preview">
                    ${item.type === 'qr' ? 
                        `<div>${item.svg}</div>` : 
                        `<img src="${item.canvas}" alt="Barcode" />`
                    }
                </div>
                <div class="saved-item-info">
                    <h4>${item.fileName}</h4>
                    <p><strong>Type:</strong> ${item.type.toUpperCase()}</p>
                    <p><strong>Size:</strong> ${item.size}px</p>
                    <p><strong>Format:</strong> ${item.format.toUpperCase()}</p>
                    <p><strong>Created:</strong> ${date} ${time}</p>
                    <div class="text-preview">${item.text}</div>
                </div>
                <div class="saved-item-actions">
                    <button class="btn btn-info download-saved" data-id="${item.id}">Download</button>
                    <button class="btn btn-danger delete-saved" data-id="${item.id}">Delete</button>
                </div>
            </div>
        `;
    }

    async downloadSavedItem(id) {
        const item = this.savedItems.find(item => item.id === id);
        if (!item) return;
        
        try {
            let dataUrl;
            
            if (item.format === 'svg') {
                const blob = new Blob([item.svg], { type: 'image/svg+xml' });
                dataUrl = URL.createObjectURL(blob);
            } else {
                dataUrl = item.canvas;
            }
            
            const link = document.createElement('a');
            link.download = `${item.fileName}.${item.format}`;
            link.href = dataUrl;
            link.click();
            
            if (item.format === 'svg') {
                URL.revokeObjectURL(dataUrl);
            }
            
            this.showNotification('success', 'Downloaded', `Downloaded "${item.fileName}.${item.format}"`);
            
        } catch (error) {
            console.error('Download error:', error);
            this.showNotification('error', 'Download Failed', 'Failed to download file');
        }
    }

    deleteSavedItem(id) {
        const item = this.savedItems.find(item => item.id === id);
        if (!item) return;
        
        if (confirm(`Are you sure you want to delete "${item.fileName}"?`)) {
            this.savedItems = this.savedItems.filter(item => item.id !== id);
            this.saveSavedItems();
            this.displaySavedItems();
            this.showNotification('info', 'Deleted', `"${item.fileName}" has been deleted`);
        }
    }

    handleSearch() {
        const query = document.getElementById('searchInput').value.toLowerCase();
        const userItems = this.savedItems.filter(item => item.user === this.currentUser.username);
        
        const filteredItems = userItems.filter(item => 
            item.fileName.toLowerCase().includes(query) ||
            item.text.toLowerCase().includes(query) ||
            item.type.toLowerCase().includes(query)
        );
        
        const container = document.getElementById('savedItems');
        
        if (filteredItems.length === 0) {
            container.innerHTML = query ? 
                '<p class="no-items">No items match your search</p>' : 
                '<p class="no-items">No saved items yet</p>';
            return;
        }
        
        container.innerHTML = filteredItems.map(item => this.createSavedItemHTML(item)).join('');
        
        // Re-bind events
        container.querySelectorAll('.download-saved').forEach(btn => {
            btn.addEventListener('click', (e) => this.downloadSavedItem(e.target.dataset.id));
        });
        
        container.querySelectorAll('.delete-saved').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteSavedItem(e.target.dataset.id));
        });
    }

    showNotification(type, title, message) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <h4>${title}</h4>
            <p>${message}</p>
        `;
        
        document.getElementById('notifications').appendChild(notification);
        
        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new QRBarcodeGenerator();
});
  const passwordInput = document.getElementById("password");
    const toggleIcon = document.getElementById("toggleIcon");

    // যখন input এ কিছু লেখা হবে তখন icon দেখাবে
    passwordInput.addEventListener("input", () => {
      if (passwordInput.value.length > 0) {
        toggleIcon.style.display = "block";
      } else {
        toggleIcon.style.display = "none";
      }
    });

    // icon এ ক্লিক করলে password show/hide হবে
    toggleIcon.addEventListener("click", () => {
      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleIcon.classList.remove("fa-eye");
        toggleIcon.classList.add("fa-eye-slash");
      } else {
        passwordInput.type = "password";
        toggleIcon.classList.remove("fa-eye-slash");
        toggleIcon.classList.add("fa-eye");
      }
    });