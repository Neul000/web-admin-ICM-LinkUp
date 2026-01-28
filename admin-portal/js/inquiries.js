/**
 * Inquiries Page Logic
 * Displays and manages mentorship inquiries
 */

document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;
    let currentFilter = 'all';
    let allInquiriesData = [];
    
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
    await loadInquiries();
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

        document.getElementById('filterAll').addEventListener('click', () => {
            currentFilter = 'all';
            updateFilterButtons('filterAll');
            renderInquiries(allInquiriesData);
        });

        document.getElementById('filterPending').addEventListener('click', () => {
            currentFilter = 'pending';
            updateFilterButtons('filterPending');
            const filtered = allInquiriesData.filter(i => i.status === 'pending');
            renderInquiries(filtered);
        });

        document.getElementById('filterAccepted').addEventListener('click', () => {
            currentFilter = 'accepted';
            updateFilterButtons('filterAccepted');
            const filtered = allInquiriesData.filter(i => i.status === 'accepted');
            renderInquiries(filtered);
        });

        document.getElementById('filterDeclined').addEventListener('click', () => {
            currentFilter = 'declined';
            updateFilterButtons('filterDeclined');
            const filtered = allInquiriesData.filter(i => i.status === 'declined');
            renderInquiries(filtered);
        });

        document.getElementById('filterCompleted').addEventListener('click', () => {
            currentFilter = 'completed';
            updateFilterButtons('filterCompleted');
            const filtered = allInquiriesData.filter(i => i.status === 'completed');
            renderInquiries(filtered);
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            let filtered = currentFilter === 'all' ? allInquiriesData : 
                          allInquiriesData.filter(i => i.status === currentFilter);
            
            filtered = filtered.filter(i => 
                i.student_name.toLowerCase().includes(searchTerm) ||
                i.alumni_name.toLowerCase().includes(searchTerm) ||
                i.subject_area.toLowerCase().includes(searchTerm)
            );
            
            renderInquiries(filtered);
        });
    }

    /**
     * Update filter button states
     */
    function updateFilterButtons(activeBtn) {
        ['filterAll', 'filterPending', 'filterAccepted', 'filterDeclined', 'filterCompleted'].forEach(id => {
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
            // Total inquiries
            const { count: totalCount } = await supabase
                .from('inquiries')
                .select('*', { count: 'exact', head: true });
            
            document.getElementById('totalInquiries').textContent = totalCount || 0;
            document.getElementById('allCount').textContent = totalCount || 0;

            // Pending
            const { count: pendingCount } = await supabase
                .from('inquiries')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');
            
            document.getElementById('statPending').textContent = pendingCount || 0;
            document.getElementById('pendingCount').textContent = pendingCount || 0;

            // Accepted
            const { count: acceptedCount } = await supabase
                .from('inquiries')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'accepted');
            
            document.getElementById('statAccepted').textContent = acceptedCount || 0;
            document.getElementById('acceptedCount').textContent = acceptedCount || 0;

            // Declined
            const { count: declinedCount } = await supabase
                .from('inquiries')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'declined');
            
            document.getElementById('declinedCount').textContent = declinedCount || 0;

            // Completed
            const { count: completedCount } = await supabase
                .from('inquiries')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completed');
            
            document.getElementById('statCompleted').textContent = completedCount || 0;
            document.getElementById('completedCount').textContent = completedCount || 0;

        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    /**
     * Load all inquiries
     */
    async function loadInquiries() {
        try {
            const { data, error } = await supabase
                .from('inquiries')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log('Raw inquiries data:', data);

            // Fetch student and alumni names separately for each inquiry
            const enrichedData = [];
            
            for (const inquiry of data) {
                let studentName = 'Unknown Student';
                let alumniName = 'Unknown Alumni';

                // Fetch student name
                if (inquiry.student_uid) {
                    try {
                        const { data: studentData, error: studentError } = await supabase
                            .from('student_info')
                            .select('full_name')
                            .eq('user_uid', inquiry.student_uid)
                            .maybeSingle();
                        
                        if (!studentError && studentData) {
                            studentName = studentData.full_name || 'Unknown Student';
                        }
                    } catch (err) {
                        console.log('Error fetching student:', err);
                    }
                }

                // Fetch alumni name
                if (inquiry.alumni_uid) {
                    try {
                        const { data: alumniData, error: alumniError } = await supabase
                            .from('alumni_profile')
                            .select('full_name')
                            .eq('user_uid', inquiry.alumni_uid)
                            .maybeSingle();
                        
                        if (!alumniError && alumniData) {
                            alumniName = alumniData.full_name || 'Unknown Alumni';
                        }
                    } catch (err) {
                        console.log('Error fetching alumni:', err);
                    }
                }

                enrichedData.push({
                    ...inquiry,
                    student_name: studentName,
                    alumni_name: alumniName
                });
            }

            allInquiriesData = enrichedData;
            console.log('Enriched inquiries data:', allInquiriesData);
            renderInquiries(allInquiriesData);

        } catch (error) {
            console.error('Error loading inquiries:', error);
            showAlert('Error loading inquiries data', 'error');
        }
    }

    /**
     * Render inquiries table
     */
    function renderInquiries(data) {
        const tbody = document.getElementById('inquiriesTableBody');

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No inquiries found</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(inquiry => {
            const statusBadge = getStatusBadge(inquiry.status);
            const date = new Date(inquiry.created_at).toLocaleDateString('en-MY', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            return `
                <tr>
                    <td>${inquiry.student_name}</td>
                    <td>${inquiry.alumni_name}</td>
                    <td>${inquiry.subject_area}</td>
                    <td>${statusBadge}</td>
                    <td>${date}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewInquiry('${inquiry.inquiry_id}')">View</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Get status badge HTML
     */
    function getStatusBadge(status) {
        switch(status) {
            case 'pending':
                return '<span class="badge badge-warning">Pending</span>';
            case 'accepted':
                return '<span class="badge badge-success">Accepted</span>';
            case 'declined':
                return '<span class="badge badge-danger">Declined</span>';
            case 'completed':
                return '<span class="badge badge-info">Completed</span>';
            default:
                return '<span class="badge">Unknown</span>';
        }
    }

    /**
     * View inquiry details
     */
    window.viewInquiry = async function(inquiryId) {
        try {
            console.log('Loading inquiry:', inquiryId);
            
            const { data: inquiry, error } = await supabase
                .from('inquiries')
                .select('*')
                .eq('inquiry_id', inquiryId)
                .maybeSingle();

            if (error) throw error;
            if (!inquiry) {
                showAlert('Inquiry not found', 'error');
                return;
            }

            console.log('Inquiry detail:', inquiry);

            // Fetch student info
            let studentName = 'Unknown Student';
            let studentEmail = 'N/A';
            let studentId = 'N/A';
            let studentCourse = 'N/A';

            if (inquiry.student_uid) {
                try {
                    const { data: studentInfo, error: studentError } = await supabase
                        .from('student_info')
                        .select('full_name, student_id, course_code, user_uid')
                        .eq('user_uid', inquiry.student_uid)
                        .maybeSingle();
                    
                    if (!studentError && studentInfo) {
                        studentName = studentInfo.full_name || 'Unknown Student';
                        studentId = studentInfo.student_id || 'N/A';
                        studentCourse = studentInfo.course_code || 'N/A';

                        // Fetch student email from users table
                        const { data: studentUser, error: userError } = await supabase
                            .from('users')
                            .select('email')
                            .eq('uid', inquiry.student_uid)
                            .maybeSingle();
                        
                        if (!userError && studentUser) {
                            studentEmail = studentUser.email;
                        }
                    }
                } catch (err) {
                    console.log('Error fetching student info:', err);
                }
            }

            // Fetch alumni info
            let alumniName = 'Unknown Alumni';
            let alumniEmail = 'N/A';
            let alumniCourse = 'N/A';
            let alumniGrad = 'N/A';

            if (inquiry.alumni_uid) {
                try {
                    const { data: alumniInfo, error: alumniError } = await supabase
                        .from('alumni_profile')
                        .select('full_name, course_code, graduation_year, user_uid')
                        .eq('user_uid', inquiry.alumni_uid)
                        .maybeSingle();
                    
                    if (!alumniError && alumniInfo) {
                        alumniName = alumniInfo.full_name || 'Unknown Alumni';
                        alumniCourse = alumniInfo.course_code || 'N/A';
                        alumniGrad = alumniInfo.graduation_year || 'N/A';

                        // Fetch alumni email from users table
                        const { data: alumniUser, error: userError } = await supabase
                            .from('users')
                            .select('email')
                            .eq('uid', inquiry.alumni_uid)
                            .maybeSingle();
                        
                        if (!userError && alumniUser) {
                            alumniEmail = alumniUser.email;
                        }
                    }
                } catch (err) {
                    console.log('Error fetching alumni info:', err);
                }
            }

            const modalBody = `
                <div style="margin-bottom: 24px;">
                    <h3 style="margin-bottom: 12px; color: var(--primary-color);">Student Information</h3>
                    <div class="inquiry-detail">
                        <div class="inquiry-detail-label">Name</div>
                        <div class="inquiry-detail-value">${studentName}</div>
                    </div>
                    <div class="inquiry-detail">
                        <div class="inquiry-detail-label">Email</div>
                        <div class="inquiry-detail-value">${studentEmail}</div>
                    </div>
                    <div class="inquiry-detail">
                        <div class="inquiry-detail-label">Student ID</div>
                        <div class="inquiry-detail-value">${studentId}</div>
                    </div>
                    <div class="inquiry-detail">
                        <div class="inquiry-detail-label">Course</div>
                        <div class="inquiry-detail-value">${studentCourse}</div>
                    </div>
                </div>

                <div style="margin-bottom: 24px;">
                    <h3 style="margin-bottom: 12px; color: var(--success-color);">Alumni Information</h3>
                    <div class="inquiry-detail">
                        <div class="inquiry-detail-label">Name</div>
                        <div class="inquiry-detail-value">${alumniName}</div>
                    </div>
                    <div class="inquiry-detail">
                        <div class="inquiry-detail-label">Email</div>
                        <div class="inquiry-detail-value">${alumniEmail}</div>
                    </div>
                    <div class="inquiry-detail">
                        <div class="inquiry-detail-label">Course</div>
                        <div class="inquiry-detail-value">${alumniCourse}</div>
                    </div>
                    <div class="inquiry-detail">
                        <div class="inquiry-detail-label">Graduation Year</div>
                        <div class="inquiry-detail-value">${alumniGrad}</div>
                    </div>
                </div>

                <div style="margin-bottom: 24px;">
                    <h3 style="margin-bottom: 12px;">Inquiry Details</h3>
                    <div class="inquiry-detail">
                        <div class="inquiry-detail-label">Subject Area</div>
                        <div class="inquiry-detail-value">${inquiry.subject_area}</div>
                    </div>
                    <div class="inquiry-detail">
                        <div class="inquiry-detail-label">Message</div>
                        <div class="inquiry-detail-value">${inquiry.message || 'No message provided'}</div>
                    </div>
                    <div class="inquiry-detail">
                        <div class="inquiry-detail-label">Status</div>
                        <div class="inquiry-detail-value">${getStatusBadge(inquiry.status)}</div>
                    </div>
                    <div class="inquiry-detail">
                        <div class="inquiry-detail-label">Created At</div>
                        <div class="inquiry-detail-value">${new Date(inquiry.created_at).toLocaleString('en-MY')}</div>
                    </div>
                    ${inquiry.updated_at ? `
                    <div class="inquiry-detail">
                        <div class="inquiry-detail-label">Last Updated</div>
                        <div class="inquiry-detail-value">${new Date(inquiry.updated_at).toLocaleString('en-MY')}</div>
                    </div>
                    ` : ''}
                </div>
            `;

            document.getElementById('modalTitle').textContent = `Inquiry #${inquiry.inquiry_id}`;
            document.getElementById('modalBody').innerHTML = modalBody;
            document.getElementById('inquiryModal').classList.remove('hidden');

        } catch (error) {
            console.error('Error loading inquiry details:', error);
            showAlert('Error loading inquiry details', 'error');
        }
    };

    /**
     * Close modal
     */
    window.closeModal = function() {
        document.getElementById('inquiryModal').classList.add('hidden');
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