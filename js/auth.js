/**
 * Authentication Module
 * Handles admin login, logout, and session management
 */

class AuthManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.currentUser = null;
    }

    /**
     * Initialize authentication
     * Check if user is already logged in
     */
    async init() {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session) {
                // Ensure user exists first, then verify role
                await this.ensureUserExists(session.user);
                await this.verifyAdminRole(session.user.id);
            }
            
            // Listen for auth state changes
            this.supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    await this.ensureUserExists(session.user);
                    await this.verifyAdminRole(session.user.id);
                } else if (event === 'SIGNED_OUT') {
                    this.redirectToLogin();
                }
            });
            
        } catch (error) {
            console.error('Auth initialization error:', error);
        }
    }

    /**
 * Verify if user has admin role
 */
async verifyAdminRole(userId) {
    try {
        // First ensure user exists
        const { data: { user } } = await this.supabase.auth.getUser();
        await this.ensureUserExists(user);
        
        // Check in admin_info table
        const { data, error } = await this.supabase
            .from('admin_info')
            .select('*')
            .eq('user_uid', userId)
            .single();

        if (error) {
            console.error('Role verification error:', error);
            return false;
        }

        if (!data) {
            alert('Access denied. Admin privileges required.');
            return false;
        }

        // Store user info with email and get role from users table
        const { data: userRole } = await this.supabase
            .from('users')
            .select('role')
            .eq('uid', userId)
            .single();
        
        this.currentUser = {
            ...data,
            email: user.email,
            role: userRole?.role || 'admin' // Get role from users table
        };
        return true;

    } catch (error) {
        console.error('Role verification error:', error);
        return false;
    }
}

    /**
     * Login with email and password
     */
    async login(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            // Verify admin role
            const isAdmin = await this.verifyAdminRole(data.user.id);
            
            if (isAdmin) {
                window.location.href = 'dashboard.html';
                return { success: true };
            } else {
                await this.logout();
                return { success: false, error: 'Not authorized as admin' };
            }

        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Login with Google OAuth
     */
    async loginWithGoogle() {
        try {
            // Get the current directory path
            const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
            const redirectUrl = `${window.location.origin}${currentPath}/dashboard.html`;
            
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + window.location.pathname.replace('/index.html', '')
                }
            });
    
            if (error) throw error;
            return { success: true };
    
        } catch (error) {
            console.error('Google login error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Logout current user
     */
    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            this.currentUser = null;
            this.redirectToLogin();

        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    /**
     * Get current session
     */
    async getCurrentSession() {
        const { data: { session } } = await this.supabase.auth.getSession();
        return session;
    }

    /**
     * Check if user is authenticated
     */
    async isAuthenticated() {
        const session = await this.getCurrentSession();
        return session !== null;
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        if (!window.location.pathname.endsWith('index.html') && 
            !window.location.pathname.endsWith('/')) {
            window.location.href = 'index.html';
        }
    }
/**
 * Create or update user in database after Google login
 */
async ensureUserExists(authUser) {
    try {
        // Check if user exists in admin_info
        const { data: existingUser, error: fetchError } = await this.supabase
            .from('admin_info')
            .select('*')
            .eq('user_uid', authUser.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        // If user doesn't exist, create them
        if (!existingUser) {
            // Get staff_id from email (or generate one)
            const staffId = 'ADMIN' + Date.now().toString().slice(-6);
            
            const { error: insertError } = await this.supabase
                .from('admin_info')
                .insert({
                    user_uid: authUser.id,
                    staff_id: staffId,
                    full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
                    department: 'IT Administration'
                });

            if (insertError) throw insertError;
            console.log('New admin user created in admin_info');
        }

        return true;
    } catch (error) {
        console.error('Error ensuring user exists:', error);
        return false;
    }
}
    /**
     * Get current user info
     */
    getCurrentUser() {
        return this.currentUser;
    }
}

// Create global instance
window.authManager = new AuthManager();