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
            
            // Check role in users table
            const { data: userRole, error: roleError } = await this.supabase
                .from('users')
                .select('role')
                .eq('uid', userId)
                .single();
            
            if (roleError) {
                console.error('Role verification error:', roleError);
                alert('Access denied. Admin privileges required.');
                return false;
            }

            // Verify admin role
            if (userRole.role !== 'admin' && userRole.role !== 'super_admin') {
                alert('Access denied. Admin privileges required.');
                return false;
            }

            // Get admin info
            const { data: adminInfo } = await this.supabase
                .from('admin_info')
                .select('*')
                .eq('user_uid', userId)
                .single();
            
            // Store user info
            this.currentUser = {
                ...adminInfo,
                email: user.email,
                role: userRole.role
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
        // Check if user exists in USERS table (main authentication table)
        const { data: existingMainUser, error: mainFetchError } = await this.supabase
            .from('users')
            .select('*')
            .eq('uid', authUser.id)
            .single();

        if (mainFetchError && mainFetchError.code !== 'PGRST116') {
            throw mainFetchError;
        }

        // If user doesn't exist in users table, they need to be added by Super Admin
        if (!existingMainUser) {
            console.log('User not found in database');
            throw new Error('Account not found. Please contact Super Admin to create your account.');
        }

        // Check if user exists in ADMIN_INFO table
        const { data: existingAdminInfo, error: adminFetchError } = await this.supabase
            .from('admin_info')
            .select('*')
            .eq('user_uid', authUser.id)
            .single();

        if (adminFetchError && adminFetchError.code !== 'PGRST116') {
            throw adminFetchError;
        }

        // If user doesn't exist in admin_info, create them
        if (!existingAdminInfo) {
            console.log('Creating admin info...');
            
            // Generate staff_id
            const staffId = 'ADMIN' + Date.now().toString().slice(-6);
            
            const { error: insertAdminError } = await this.supabase
                .from('admin_info')
                .insert({
                    user_uid: authUser.id,
                    staff_id: staffId,
                    full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
                    department: 'IT Administration'
                });

            if (insertAdminError) throw insertAdminError;
            console.log('✅ New admin user created in admin_info');
        }

        return true;
        
    } catch (error) {
        console.error('Error ensuring user exists:', error);
        
        // Show user-friendly error messages
        if (error.message === 'Account not found. Please contact Super Admin to create your account.') {
            alert('⚠️ Account not found. Please contact Super Admin to create your account.');
        } else {
            alert('❌ Failed to access user record. Please contact support.');
        }
        
        // Sign out unauthorized user
        await this.supabase.auth.signOut();
        
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