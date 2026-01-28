/**
 * Users Page Logic
 * Displays and manages all users in the system
 */

document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;
    let currentFilter = 'all';
    let allUsersData = [];
    
    // Check authentication
    const session = await window.authManager.getCurrentSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    const isAdmin = await window.authManager.verifyAdminRole(session.user.id);
    if (!isAdmin) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize
    await loadUserInfo();
    await loadUsers();
    await loadStatistics();
    setupEventListeners();

    /**
     * Load user info
     */
    async function loadUserInfo() {
        const user = window.authManager.getCurrentUser();
        if (user) {
            document.getElementById('userName').textContent = user.email.split('@')[0];
            document.getElementById('userRole').textContent = user.role === 'super_admin' ? 'Super Admin' : 'Admin';
            document.getElementById('userAvatar').textContent = user.email.charAt(0).toUpperCase();
        }
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        document.getElementById('logoutBtn').addEventListener('click', () => {
            window.authManager.logout();
        });

        // Show Add Admin button for super admin only
        const currentUser = window.authManager.getCurrentUser();
        if (currentUser && currentUser.role === 'super_admin') {
            document.getElementById('addAdminBtn').style.display = 'block';
            document.getElementById('addAdminBtn').addEventListener('click', openAddAdminModal);
        }

        document.getElementById('filterAll').addEventListener('click', () => {
            currentFilter = 'all';
            updateFilterButtons('filterAll');
            renderUsers(allUsersData);
        });

        document.getElementById('filterAlumni').addEventListener('click', () => {
            currentFilter = 'alumni';
            updateFilterButtons('filterAlumni');
            const filtered = allUsersData.filter(u => u.role === 'alumni');
            renderUsers(filtered);
        });

        document.getElementById('filterStudents').addEventListener('click', () => {
            currentFilter = 'student';
            updateFilterButtons('filterStudents');
            const filtered = allUsersData.filter(u => u.role === 'student');
            renderUsers(filtered);
        });

        document.getElementById('filterAdmins').addEventListener('click', () => {
            currentFilter = 'admin';
            updateFilterButtons('filterAdmins');
            const filtered = allUsersData.filter(u => u.role === 'admin' || u.role === 'super_admin');
            renderUsers(filtered);
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            let filtered = currentFilter === 'all' ? allUsersData : 
                          currentFilter === 'alumni' ? allUsersData.filter(u => u.role === 'alumni') :
                          currentFilter === 'student' ? allUsersData.filter(u => u.role === 'student') :
                          allUsersData.filter(u => u.role === 'admin' || u.role === 'super_admin');
            
            filtered = filtered.filter(u => 
                u.email.toLowerCase().includes(searchTerm) ||
                (u.full_name && u.full_name.toLowerCase().includes(searchTerm))
            );
            
            renderUsers(filtered);
        });
    }

    /**
     * Update filter button states
     */
    function updateFilterButtons(activeBtn) {
        ['filterAll', 'filterAlumni', 'filterStudents', 'filterAdmins'].forEach(id => {
            const btn = document.getElementById(id);
            if (id === activeBtn) {
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary');
            } else {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            }
        });
    }

    /**
     * Load statistics
     */
    async function loadStatistics() {
        try {
            // Total users
            const { count: totalUsers } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });
            
            document.getElementById('totalUsers').textContent = totalUsers || 0;

            // Alumni count
            const { count: alumniCount } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'alumni');
            
            document.getElementById('totalAlumni').textContent = alumniCount || 0;
            document.getElementById('alumniCount').textContent = alumniCount || 0;

            // Students count
            const { count: studentsCount } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'student');
            
            document.getElementById('totalStudents').textContent = studentsCount || 0;
            document.getElementById('studentsCount').textContent = studentsCount || 0;

            // Admins count (including super_admin)
            const { count: adminsCount } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .or('role.eq.admin,role.eq.super_admin');
            
            document.getElementById('totalAdmins').textContent = adminsCount || 0;
            document.getElementById('adminsCount').textContent = adminsCount || 0;

            // All count for filter
            document.getElementById('allCount').textContent = totalUsers || 0;

        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    /**
     * Load all users
     */
    async function loadUsers() {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch additional info for each user based on role
            for (let user of data) {
                if (user.role === 'alumni') {
                    const { data: alumniData } = await supabase
                        .from('alumni_profile')
                        .select('full_name')
                        .eq('user_uid', user.uid)
                        .single();
                    user.full_name = alumniData?.full_name || 'N/A';
                } else if (user.role === 'student') {
                    const { data: studentData } = await supabase
                        .from('student_info')
                        .select('full_name')
                        .eq('user_uid', user.uid)
                        .single();
                    user.full_name = studentData?.full_name || 'N/A';
                } else if (user.role === 'admin' || user.role === 'super_admin') {
                    const { data: adminData } = await supabase
                        .from('admin_info')
                        .select('full_name')
                        .eq('user_uid', user.uid)
                        .single();
                    user.full_name = adminData?.full_name || 'N/A';
                }
            }

            allUsersData = data;
            renderUsers(data);

        } catch (error) {
            console.error('Error loading users:', error);
            showAlert('Error loading users data', 'error');
        }
    }

    /**
     * Render users table
     */
    function renderUsers(data) {
        const tbody = document.getElementById('usersTableBody');

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(user => {
            const roleBadge = getRoleBadge(user.role);
            const date = new Date(user.created_at).toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            return `
                <tr>
                    <td>${user.email}</td>
                    <td>${roleBadge}</td>
                    <td>${user.full_name || 'N/A'}</td>
                    <td>${date}</td>
                    <td><span class="badge badge-success">Active</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewUser('${user.uid}')">View</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Get role badge HTML
     */
    function getRoleBadge(role) {
        switch(role) {
            case 'alumni':
                return '<span class="badge badge-success">Alumni</span>';
            case 'student':
                return '<span class="badge badge-info">Student</span>';
            case 'admin':
                return '<span class="badge badge-warning">Admin</span>';
            case 'super_admin':
                return '<span class="badge badge-danger">Super Admin</span>';
            default:
                return '<span class="badge">Unknown</span>';
        }
    }

    /**
     * View user details
     */
    window.viewUser = async function(userId) {
        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('uid', userId)
                .single();

            if (error) throw error;

            // Fetch additional details based on role
            let additionalInfo = '';
            
            if (user.role === 'alumni') {
                const { data: alumniData } = await supabase
                    .from('alumni_profile')
                    .select('*')
                    .eq('user_uid', user.uid)
                    .single();
                
                if (alumniData) {
                    additionalInfo = `
                        <div class="user-detail">
                            <div class="user-detail-label">Full Name</div>
                            <div class="user-detail-value">${alumniData.full_name || 'N/A'}</div>
                        </div>
                        <div class="user-detail">
                            <div class="user-detail-label">Course Code</div>
                            <div class="user-detail-value">${alumniData.course_code || 'N/A'}</div>
                        </div>
                        <div class="user-detail">
                            <div class="user-detail-label">Graduation Year</div>
                            <div class="user-detail-value">${alumniData.graduation_year || 'N/A'}</div>
                        </div>
                        <div class="user-detail">
                            <div class="user-detail-label">Verification Status</div>
                            <div class="user-detail-value">${alumniData.is_verified ? '<span class="badge badge-success">Verified</span>' : '<span class="badge badge-warning">Pending</span>'}</div>
                        </div>
                    `;
                }
            } else if (user.role === 'student') {
                const { data: studentData } = await supabase
                    .from('student_info')
                    .select('*')
                    .eq('user_uid', user.uid)
                    .single();
                
                if (studentData) {
                    additionalInfo = `
                        <div class="user-detail">
                            <div class="user-detail-label">Full Name</div>
                            <div class="user-detail-value">${studentData.full_name || 'N/A'}</div>
                        </div>
                        <div class="user-detail">
                            <div class="user-detail-label">Student ID</div>
                            <div class="user-detail-value">${studentData.student_id || 'N/A'}</div>
                        </div>
                        <div class="user-detail">
                            <div class="user-detail-label">Course Code</div>
                            <div class="user-detail-value">${studentData.course_code || 'N/A'}</div>
                        </div>
                    `;
                }
            } else if (user.role === 'admin' || user.role === 'super_admin') {
                const { data: adminData } = await supabase
                    .from('admin_info')
                    .select('*')
                    .eq('user_uid', user.uid)
                    .single();
                
                if (adminData) {
                    additionalInfo = `
                        <div class="user-detail">
                            <div class="user-detail-label">Full Name</div>
                            <div class="user-detail-value">${adminData.full_name || 'N/A'}</div>
                        </div>
                        <div class="user-detail">
                            <div class="user-detail-label">Staff ID</div>
                            <div class="user-detail-value">${adminData.staff_id || 'N/A'}</div>
                        </div>
                        <div class="user-detail">
                            <div class="user-detail-label">Department</div>
                            <div class="user-detail-value">${adminData.department || 'N/A'}</div>
                        </div>
                    `;
                }
            }

            const modalBody = `
                <div class="user-detail">
                    <div class="user-detail-label">Email</div>
                    <div class="user-detail-value">${user.email}</div>
                </div>
                <div class="user-detail">
                    <div class="user-detail-label">Role</div>
                    <div class="user-detail-value">${getRoleBadge(user.role)}</div>
                </div>
                <div class="user-detail">
                    <div class="user-detail-label">User ID</div>
                    <div class="user-detail-value">${user.uid}</div>
                </div>
                <div class="user-detail">
                    <div class="user-detail-label">Created At</div>
                    <div class="user-detail-value">${new Date(user.created_at).toLocaleString('en-MY')}</div>
                </div>
                ${additionalInfo}
            `;

            document.getElementById('modalTitle').textContent = `${user.email}`;
            document.getElementById('modalBody').innerHTML = modalBody;
            
            // Add super admin actions
            const currentUser = window.authManager.getCurrentUser();
            const modalFooter = document.querySelector('.modal-footer');
            
            if (currentUser && currentUser.role === 'super_admin') {
                // Add change role and delete buttons for super admin
                modalFooter.innerHTML = `
                    <div style="display: flex; gap: 12px; width: 100%;">
                        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                        <div style="margin-left: auto; display: flex; gap: 12px;">
                            <select id="roleSelect" class="form-input" style="padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px;">
                                <option value="">Change Role...</option>
                                <option value="admin">Admin</option>
                                <option value="super_admin">Super Admin</option>
                                <option value="alumni">Alumni</option>
                                <option value="student">Student</option>
                            </select>
                            <button class="btn btn-primary" onclick="changeUserRole('${user.uid}')">Update Role</button>
                            <button class="btn btn-danger" onclick="deleteUser('${user.uid}', '${user.email}')">Delete User</button>
                        </div>
                    </div>
                `;
            } else {
                // Regular admin - only close button
                modalFooter.innerHTML = `
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                `;
            }
            
            document.getElementById('userModal').classList.remove('hidden');

        } catch (error) {
            console.error('Error loading user details:', error);
            showAlert('Error loading user details', 'error');
        }
    };

    /**
     * Change user role (Super Admin only)
     */
    window.changeUserRole = async function(userId) {
        const newRole = document.getElementById('roleSelect').value;
        
        if (!newRole) {
            showAlert('Please select a role', 'error');
            return;
        }
        
        if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
            return;
        }
        
        try {
            const { error } = await supabase
                .from('users')
                .update({ role: newRole })
                .eq('uid', userId);
            
            if (error) throw error;
            
            showAlert('User role updated successfully!', 'success');
            closeModal();
            loadUsers();
            
        } catch (error) {
            console.error('Error updating role:', error);
            showAlert('Error updating user role', 'error');
        }
    };

    /**
     * Delete user (Super Admin only)
     */
    window.deleteUser = async function(userId, email) {
        if (!confirm(`Are you sure you want to DELETE ${email}?\n\nThis will permanently remove:\n- User account\n- All associated data\n\nThis action CANNOT be undone!`)) {
            return;
        }
        
        // Double confirmation for safety
        const confirmation = prompt(`Type "DELETE" to confirm deletion of ${email}:`);
        if (confirmation !== 'DELETE') {
            showAlert('Deletion cancelled', 'error');
            return;
        }
        
        try {
            // Delete from users table (this will cascade to other tables if FK constraints are set)
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('uid', userId);
            
            if (error) throw error;
            
            showAlert('User deleted successfully', 'success');
            closeModal();
            loadUsers();
            loadStatistics();
            
        } catch (error) {
            console.error('Error deleting user:', error);
            showAlert('Error deleting user. Please check if user has related data.', 'error');
        }
    };

    /**
     * Close modal
     */
    window.closeModal = function() {
        document.getElementById('userModal').classList.add('hidden');
    };

    /**
     * Open Add Admin Modal
     */
    function openAddAdminModal() {
        document.getElementById('addAdminModal').classList.remove('hidden');
        // Clear previous inputs
        document.getElementById('newAdminEmail').value = '';
        document.getElementById('newAdminPassword').value = '';
        document.getElementById('newAdminName').value = '';
        document.getElementById('newAdminDept').value = 'IT Administration';
        document.getElementById('newAdminRole').value = 'admin';
        document.getElementById('addAdminAlert').innerHTML = '';
    }

    /**
     * Close Add Admin Modal
     */
    window.closeAddAdminModal = function() {
        document.getElementById('addAdminModal').classList.add('hidden');
    };

    /**
     * Create new admin (Super Admin only)
     */
    window.createAdmin = async function() {
        const email = document.getElementById('newAdminEmail').value.trim();
        const password = document.getElementById('newAdminPassword').value;
        const fullName = document.getElementById('newAdminName').value.trim();
        const department = document.getElementById('newAdminDept').value.trim();
        const role = document.getElementById('newAdminRole').value;
        
        // Validation
        if (!email || !password || !fullName) {
            showAddAdminAlert('Please fill in all required fields', 'error');
            return;
        }
        
        if (password.length < 6) {
            showAddAdminAlert('Password must be at least 6 characters', 'error');
            return;
        }
        
        const createBtn = document.getElementById('createAdminBtn');
        createBtn.disabled = true;
        createBtn.textContent = 'Creating...';
        
        try {
            // Note: This requires Supabase Admin API or service role key
            // For now, we'll just create the records directly
            // In production, you should use Supabase Admin API to create auth users
            
            // Generate a user ID (in real scenario, this would come from Supabase Auth)
            const userId = 'manual-' + Date.now() + '-' + Math.random().toString(36).substring(7);
            
            // Insert into users table
            const { error: userError } = await supabase
                .from('users')
                .insert({
                    uid: userId,
                    email: email,
                    role: role,
                    created_at: new Date().toISOString()
                });
            
            if (userError) throw userError;
            
            // Insert into admin_info table
            const staffId = 'ADMIN' + Date.now().toString().slice(-6);
            const { error: adminError } = await supabase
                .from('admin_info')
                .insert({
                    user_uid: userId,
                    staff_id: staffId,
                    full_name: fullName,
                    department: department || 'IT Administration'
                });
            
            if (adminError) throw adminError;
            
            showAddAdminAlert('Admin created successfully! Note: They need to use "Forgot Password" to set their password.', 'success');
            
            setTimeout(() => {
                closeAddAdminModal();
                loadUsers();
                loadStatistics();
            }, 2000);
            
        } catch (error) {
            console.error('Error creating admin:', error);
            showAddAdminAlert('Error: ' + error.message, 'error');
            createBtn.disabled = false;
            createBtn.textContent = 'Create Admin';
        }
    };

    /**
     * Show alert in Add Admin modal
     */
    function showAddAdminAlert(message, type = 'error') {
        const alertClass = type === 'error' ? 'alert-error' : 'alert-success';
        const alertHTML = `
            <div class="alert ${alertClass}" style="margin-bottom: 16px;">
                <span>${message}</span>
            </div>
        `;
        document.getElementById('addAdminAlert').innerHTML = alertHTML;
    }

    /**
     * Show alert message
     */
    function showAlert(message, type = 'error') {
        const alertClass = type === 'error' ? 'alert-error' : 'alert-success';
        const alertHTML = `
            <div class="alert ${alertClass}">
                <span>${message}</span>
            </div>
        `;
        document.getElementById('alertContainer').innerHTML = alertHTML;
        
        setTimeout(() => {
            document.getElementById('alertContainer').innerHTML = '';
        }, 5000);
    }
});