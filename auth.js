/**
 * Authentication Module
 * Handles login, logout, and session state.
 * Uses LocalStorage to persist login state.
 */
window.auth = {
    config: {
        adminUser: 'admin',
        adminPass: 'admin123'
    },

    init() {
        this.checkAuth();

        // Bind login form
        const form = document.getElementById('login-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }
    },

    checkAuth() {
        const isLoggedIn = localStorage.getItem('3bd_auth_user');
        const app = document.getElementById('app');
        const authScreen = document.getElementById('auth-screen');

        if (isLoggedIn) {
            authScreen.style.display = 'none';
            app.style.display = 'flex';
        } else {
            authScreen.style.display = 'flex';
            app.style.display = 'none';
        }
    },

    login() {
        const userIn = document.getElementById('username').value;
        const passIn = document.getElementById('password').value;
        const errorEl = document.getElementById('auth-error');

        if (userIn === this.config.adminUser && passIn === this.config.adminPass) {
            localStorage.setItem('3bd_auth_user', userIn);
            errorEl.style.display = 'none';
            this.checkAuth();
        } else {
            errorEl.textContent = 'Invalid username or password';
            errorEl.style.display = 'block';
        }
    },

    logout() {
        localStorage.removeItem('3bd_auth_user');
        this.checkAuth();
        // Clear inputs
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }
};
