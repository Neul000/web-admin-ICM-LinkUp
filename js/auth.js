/**
 * Authentication Module (FIXED VERSION)
 * Supabase Auth + Role-based Admin
 */

class AuthManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.currentUser = null;
    }

    async init() {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();

            if (session) {
                await this.verifyAdminRole(session.user.id);
            }

            this.supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    await this.verifyAdminRole(session.user.id);
                }

                if (event === 'SIGNED_OUT') {
                    this.redirectToLogin();
                }
            });

        } catch (error) {
            console.error('Auth init error:', error);
        }
    }

    /**
     * Verify admin role
     */
    async verifyAdminRole(userId) {
        try {
            const { data, error } = await this.supabase
                .from('admin_info')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error || !data) {
                alert('Access denied. Admin privileges required.');
                await this.logout();
                return false;
            }

            this.currentUser = {
                ...data,
                role: 'admin'
            };

            return true;

        } catch (error) {
            console.error('Role verification error:', error);
            return false;
        }
    }

    /**
     * Email & password login
     */
    async login(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            const isAdmin = await this.verifyAdminRole(data.user.id);
            if (isAdmin) {
                window.location.href = 'dashboard.html';
                return { success: true };
            }

            return { success: false };

        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Google login
     */
    async loginWithGoogle() {
        try {
            const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
            const redirectUrl = `${window.location.origin}${currentPath}/dashboard.html`;

            const { error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: redirectUrl }
            });

            if (error) throw error;
            return { success: true };

        } catch (error) {
            console.error('Google login error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Logout
     */
    async logout() {
        try {
            await this.supabase.auth.signOut();
            this.currentUser = null;
            this.redirectToLogin();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    /**
     * Session check
     */
    async getCurrentSession() {
        const { data: { session } } = await this.supabase.auth.getSession();
        return session;
    }

    async isAuthenticated() {
        return (await this.getCurrentSession()) !== null;
    }

    redirectToLogin() {
        if (!window.location.pathname.endsWith('index.html') &&
            !window.location.pathname.endsWith('/')) {
            window.location.href = 'index.html';
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

window.authManager = new AuthManager();
