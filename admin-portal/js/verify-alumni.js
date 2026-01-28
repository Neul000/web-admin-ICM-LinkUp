/**
 * Verify Alumni Page Logic
 * Handles alumni verification workflow
 */

document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;
    let currentFilter = 'pending';
    
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
    await loadAlumni(currentFilter);
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

        document.getElementById('filterPending').addEventListener('click', () => {
            currentFilter = 'pending';
            updateFilterButtons('filterPending');
            loadAlumni('pending');
        });

        document.getElementById('filterVerified').addEventListener('click', () => {
            currentFilter = 'verified';
            updateFilterButtons('filterVerified');
            loadAlumni('verified');
        });

        document.getElementById('filterAll').addEventListener('click', () => {
            currentFilter = 'all';
            updateFilterButtons('filterAll');
            loadAlumni('all');
        });
    }

    /**
     * Update filter button states
     */
    function updateFilterButtons(activeBtn) {
        ['filterPending', 'filterVerified', 'filterAll'].forEach(id => {
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
     * Load alumni based on filter
     */
    async function loadAlumni(filter) {
        try {
            let query = supabase
                .from('alumni_profile')
                .select(`
                    *,
                    users!alumni_profile_user_uid_fkey (email)
                `)
                .order('created_at', { ascending: false });

            if (filter === 'pending') {
                query = query.eq('is_verified', false);
            } else if (filter === 'verified') {
                query = query.eq('is_verified', true);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Update counts
            const pendingCount = await getCount('is_verified', false);
            const verifiedCount = await getCount('is_verified', true);
            
            document.getElementById('pendingCount').textContent = pendingCount;
            document.getElementById('verifiedCount').textContent = verifiedCount;

            renderAlumniTable(data);

        } catch (error) {
            console.error('Error loading alumni:', error);
            showAlert('Error loading alumni data', 'error');
        }
    }

    /**
     * Get count of alumni by criteria
     */
    async function getCount(field, value) {
        const { count } = await supabase
            .from('alumni_profile')
            .select('*', { count: 'exact', head: true })
            .eq(field, value);
        return count || 0;
    }

    /**
     * Render alumni table
     */
    function renderAlumniTable(data) {
        const tbody = document.getElementById('alumniTableBody');

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No alumni found</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(alumni => {
            const statusBadge = alumni.is_verified
                ? '<span class="badge badge-success">Verified</span>'
                : '<span class="badge badge-warning">Pending</span>';

            const actions = alumni.is_verified
                ? `
                    <button class="btn btn-sm btn-secondary" onclick="viewAlumni('${alumni.id}')">View</button>
                `
                : `
                    <button class="btn btn-sm btn-primary" onclick="viewAlumni('${alumni.id}')">Review</button>
                `;

            return `
                <tr>
                    <td>${alumni.full_name}</td>
                    <td>${alumni.users?.email || 'N/A'}</td>
                    <td>${alumni.course_code || 'N/A'}</td>
                    <td>${alumni.graduation_year || 'N/A'}</td>
                    <td>${alumni.capstone_title ? alumni.capstone_title.substring(0, 40) + '...' : 'N/A'}</td>
                    <td>${statusBadge}</td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');
    }

    /**
     * View alumni details in modal
     */
    window.viewAlumni = async function(alumniId) {
        try {
            const { data, error } = await supabase
                .from('alumni_profile')
                .select(`
                    *,
                    users!alumni_profile_user_uid_fkey (email)
                `)
                .eq('id', alumniId)
                .single();

            if (error) throw error;

            displayAlumniModal(data);

        } catch (error) {
            console.error('Error loading alumni details:', error);
            showAlert('Error loading alumni details', 'error');
        }
    };

    /**
     * Display alumni in modal
     */
    function displayAlumniModal(alumni) {
        document.getElementById('modalTitle').textContent = alumni.full_name;

        // Build modal body
        let modalHTML = `
            <div class="profile-section">
                <h3>Personal Information</h3>
                <div class="profile-field">
                    <div class="profile-label">Email</div>
                    <div class="profile-value">${alumni.users?.email || 'N/A'}</div>
                </div>
            </div>

            <div class="profile-section">
                <h3>Academic Information</h3>
                <div class="profile-field">
                    <div class="profile-label">Course Code</div>
                    <div class="profile-value">${alumni.course_code || 'N/A'}</div>
                </div>
                <div class="profile-field">
                    <div class="profile-label">Graduation Year</div>
                    <div class="profile-value">${alumni.graduation_year || 'N/A'}</div>
                </div>
                <div class="profile-field">
                    <div class="profile-label">CGPA</div>
                    <div class="profile-value">${alumni.cgpa || 'N/A'}</div>
                </div>
            </div>

            <div class="profile-section">
                <h3>Capstone Project</h3>
                <div class="profile-field">
                    <div class="profile-label">Title</div>
                    <div class="profile-value">${alumni.capstone_title || 'N/A'}</div>
                </div>
                <div class="profile-field">
                    <div class="profile-label">Description</div>
                    <div class="profile-value">${alumni.capstone_description || 'N/A'}</div>
                </div>
                <div class="profile-field">
                    <div class="profile-label">Supervisor</div>
                    <div class="profile-value">${alumni.capstone_supervisor || 'N/A'}</div>
                </div>
            </div>

            <div class="profile-section">
                <h3>Career & Experience</h3>
                <div class="profile-field">
                    <div class="profile-label">Career Timeline</div>
                    <div class="profile-value">
                        ${renderCareerTimeline(alumni.career_timeline)}
                    </div>
                </div>
                <div class="profile-field">
                    <div class="profile-label">Internship History</div>
                    <div class="profile-value">
                        ${renderInternships(alumni.internship_history)}
                    </div>
                </div>
            </div>

            <div class="profile-section">
                <h3>Skills & Expertise</h3>
                <div class="profile-field">
                    <div class="profile-label">Skills</div>
                    <div class="skills-list">
                        ${renderSkills(alumni.skills)}
                    </div>
                </div>
                <div class="profile-field">
                    <div class="profile-label">Expertise Areas</div>
                    <div class="skills-list">
                        ${renderSkills(alumni.expertise_areas)}
                    </div>
                </div>
            </div>

            ${alumni.bio ? `
            <div class="profile-section">
                <h3>Bio</h3>
                <div class="profile-value">${alumni.bio}</div>
            </div>
            ` : ''}
        `;

        document.getElementById('modalBody').innerHTML = modalHTML;

        // Set modal actions
        const actionsDiv = document.getElementById('modalActions');
        if (!alumni.is_verified) {
            actionsDiv.innerHTML = `
                <button class="btn btn-success" onclick="verifyAlumni(${alumni.id})">
                    ✓ Verify Alumni
                </button>
            `;
        } else {
            actionsDiv.innerHTML = `
                <button class="btn btn-danger" onclick="unverifyAlumni(${alumni.id})">
                    Revoke Verification
                </button>
            `;
        }

        // Show modal
        document.getElementById('alumniModal').classList.remove('hidden');
    }

    /**
     * Render career timeline
     */
    function renderCareerTimeline(timeline) {
        if (!timeline || timeline.length === 0) return 'No career information';
        
        return timeline.map(job => `
            <div style="margin-bottom: 12px; padding: 12px; background: var(--background); border-radius: 8px;">
                <strong>${job.position}</strong> at ${job.company}<br>
                <small style="color: var(--text-secondary);">
                    ${job.start_date} - ${job.end_date || 'Present'}
                </small>
                ${job.description ? `<p style="margin-top: 8px; margin-bottom: 0;">${job.description}</p>` : ''}
            </div>
        `).join('');
    }

    /**
     * Render internships
     */
    function renderInternships(internships) {
        if (!internships || internships.length === 0) return 'No internship information';
        
        return internships.map(intern => `
            <div style="margin-bottom: 12px; padding: 12px; background: var(--background); border-radius: 8px;">
                <strong>${intern.position}</strong> at ${intern.company}<br>
                <small style="color: var(--text-secondary);">
                    ${intern.duration} • ${intern.year}
                </small>
                ${intern.description ? `<p style="margin-top: 8px; margin-bottom: 0;">${intern.description}</p>` : ''}
            </div>
        `).join('');
    }

    /**
     * Render skills
     */
    function renderSkills(skills) {
        if (!skills || skills.length === 0) return '<span>None specified</span>';
        return skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('');
    }

    /**
     * Close modal
     */
    window.closeModal = function() {
        document.getElementById('alumniModal').classList.add('hidden');
    };

    /**
     * Verify alumni
     */
    window.verifyAlumni = async function(alumniId) {
        if (!confirm('Are you sure you want to verify this alumni?')) return;

        try {
            const { error } = await supabase
                .from('alumni_profile')
                .update({ is_verified: true })
                .eq('id', alumniId);

            if (error) throw error;

            showAlert('Alumni verified successfully!', 'success');
            closeModal();
            loadAlumni(currentFilter);

        } catch (error) {
            console.error('Error verifying alumni:', error);
            showAlert('Error verifying alumni', 'error');
        }
    };

    /**
     * Unverify alumni
     */
    window.unverifyAlumni = async function(alumniId) {
        if (!confirm('Are you sure you want to revoke verification for this alumni?')) return;

        try {
            const { error } = await supabase
                .from('alumni_profile')
                .update({ is_verified: false })
                .eq('id', alumniId);

            if (error) throw error;

            showAlert('Verification revoked successfully', 'success');
            closeModal();
            loadAlumni(currentFilter);

        } catch (error) {
            console.error('Error revoking verification:', error);
            showAlert('Error revoking verification', 'error');
        }
    };

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