/**
 * Supabase Configuration
 * ICM LinkUp Admin Portal
 */

// Wait for Supabase library to load
(function() {
    'use strict';
    
    const SUPABASE_URL = 'https://zdlscageppjicxsztlbo.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkbHNjYWdlcHBqaWN4c3p0bGJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMzU0MTEsImV4cCI6MjA4MjgxMTQxMX0.z4PmUqU5TFN743VjoXilFHPazzz40wk6pJIHTF5dgEA';
    
    // Function to initialize Supabase
    function initSupabase() {
        if (typeof window.supabase === 'undefined') {
            console.error('Supabase library not loaded!');
            return null;
        }
        
        try {
            const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase client initialized successfully');
            return client;
        } catch (error) {
            console.error('Error initializing Supabase:', error);
            return null;
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.supabaseClient = initSupabase();
        });
    } else {
        window.supabaseClient = initSupabase();
    }
})();