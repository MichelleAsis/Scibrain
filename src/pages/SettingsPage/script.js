// ==================== //
// Global Variables
// ==================== //
let currentEditField = null;

// ==================== //
// Back Button
// ==================== //
function initBackButton() {
    const backBtn = document.querySelector('.btn-back');
    
    backBtn.addEventListener('click', () => {
        // Check if there's a referrer in localStorage or use browser history
        const referrer = localStorage.getItem('settingsReferrer');
        
        if (referrer) {
            console.log(`Back button clicked - Navigating to ${referrer}`);
            localStorage.removeItem('settingsReferrer'); // Clean up
            window.location.href = referrer;
        } else if (document.referrer && document.referrer.includes(window.location.host)) {
            // If there's a valid referrer from same domain, go back
            console.log('Back button clicked - Using browser back');
            window.history.back();
        } else {
            // Default fallback to Dashboard
            console.log('Back button clicked - Navigating to Dashboard (default)');
            window.location.href = '../Dashboard/index.html';
        }
    });
}

// ==================== //
// Dark Mode Toggle
// ==================== //
function initDarkModeToggle() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeLabel = document.querySelector('.setting-item .setting-sublabel');
    
    // Check if dark mode is saved in localStorage
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    darkModeToggle.checked = isDarkMode;
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeLabel.textContent = 'Currently using dark theme';
    }
    
    darkModeToggle.addEventListener('change', () => {
        const isChecked = darkModeToggle.checked;
        
        if (isChecked) {
            document.body.classList.add('dark-mode');
            darkModeLabel.textContent = 'Currently using dark theme';
            localStorage.setItem('darkMode', 'true');
            console.log('Dark mode enabled');
        } else {
            document.body.classList.remove('dark-mode');
            darkModeLabel.textContent = 'Currently using light theme';
            localStorage.setItem('darkMode', 'false');
            console.log('Dark mode disabled');
        }
    });
}

// ==================== //
// Font Size Selector
// ==================== //
function initFontSizeSelector() {
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    
    // Load saved font size
    const savedFontSize = localStorage.getItem('fontSize') || 'medium';
    fontSizeSelect.value = savedFontSize;
    applyFontSize(savedFontSize);
    
    fontSizeSelect.addEventListener('change', (e) => {
        const fontSize = e.target.value;
        applyFontSize(fontSize);
        localStorage.setItem('fontSize', fontSize);
        console.log(`Font size changed to: ${fontSize}`);
    });
}

function applyFontSize(size) {
    const root = document.documentElement;
    
    switch(size) {
        case 'small':
            root.style.fontSize = '14px';
            break;
        case 'medium':
            root.style.fontSize = '16px';
            break;
        case 'large':
            root.style.fontSize = '18px';
            break;
    }
}

// ==================== //
// Edit Buttons
// ==================== //
function initEditButtons() {
    const editButtons = document.querySelectorAll('.btn-edit');
    
    editButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const settingItem = button.closest('.setting-item');
            const label = settingItem.querySelector('.setting-label').textContent;
            const currentValue = settingItem.querySelector('.setting-sublabel').textContent;
            
            currentEditField = {
                element: settingItem,
                field: label.toLowerCase(),
                currentValue: currentValue
            };
            
            openEditModal(label, currentValue);
        });
    });
}

// ==================== //
// Edit Modal
// ==================== //
function openEditModal(field, currentValue) {
    const modal = document.getElementById('editModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalLabel = document.getElementById('modalLabel');
    const modalInput = document.getElementById('modalInput');
    
    modalTitle.textContent = `Edit ${field}`;
    modalLabel.textContent = `New ${field}`;
    modalInput.value = currentValue;
    modalInput.placeholder = `Enter new ${field.toLowerCase()}`;
    
    modal.classList.add('active');
    modalInput.focus();
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.classList.remove('active');
    currentEditField = null;
}

function saveChanges() {
    const modalInput = document.getElementById('modalInput');
    const newValue = modalInput.value.trim();
    
    if (!newValue) {
        alert('Please enter a valid value');
        return;
    }
    
    if (currentEditField) {
        const sublabel = currentEditField.element.querySelector('.setting-sublabel');
        sublabel.textContent = newValue;
        
        console.log(`Updated ${currentEditField.field} to: ${newValue}`);
        
        // Future: Send to API to update user information
        alert(`${currentEditField.field} updated successfully!`);
    }
    
    closeEditModal();
}

function initModalControls() {
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveBtn = document.getElementById('saveBtn');
    const modal = document.getElementById('editModal');
    
    closeBtn.addEventListener('click', closeEditModal);
    cancelBtn.addEventListener('click', closeEditModal);
    saveBtn.addEventListener('click', saveChanges);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeEditModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeEditModal();
        }
    });
}

// ==================== //
// Clear Cache Button
// ==================== //
function initClearCacheButton() {
    const clearCacheBtn = document.querySelector('.btn-action:not(.danger)');
    
    clearCacheBtn.addEventListener('click', () => {
        const confirmed = confirm('Are you sure you want to clear the cache? This will remove temporary files.');
        
        if (confirmed) {
            console.log('Clearing cache...');
            
            // Future: Clear actual cache data
            // For now, just clear some localStorage items
            const keysToKeep = ['darkMode', 'fontSize', 'username', 'email'];
            const allKeys = Object.keys(localStorage);
            
            allKeys.forEach(key => {
                if (!keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            
            alert('Cache cleared successfully!');
            console.log('Cache cleared');
        }
    });
}

// ==================== //
// Delete All Data Button
// ==================== //
function initDeleteDataButton() {
    const deleteDataBtn = document.querySelector('.btn-action.danger');
    
    deleteDataBtn.addEventListener('click', () => {
        const confirmed = confirm(
            'WARNING: This will permanently delete ALL your data including:\n\n' +
            '• All your reviews and topics\n' +
            '• Your annotations and highlights\n' +
            '• Your game progress and scores\n' +
            '• All settings and preferences\n\n' +
            'This action CANNOT be undone!\n\n' +
            'Type "DELETE" to confirm:'
        );
        
        if (confirmed) {
            const doubleConfirm = prompt('Type "DELETE" in all caps to confirm:');
            
            if (doubleConfirm === 'DELETE') {
                console.log('Deleting all user data...');
                
                // Future: Send request to API to delete all user data
                localStorage.clear();
                sessionStorage.clear();
                
                alert('All data has been deleted. You will be redirected to the home page.');
                console.log('All data deleted');
                
                // Future: Redirect to home page or logout
                // window.location.href = '/';
            } else {
                alert('Deletion cancelled. Confirmation text did not match.');
            }
        }
    });
}

// ==================== //
// Accessibility - Keyboard Navigation
// ==================== //
function initKeyboardNavigation() {
    const modal = document.getElementById('editModal');
    const modalInput = document.getElementById('modalInput');
    
    modalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveChanges();
        }
    });
}

// ==================== //
// Initialize Everything
// ==================== //
document.addEventListener('DOMContentLoaded', () => {
    console.log('Settings Page Loaded');
    
    initBackButton();
    initDarkModeToggle();
    initFontSizeSelector();
    initEditButtons();
    initModalControls();
    initClearCacheButton();
    initDeleteDataButton();
    initKeyboardNavigation();
    
    console.log('All settings features initialized successfully');
});