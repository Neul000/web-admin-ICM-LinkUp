/**
 * Dashboard Page Logic
 * Fetches and displays statistics and recent activity
 */

document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;
    
    // Check authentication
    const session = await window.authManager.getCurrentSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    // Verify admin role
    const isAdmin = await window.authManager.verifyAdminRole(session.user.id);
    if (!isAdmin) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize
    await loadUserInfo();
    await loadStatistics();
    await loadRecentAlumni();
    await loadRecentInquiries();

    // Setup logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await window.authManager.logout();
    });

    /**
     * Load current user information
     */
    async function loadUserInfo() {
        try {
            const user = window.authManager.getCurrentUser();
            if (user) {
                document.getElementById('userName').textContent = user.email.split('@')[0];
                document.getElementById('userRole').textContent = user.role === 'super_admin' ? 'Super Admin' : 'Admin';
                
                // Set avatar initial
                const initial = user.email.charAt(0).toUpperCase();
                document.getElementById('userAvatar').textContent = initial;
            }
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }

    /**
     * Load dashboard statistics
     */
    async function loadStatistics() {
        try {
            // Total users
            const { count: totalUsers, error: usersError } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });

            if (usersError) throw usersError;
            document.getElementById('totalUsers').textContent = totalUsers || 0;

            // Verified alumni
            const { count: verifiedCount, error: verifiedError } = await supabase
                .from('alumni_profile')
                .select('*', { count: 'exact', head: true })
                .eq('is_verified', true);

            if (verifiedError) throw verifiedError;
            document.getElementById('verifiedAlumni').textContent = verifiedCount || 0;

            // Pending alumni
            const { count: pendingCount, error: pendingError } = await supabase
                .from('alumni_profile')
                .select('*', { count: 'exact', head: true })
                .eq('is_verified', false);

            if (pendingError) throw pendingError;
            document.getElementById('pendingAlumni').textContent = pendingCount || 0;

            // Total inquiries
            const { count: inquiriesCount, error: inquiriesError } = await supabase
                .from('inquiries')
                .select('*', { count: 'exact', head: true });

            if (inquiriesError) throw inquiriesError;
            document.getElementById('totalInquiries').textContent = inquiriesCount || 0;

        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    /**
     * Load recent alumni registrations
     */
    async function loadRecentAlumni() {
        try {
            const { data, error } = await supabase
                .from('alumni_profile')
                .select(`
                    *,
                    users!alumni_profile_user_uid_fkey (email)
                `)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            const tbody = document.getElementById('recentAlumniBody');
            
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No alumni registrations yet</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(alumni => {
                const statusBadge = alumni.is_verified 
                    ? '<span class="badge badge-success">Verified</span>'
                    : '<span class="badge badge-warning">Pending</span>';
                
                const date = new Date(alumni.created_at).toLocaleDateString('en-MY', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                return `
                    <tr>
                        <td>${alumni.full_name}</td>
                        <td>${alumni.users?.email || 'N/A'}</td>
                        <td>${alumni.course_code || 'N/A'}</td>
                        <td>${alumni.graduation_year || 'N/A'}</td>
                        <td>${statusBadge}</td>
                        <td>${date}</td>
                    </tr>
                `;
            }).join('');

        } catch (error) {
            console.error('Error loading recent alumni:', error);
            document.getElementById('recentAlumniBody').innerHTML = 
                '<tr><td colspan="6" class="text-center">Error loading data</td></tr>';
        }
    }

    /**
     * Load recent inquiries
     */
    async function loadRecentInquiries() {
        try {
            const { data, error } = await supabase
                .from('inquiries')
                .select(`
                    *,
                    student:student_uid (
                        student_info (full_name)
                    ),
                    alumni:alumni_uid (
                        alumni_profile (full_name)
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            const tbody = document.getElementById('recentInquiriesBody');
            
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No inquiries yet</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(inquiry => {
                let statusBadge;
                switch(inquiry.status) {
                    case 'pending':
                        statusBadge = '<span class="badge badge-warning">Pending</span>';
                        break;
                    case 'accepted':
                        statusBadge = '<span class="badge badge-success">Accepted</span>';
                        break;
                    case 'declined':
                        statusBadge = '<span class="badge badge-danger">Declined</span>';
                        break;
                    case 'completed':
                        statusBadge = '<span class="badge badge-info">Completed</span>';
                        break;
                    default:
                        statusBadge = '<span class="badge badge-info">Unknown</span>';
                }
                
                const date = new Date(inquiry.created_at).toLocaleDateString('en-MY', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                // Get student name from nested structure
                const studentName = inquiry.student?.student_info?.[0]?.full_name || 'Unknown Student';
                const alumniName = inquiry.alumni?.alumni_profile?.[0]?.full_name || 'Unknown Alumni';

                return `
                    <tr>
                        <td>${studentName}</td>
                        <td>${alumniName}</td>
                        <td>${inquiry.subject_area}</td>
                        <td>${statusBadge}</td>
                        <td>${date}</td>
                    </tr>
                `;
            }).join('');

        } catch (error) {
            console.error('Error loading recent inquiries:', error);
            document.getElementById('recentInquiriesBody').innerHTML = 
                '<tr><td colspan="5" class="text-center">Error loading data</td></tr>';
        }
    }
});