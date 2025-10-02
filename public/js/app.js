const API_URL = 'http://localhost:3000/api'; 

let loggedInUser = null;
let authToken = null;
let currentOrderData = {}; 
let loadedOrdersCache = {}; 


// --- UTILITAS GLOBAL ---

function formatRupiah(number) {
    if (isNaN(number) || number === null) return 'Rp 0';
    return 'Rp ' + parseFloat(number).toLocaleString('id-ID');
}

function loadStoredState() {
    try {
        const storedToken = sessionStorage.getItem('authToken');
        const storedUser = sessionStorage.getItem('loggedInUser');
        
        if (storedToken && storedUser) {
            authToken = storedToken;
            loggedInUser = JSON.parse(storedUser);
            return true;
        }
    } catch (error) {
        console.error('Error loading stored state:', error);
        clearStoredState();
    }
    return false;
}

function saveStateToStorage() {
    try {
        if (authToken && loggedInUser) {
            sessionStorage.setItem('authToken', authToken);
            sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
        }
    } catch (error) {
        console.error('Error saving state:', error);
    }
}

function clearStoredState() {
    authToken = null;
    loggedInUser = null;
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('loggedInUser');
}

function setAuthState(token, user) {
    authToken = token;
    loggedInUser = user;
    saveStateToStorage();
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; 
        modal.classList.add('modal-backdrop');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = ''; 
        modal.classList.remove('modal-backdrop');
    }
}

function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer'); 
    if (!alertContainer) {
        console.error("Elemen dengan ID 'alertContainer' tidak ditemukan.");
        return;
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} fade-in-up`;
    alertDiv.textContent = message;
    alertContainer.prepend(alertDiv); 
    
    setTimeout(() => {
        alertDiv.classList.remove('fade-in-up');
        alertDiv.classList.add('fade-out');
        alertDiv.addEventListener('transitionend', () => alertDiv.remove(), { once: true });
        setTimeout(() => {
             if (alertDiv && alertDiv.parentNode) {
                 alertDiv.remove();
             }
        }, 500);
    }, 3000);
}

function showLoading() {
    document.body.classList.add('loading-state');
    let spinner = document.getElementById('loadingSpinner');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'loadingSpinner';
        spinner.className = 'spinner';
        document.body.appendChild(spinner);
    }
}

function hideLoading() {
    document.body.classList.remove('loading-state');
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.remove();
    }
}

function showLogin() {
    closeModal('registerModal');
    document.getElementById('loginForm')?.reset();
    document.getElementById('loginModal')?.querySelector('.modal-title').focus();
    clearValidationErrors();
    showModal('loginModal');
}

function showRegister() {
    closeModal('loginModal');
    document.getElementById('registerForm')?.reset();
    document.getElementById('registerModal')?.querySelector('.modal-title').focus();
    clearValidationErrors();
    showModal('registerModal');
}

function validateInput(inputId, message) {
    const input = document.getElementById(inputId);
    if (!input || input.value.trim() === '' || (input.tagName === 'SELECT' && input.value === '')) {
        input?.classList.add('is-invalid');
        const errorElement = input?.closest('.form-group')?.querySelector('.error-message');
        if (errorElement) errorElement.textContent = message;
        return false;
    }
    input.classList.remove('is-invalid');
    const errorElement = input?.closest('.form-group')?.querySelector('.error-message');
    if (errorElement) errorElement.textContent = '';
    return true;
}

function validateEmailFormat(inputId) {
    const input = document.getElementById(inputId);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!input || !emailRegex.test(input.value.trim())) {
        input?.classList.add('is-invalid');
        const errorElement = input?.closest('.form-group')?.querySelector('.error-message');
        if (errorElement) errorElement.textContent = 'Format email tidak valid.';
        return false;
    }
    input.classList.remove('is-invalid');
    const errorElement = input?.closest('.form-group')?.querySelector('.error-message');
    if (errorElement) errorElement.textContent = '';
    return true;
}

function validatePasswordLength(inputId, minLength) {
    const input = document.getElementById(inputId);
    
    if (!input || input.value.trim().length < minLength) {
        input?.classList.add('is-invalid');
        const errorElement = input?.closest('.form-group')?.querySelector('.error-message');
        if (errorElement) errorElement.textContent = `Password minimal ${minLength} karakter.`;
        return false;
    }
    input.classList.remove('is-invalid');
    const errorElement = input?.closest('.form-group')?.querySelector('.error-message');
    if (errorElement) errorElement.textContent = '';
    return true;
}

function clearValidationErrors() {
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
}

// --- AUTENTIKASI DAN LOGIKA AKUN (Dipotong untuk fokus pada tampilan) ---

async function register(event) {
    event.preventDefault();
    clearValidationErrors();
    const isUsernameValid = validateInput('registerUsername', 'Username wajib diisi.');
    const isEmailValid = validateInput('registerEmail', 'Email wajib diisi.') && validateEmailFormat('registerEmail');
    const isPasswordValid = validateInput('registerPassword', 'Password wajib diisi.') && validatePasswordLength('registerPassword', 6);
    if (!isUsernameValid || !isEmailValid || !isPasswordValid) {
        showAlert('Harap periksa kembali detail pendaftaran Anda.', 'danger');
        return;
    }
    showLoading();
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: document.getElementById('registerUsername').value.trim(),
                email: document.getElementById('registerEmail').value.trim(),
                password: document.getElementById('registerPassword').value.trim()
            })
        });
        const data = await response.json();
        if (response.ok) {
            showAlert(data.message + ' Silakan login.', 'success');
            closeModal('registerModal');
            showLogin();
        } else {
            showAlert('Pendaftaran gagal: ' + (data.error || 'Terjadi kesalahan.'), 'danger');
        }
    } catch (error) {
        showAlert('Terjadi kesalahan server saat pendaftaran. Coba lagi nanti.', 'danger');
        console.error('Error:', error);
    } finally {
        hideLoading();
    }
}

async function login(event) {
    event.preventDefault();
    clearValidationErrors();
    const isEmailValid = validateInput('loginEmail', 'Email wajib diisi.');
    const isPasswordValid = validateInput('loginPassword', 'Password wajib diisi.');
    if (!isEmailValid || !isPasswordValid) {
        showAlert('Harap periksa kembali email dan password Anda.', 'danger');
        return;
    }
    showLoading();
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('loginEmail').value.trim(),
                password: document.getElementById('loginPassword').value.trim()
            })
        });
        const data = await response.json();
        if (response.ok) {
            setAuthState(data.token, data.user);
            showAlert(`Login berhasil! Selamat datang, ${data.user.username}.`, 'success');
            closeModal('loginModal');
            if (data.user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                updateUI();
            }
        } else {
            showAlert('Login gagal. Periksa kembali email dan password Anda.', 'danger');
        }
    } catch (error) {
        showAlert('Terjadi kesalahan server saat login.', 'danger');
        console.error('Error:', error);
    } finally {
        hideLoading();
    }
}

function logout() {
    clearStoredState();
    showAlert('Anda telah log out.', 'success');
    document.cookie = 'connect.sid=; Max-Age=-99999999;'; 
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 500);
}

async function saveProfile(event) {
    event.preventDefault();
    if (!loggedInUser || !authToken) return;

    clearValidationErrors();
    const username = document.getElementById('editUsername').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const newPassword = document.getElementById('editNewPassword').value.trim();
    
    // Validasi
    const isUsernameValid = validateInput('editUsername', 'Username wajib diisi.');
    const isEmailValid = validateInput('editEmail', 'Email wajib diisi.') && validateEmailFormat('editEmail');

    if (!isUsernameValid || !isEmailValid) {
        showAlert('Harap periksa kembali detail yang ingin Anda ubah.', 'danger');
        return;
    }
    if (newPassword && newPassword.length < 6) {
        showAlert('Password baru minimal 6 karakter.', 'danger');
        return;
    }

    const payload = {
        username,
        email,
    };

    if (newPassword) {
        payload.password = newPassword;
    }

    showLoading();
    try {
        const response = await fetch(`${API_URL}/profile`, { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(payload)
        });

        if (response.status === 401) { 
            clearStoredState();
            showAlert('Session expired. Silakan login kembali.', 'danger');
            updateUI();
            return;
        }

        const data = await response.json();
        if (response.ok) {
            // Update local state dan storage
            loggedInUser = data.user;
            saveStateToStorage();
            
            showAlert('Profil berhasil diperbarui.', 'success');
            closeModal('profileEditModal');
            updateUI(); 
            showModal('profileModal'); 
        } else {
            showAlert('Gagal memperbarui profil: ' + (data.error || 'Terjadi kesalahan.'), 'danger');
        }

    } catch (error) {
        showAlert('Terjadi kesalahan server saat menyimpan profil.', 'danger');
        console.error('Error saving profile:', error);
    } finally {
        hideLoading();
    }
}

function showProfileEditModal() {
    if (!loggedInUser) return;
    
    closeModal('profileModal');
    clearValidationErrors();

    document.getElementById('editUsername').value = loggedInUser.username;
    document.getElementById('editEmail').value = loggedInUser.email;
    document.getElementById('editNewPassword').value = '';
    
    showModal('profileEditModal');
}


// --- RIWAYAT PESANAN (DASHBOARD) ---

// FUNGSI BARU: Hapus Pesanan Pengguna
async function deleteUserOrder(orderId) {
    if (!loggedInUser || !authToken) return;

    if (!confirm(`Apakah Anda yakin ingin menghapus Riwayat Pesanan #${orderId}? Tindakan ini tidak dapat dibatalkan.`)) {
        return;
    }

    showLoading();
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.status === 401) { clearStoredState(); showAlert('Session expired. Silakan login kembali.', 'danger'); updateUI(); return; }

        if (response.ok) {
            showAlert(`Pesanan #${orderId} berhasil dihapus dari riwayat.`, 'success');
            delete loadedOrdersCache[orderId]; 
            const currentFilter = document.getElementById('orderFilterSelect')?.value || 'all';
            filterAndRenderOrders(Object.values(loadedOrdersCache), currentFilter);
        } else {
            const data = await response.json();
            showAlert('Gagal menghapus pesanan: ' + (data.error || 'Terjadi kesalahan.'), 'danger');
        }
    } catch (error) {
        showAlert('Terjadi kesalahan server saat menghapus pesanan.', 'danger');
        console.error('Error deleting user order:', error);
    } finally {
        hideLoading();
    }
}
window.deleteUserOrder = deleteUserOrder; 

// FUNGSI TAMPILAN BARU: Menampilkan dan Memfilter Pesanan
function filterAndRenderOrders(userOrders, filterStatus) {
    const ordersContainer = document.getElementById('ordersContainer');
    if (!ordersContainer) return;

    // 1. Tambahkan/Pertahankan Kontrol Filter
    if (!document.getElementById('orderFilterSelect')) {
        // Tata Letak Kontrol Filter Baru (dibuat hanya sekali)
        const filterHtml = `
            <div class="filter-bar flex-between" style="padding: 10px 0; margin-bottom: 15px; border-bottom: 2px solid var(--color-primary);">
                <h3 class="section-title" style="font-size: 1.2rem; margin: 0; color: var(--color-primary);"><i class="fas fa-history"></i> Riwayat Pesanan Anda</h3>
                <select id="orderFilterSelect" class="form-select" style="width: 160px; font-size: 0.95rem; border-radius: 8px;" onchange="window.filterOrdersByStatus(this.value)">
                    <option value="all">Semua Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Diproses</option>
                    <option value="completed">Selesai</option>
                    <option value="cancelled">Dibatalkan</option>
                </select>
            </div>
            <div id="ordersList" style="display: flex; flex-direction: column; gap: 15px;"></div>
        `;
        ordersContainer.innerHTML = filterHtml;
        document.getElementById('orderFilterSelect').value = filterStatus; // Set nilai filter awal
    } else {
        document.getElementById('orderFilterSelect').value = filterStatus;
    }


    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;
    ordersList.innerHTML = '';

    // Lakukan Filtering
    const filtered = userOrders.filter(order => filterStatus === 'all' || order.status === filterStatus);

    if (filtered.length === 0) {
        ordersList.innerHTML = `<p class="text-center muted mt-3" style="padding: 20px; border: 1px dashed #ccc; border-radius: 8px;">Tidak ada pesanan dengan status "${filterStatus === 'all' ? 'apapun' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}".</p>`;
    } else {
        filtered.forEach(order => {
            const isCompletedOrCancelled = order.status === 'completed' || order.status === 'cancelled';
            const statusClass = `status-${order.status.toLowerCase().replace(' ', '-')}`;
            
            // Tombol Hapus: Hanya jika Completed/Cancelled
            const deleteButton = isCompletedOrCancelled ?
                `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); window.deleteUserOrder(${order.id})" title="Hapus riwayat pesanan ini">
                    <i class="fas fa-trash"></i> Hapus
                </button>` : '';

            const orderElement = document.createElement('div');
            orderElement.className = 'order-card pointer fade-in-up'; 
            orderElement.style.cssText = `
                border: 1px solid #ddd; 
                border-radius: 10px; 
                padding: 15px; 
                box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                transition: transform 0.2s;
                background-color: white;
            `;
            orderElement.onmouseover = (e) => e.currentTarget.style.transform = 'translateY(-2px)';
            orderElement.onmouseout = (e) => e.currentTarget.style.transform = 'translateY(0)';
            orderElement.onclick = () => window.showOrderDetailModalFromCache(order.id, false);

            orderElement.innerHTML = `
                <div class="flex-between" style="align-items: center; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px;">
                    <div style="flex: 1;">
                        <p class="order-id font-bold text-primary" style="font-size: 1.1rem; margin: 0;">#${order.id}</p>
                        <span class="order-status ${statusClass}" style="font-size: 0.85rem; padding: 3px 8px; border-radius: 4px; font-weight: 600;">${order.status.toUpperCase()}</span>
                    </div>
                    <div class="text-right">
                         <p class="text-sm muted" style="margin: 0;"><i class="fas fa-calendar-alt"></i> ${new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>

                <div class="flex-between mt-3" style="align-items: flex-end;">
                    <div>
                        <p class="text-xl font-bold text-danger" style="margin-bottom: 5px; font-size: 1.4rem;">${formatRupiah(order.totalAmount)}</p>
                        <p class="text-xs muted" style="margin: 0;"><i class="fas fa-map-marker-alt"></i> Kirim ke: ${order.receiverName} di ${order.deliveryCity}</p>
                    </div>
                    <div class="flex gap-2">
                        <button class="btn btn-sm btn-info" onclick="event.stopPropagation(); window.showOrderDetailModalFromCache(${order.id}, false)">
                            <i class="fas fa-eye"></i> Detail
                        </button>
                        ${deleteButton}
                    </div>
                </div>
            `;
            ordersList.appendChild(orderElement);
        });
    }
}
window.filterOrdersByStatus = (status) => {
    const userOrders = Object.values(loadedOrdersCache);
    filterAndRenderOrders(userOrders, status);
}

// FUNGSI FETCH DATA UTAMA DASHBOARD
async function renderDashboard() {
    if (!loggedInUser || !authToken || window.location.pathname.includes('admin.html')) return;
    
    // Perbarui Info User
    document.getElementById('userName').textContent = loggedInUser.username;
    document.getElementById('userNameMini').textContent = loggedInUser.username;
    document.getElementById('userEmail').textContent = loggedInUser.email;
    document.getElementById('userAvatar').textContent = loggedInUser.username.charAt(0).toUpperCase();
    
    showLoading();
    try {
        const response = await fetch(`${API_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.status === 401) { 
            clearStoredState();
            showAlert('Session expired. Silakan login kembali.', 'danger');
            updateUI();
            hideLoading();
            return;
        }
        
        const userOrders = await response.json();
        
        // Simpan ke cache
        loadedOrdersCache = {};
        userOrders.sort((a, b) => b.id - a.id); 
        userOrders.forEach(order => {
            loadedOrdersCache[order.id] = order;
        });

        // Tampilkan pesanan (default: filter 'all')
        filterAndRenderOrders(userOrders, 'all'); 

    } catch (error) {
        showAlert('Gagal memuat riwayat pesanan.', 'danger');
        console.error('Error fetching user orders:', error);
    } finally {
        hideLoading();
    }
}

// --- FUNGSI DOWNLOAD RESI PDF ---
async function downloadReceipt(orderId) {
    if (!authToken) {
        showAlert('Anda harus login untuk mengunduh resi.', 'danger');
        return;
    }
    showLoading();
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/receipt`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.status === 401) { 
            clearStoredState();
            showAlert('Sesi Anda telah berakhir. Silakan login kembali.', 'danger');
            updateUI();
            return;
        }

        if (!response.ok) {
            const errorText = await response.text(); 
            let errorMsg = 'Gagal mengunduh resi. Coba lagi.';
            try {
                const errorData = JSON.parse(errorText);
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                // Abaikan jika bukan JSON
            }
            showAlert(errorMsg, 'danger');
            return;
        }
        
        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `resi_taniku_order_${orderId}.pdf`; 
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            if (match && match[1]) {
                filename = match[1];
            }
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        showAlert(`Resi Order #${orderId} berhasil diunduh sebagai ${filename}.`, 'success');

    } catch (error) {
        showAlert('Terjadi kesalahan saat mencoba mengunduh resi.', 'danger');
        console.error('Error downloading receipt:', error);
    } finally {
        hideLoading();
    }
}
window.downloadReceipt = downloadReceipt; 

// --- MODAL DETAIL PESANAN (TAMPILAN MODERN) ---

function showOrderDetailModal(order, isAdmin = false) {
    const detailContent = document.getElementById('orderDetailContent');
    if (!detailContent) return;

    // Item List
    const itemList = order.items.map(item => `
        <div class="order-item-row flex-between" style="border-bottom: 1px dashed #eee; padding: 8px 0; font-size: 0.95rem;">
            <div style="flex: 2;">
                <p class="font-semibold text-primary" style="margin: 0;">${item.name}</p>
                <p class="text-xs muted" style="margin: 0;"> :${formatRupiah(item.price)}</p>
            </div>
            <div style="flex: 1; text-align: center;">
                <span class="font-bold">x${item.quantity}</span>
            </div>
            <div style="flex: 1; text-align: right;">
                <p class="order-item-price font-bold text-danger" style="margin: 0;">${formatRupiah(item.price * item.quantity)}</p>
            </div>
        </div>
    `).join('');

    // Admin Controls
    const adminControls = isAdmin ? `
        <h3 class="modal-subtitle mt-4"><i class="fas fa-wrench"></i> Aksi Admin</h3>
        <div class="flex gap-2 mb-3">
            <select id="adminStatusSelect" class="form-select w-100">
                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
            <button class="btn btn-success btn-sm" onclick="window.changeOrderStatus(${order.id}, document.getElementById('adminStatusSelect').value); closeModal('orderDetailModal');">
                <i class="fas fa-check"></i> Update Status
            </button>
        </div>
    ` : '';
    
    const adminUserLink = isAdmin ? `<p class="text-sm font-semibold mt-1">User: ${order.username} (ID: ${order.userId})</p>` : '';
    const statusClass = `status-${order.status.toLowerCase().replace(' ', '-')}`;

    detailContent.innerHTML = `
        <div class="flex-between mb-3">
            <h3 class="modal-title" style="margin: 0; padding: 0; border: none; font-size: 1.5rem;">Pesanan #${order.id}</h3>
            <span class="order-status ${statusClass} rounded-pill px-3 py-1" style="font-size: 0.9rem;">${order.status.toUpperCase()}</span>
        </div>
        ${adminUserLink}
        <p class="text-sm muted mb-3">Dibuat: ${new Date(order.createdAt).toLocaleString('id-ID')}</p>

        <h3 class="modal-subtitle" style="border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 15px;"><i class="fas fa-user-check"></i> Info Penerima</h3>
        <div class="order-shipping-info" style="font-size: 0.9rem;">
            <p style="margin: 5px 0;"><strong>Nama:</strong> ${order.receiverName}</p>
            <p style="margin: 5px 0;"><strong>HP:</strong> ${order.contactPhone}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${order.contactEmail || '-'}</p>
            <p style="margin: 5px 0;"><strong>Alamat:</strong> ${order.deliveryAddress}, ${order.deliveryDistrict}, ${order.deliveryCity}, ${order.deliveryProvince}</p>
            <p style="margin: 5px 0;"><strong>Catatan:</strong> ${order.notes || '-'}</p>
            <p style="margin: 5px 0;"><strong>Pembayaran:</strong> ${order.paymentMethod} (COD)</p>
        </div>
        
        <!-- Tombol Download Resi -->
        <div class="mt-4 mb-3">
            <button class="btn btn-secondary w-100" onclick="window.downloadReceipt(${order.id})">
                <i class="fas fa-download"></i> Download Resi (PDF)
            </button>
        </div>
        <!-- End Tombol Download Resi -->

        <h3 class="modal-subtitle" style="border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 15px;"><i class="fas fa-box"></i> Detail Item (${order.items.length})</h3>
        <div class="order-items-list mb-3">
            ${itemList}
        </div>
        
        <div class="order-footer flex-between border-top pt-2" style="border-top: 2px solid var(--color-danger);">
            <p class="order-total-label font-bold text-lg" style="font-size: 1.1rem; margin: 0;">Total Pembayaran:</p>
            <p class="order-total text-danger text-2xl font-bold" style="font-size: 1.6rem; margin: 0;">${formatRupiah(order.totalAmount)}</p>
        </div>
        
        ${adminControls}
    `;

    showModal('orderDetailModal');
}
window.showOrderDetailModalFromCache = (orderId, isAdmin = false) => {
    const order = loadedOrdersCache[orderId];
    if (order) {
        showOrderDetailModal(order, isAdmin); 
    } else {
        showAlert('Detail pesanan tidak ditemukan di memori. Coba refresh halaman.', 'danger');
    }
}


// --- ITEM & TAMPILAN UTAMA ---

async function fetchItems() {
    showLoading();
    try {
        const response = await fetch(`${API_URL}/items`);
        if (!response.ok) { 
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const items = await response.json();
        renderItems(items);
    } catch (error) {
        showAlert(`Gagal memuat produk dari server. Cek koneksi server (${error.message}).`, 'danger');
        console.error('Error fetching items:', error);
    } finally {
        hideLoading();
    }
}

function renderItems(itemsToRender) {
    const itemsGrid = document.getElementById('itemsGrid');
    if (!itemsGrid) return;
    itemsGrid.innerHTML = '';
    if (itemsToRender.length === 0) {
        itemsGrid.innerHTML = `<p class="text-center w-full muted" style="grid-column: 1 / -1; padding: 20px; border: 1px dashed #ccc; border-radius: 8px;">Tidak ada produk yang tersedia saat ini.</p>`;
        return;
    }

    itemsToRender.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';
        itemCard.dataset.category = item.category || 'all'; 
        
        const priceHTML = item.originalPrice && item.originalPrice !== item.price ?
            `<span class="item-price-old" style="text-decoration: line-through; color: #888; font-size: 0.9em; margin-right: 8px;">${formatRupiah(item.originalPrice)}</span>` : '';

        const badgeHTML = item.badge ? `<div class="item-badge" style="background-color: var(--color-danger); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; position: absolute; top: 10px; right: 10px; z-index: 10;">${item.badge}</div>` : '';

        const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');

        itemCard.innerHTML = `
            ${badgeHTML}
            <div class="item-img-container" style="position: relative; overflow: hidden; border-radius: 8px 8px 0 0;">
                <img src="${item.image}" onerror="this.onerror=null;this.src='https://via.placeholder.com/300x200?text=Produk+Taniku'" alt="${item.name}" class="item-img" style="width: 100%; height: auto; display: block; border-bottom: 1px solid #eee;">
            </div>
            <div class="item-info" style="padding: 15px;">
                <h4 class="item-title font-semibold" style="font-size: 1.1rem; margin-top: 0; margin-bottom: 8px; min-height: 40px;">${item.name}</h4>
                <p class="item-description text-sm muted" style="min-height: 40px; margin-bottom: 10px;">${item.description || 'Deskripsi singkat produk pertanian.'}</p>
                <div class="item-prices flex-between" style="margin-bottom: 15px; align-items: flex-end;">
                    <p class="item-price font-bold text-danger" style="font-size: 1.4rem; margin: 0;">${formatRupiah(item.price)}</p>
                    ${priceHTML}
                </div>
                <div class="item-actions">
                    <button class="btn btn-primary add-to-cart-btn w-100" onclick='window.addToCart(${itemJson})'>
                        <i class="fas fa-cart-plus"></i> Beli Sekarang
                    </button>
                </div>
            </div>
        `;
        itemsGrid.appendChild(itemCard);
    });
}

function filterItems(category) {
    const allItems = document.querySelectorAll('.items-grid .item-card');
    if (category === 'all') {
        allItems.forEach(item => item.style.display = 'block');
    } else {
        let found = false;
        allItems.forEach(item => {
            if (item.dataset.category === category) { 
                item.style.display = 'block';
                found = true;
            } else {
                item.style.display = 'none';
            }
        });
        if (!found) {
            showAlert(`Tidak ada produk ditemukan untuk kategori: ${category}.`, 'warning');
        }
    }
    document.querySelectorAll('.filter-tab').forEach(btn => btn.classList.remove('active'));
    let btnId;
    if (category === 'all') {
        btnId = 'filterAllBtn';
    } else {
        const categoryPascal = category.charAt(0).toUpperCase() + category.slice(1);
        btnId = `filter${categoryPascal}Btn`;
    }
    document.getElementById(btnId)?.classList.add('active');
}

function sortItems(sortValue) {
    const itemsGrid = document.getElementById('itemsGrid');
    if (!itemsGrid) return;
    const items = Array.from(itemsGrid.querySelectorAll('.item-card'));
    items.sort((a, b) => {
        const cleanPrice = (text) => {
             const cleanText = text.replace(/[^0-9,-]/g, '').replace(/\./g, '').replace(',', '.');
             return parseFloat(cleanText) || 0;
        };
        const priceA = cleanPrice(a.querySelector('.item-price').textContent);
        const priceB = cleanPrice(b.querySelector('.item-price').textContent);
        
        if (sortValue === 'price_low') {
            return priceA - priceB;
        } else if (sortValue === 'price_high') {
            return priceB - priceA;
        }
        return 0;
    });
    items.forEach(item => itemsGrid.appendChild(item));
}


// --- KERANJANG & CHECKOUT (Dipotong untuk fokus pada tampilan) ---

async function addToCart(item) {
    if (!authToken || !loggedInUser) {
        showAlert('Anda harus login terlebih dahulu untuk menambahkan ke keranjang.', 'danger');
        showLogin();
        return;
    }
    showLoading();
    try {
        const response = await fetch(`${API_URL}/cart/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({ item }) 
        });
        const data = await response.json();
        if (response.ok) {
            showAlert(`${item.name} berhasil ditambahkan ke keranjang!`, 'success');
            updateCartCount();
        } else {
            if (response.status === 401) {
                clearStoredState();
                showAlert('Session expired. Silakan login kembali.', 'danger');
                updateUI();
                return;
            }
            showAlert('Gagal menambahkan ke keranjang: ' + (data.error || 'Terjadi kesalahan.'), 'danger');
        }
    } catch (error) {
        showAlert('Terjadi kesalahan server saat menambahkan ke keranjang.', 'danger');
        console.error('Error adding to cart:', error);
    } finally {
        hideLoading();
    }
}

async function updateCartCount() {
    if (!authToken || !loggedInUser) {
        const cartItemCount = document.getElementById('cartItemCount');
        if (cartItemCount) cartItemCount.textContent = '0';
        return;
    }
    try {
        const response = await fetch(`${API_URL}/cart`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (response.status === 401) { clearStoredState(); updateUI(); return; }
        const data = await response.json();
        const cartItemCount = document.getElementById('cartItemCount');
        if (cartItemCount) {
            const totalItems = data.cart.reduce((total, item) => total + item.quantity, 0);
            cartItemCount.textContent = totalItems;
        }
    } catch (error) {
        console.error('Error fetching cart data:', error);
    }
}

async function showCart() {
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const cartTotal = document.getElementById('cartTotal');
    if (!cartItemsContainer || !cartTotal) return;
    if (!authToken || !loggedInUser) { showAlert('Anda harus login untuk melihat keranjang.', 'danger'); closeModal('cartModal'); showLogin(); return; }
    
    document.getElementById('checkoutForm')?.reset();
    clearValidationErrors();

    showLoading();
    try {
        const response = await fetch(`${API_URL}/cart`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (response.status === 401) { clearStoredState(); showAlert('Session expired. Silakan login kembali.', 'danger'); updateUI(); hideLoading(); return; }
        const data = await response.json();
        const cart = data.cart;
        cartItemsContainer.innerHTML = '';
        let total = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `<p class="text-center muted" style="padding: 20px; border: 1px dashed #ccc; border-radius: 8px;">Keranjang Anda kosong. Segera tambahkan produk!</p>`;
            document.getElementById('checkoutForm')?.classList.add('hidden');
        } else {
            document.getElementById('checkoutForm')?.classList.remove('hidden');
            cart.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'cart-item-card';
                itemElement.style.cssText = 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding: 10px 0;';
                itemElement.innerHTML = `
                    <div class="cart-item-info" style="display: flex; gap: 10px; align-items: center;">
                        <img src="${item.image}" onerror="this.onerror=null;this.src='https://via.placeholder.com/60x60?text=Item'" alt="${item.name}" class="cart-item-image" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                        <div class="cart-item-details">
                            <p class="cart-item-name font-semibold" style="margin: 0; font-size: 1rem;">${item.name}</p>
                            <div class="cart-item-quantity-controls" style="display: flex; gap: 5px; align-items: center; margin-top: 5px;">
                                <button class="btn btn-sm btn-secondary" style="padding: 3px 8px;" onclick="window.changeQuantity(${item.id}, -1)">-</button>
                                <span style="font-weight: 600; font-size: 0.9rem;">${item.quantity}</span>
                                <button class="btn btn-sm btn-secondary" style="padding: 3px 8px;" onclick="window.changeQuantity(${item.id}, 1)">+</button>
                            </div>
                        </div>
                    </div>
                    <div class="flex-center" style="font-size: 1.1rem; font-weight: bold; color: var(--color-danger);">
                        <p style="margin: 0;">${formatRupiah(item.price * item.quantity)}</p>
                        <button class="btn btn-danger btn-sm" onclick="window.removeFromCart(${item.id})" style="margin-left: 15px; padding: 5px 8px;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                cartItemsContainer.appendChild(itemElement);
                total += item.price * item.quantity;
            });
            
            document.getElementById('receiverNameInput').value = loggedInUser.username || '';
            document.getElementById('emailInput').value = loggedInUser.email || '';
        }
        cartTotal.textContent = formatRupiah(total);
        showModal('cartModal');
    } catch (error) {
        showAlert('Gagal memuat keranjang belanja.', 'danger');
        console.error('Error showing cart:', error);
    } finally {
        hideLoading();
    }
}

async function changeQuantity(itemId, change) {
    if (!authToken || !loggedInUser) { showAlert('Session expired. Silakan login kembali.', 'danger'); showLogin(); return; }
    const payload = { itemId, change };
    showLoading();
    try {
        const response = await fetch(`${API_URL}/cart/update`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` }, body: JSON.stringify(payload) });
        if (response.status === 401) { clearStoredState(); showAlert('Session expired. Silakan login kembali.', 'danger'); updateUI(); hideLoading(); return; }
        if (response.ok) { showCart(); updateCartCount(); } 
        else { const data = await response.json(); showAlert('Gagal mengubah jumlah item: ' + (data.error || 'Terjadi kesalahan.'), 'danger'); }
    } catch (error) { showAlert('Terjadi kesalahan saat mengubah jumlah item.', 'danger'); console.error('Error changing quantity:', error); } finally { hideLoading(); }
}

async function removeFromCart(itemId) {
    if (!authToken || !loggedInUser) { showAlert('Session expired. Silakan login kembali.', 'danger'); showLogin(); return; }
    showLoading();
    try {
        const response = await fetch(`${API_URL}/cart/remove/${itemId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } });
        if (response.status === 401) { clearStoredState(); showAlert('Session expired. Silakan login kembali.', 'danger'); updateUI(); hideLoading(); return; }
        if (response.ok) { showAlert('Produk berhasil dihapus dari keranjang.', 'success'); showCart(); updateCartCount(); } 
        else { const data = await response.json(); showAlert('Gagal menghapus produk: ' + (data.error || 'Terjadi kesalahan.'), 'danger'); }
    } catch (error) { showAlert('Terjadi kesalahan saat menghapus produk.', 'danger'); console.error('Error removing from cart:', error); } finally { hideLoading(); }
}

function resetOrderState() {
    currentOrderData = {};
    document.getElementById('checkoutForm')?.reset();
    clearValidationErrors();
}

async function handleApiError(response) {
    if (response.status === 401) {
        clearStoredState();
        showAlert('Sesi Anda telah berakhir. Silakan login kembali.', 'danger');
        showLogin();
        throw new Error('Session expired');
    }
    const data = await response.json();
    throw new Error(data.error || 'Terjadi kesalahan pada server.');
}

async function checkout(event) {
    event.preventDefault();
    if (!loggedInUser || !authToken) {
        showAlert('Anda harus login terlebih dahulu untuk checkout.', 'danger');
        closeModal('cartModal');
        showLogin();
        return;
    }

    const receiverName = document.getElementById('receiverNameInput').value.trim();
    const phone = document.getElementById('phoneInput').value.trim();
    const email = document.getElementById('emailInput').value.trim(); 
    const province = document.getElementById('provinceSelect').value.trim(); 
    const city = document.getElementById('cityInput').value.trim();
    const district = document.getElementById('districtInput').value.trim(); 
    const address = document.getElementById('addressInput').value.trim();
    const notes = document.getElementById('notesInput').value.trim();
    const paymentMethod = 'COD';

    // 1. Validasi
    let isValid = true;
    isValid = validateInput('receiverNameInput', 'Nama wajib diisi.') && isValid;
    isValid = validateInput('phoneInput', 'Nomor HP wajib diisi.') && isValid;
    isValid = validateInput('emailInput', 'Email wajib diisi.') && isValid;
    isValid = validateEmailFormat('emailInput') && isValid; 
    isValid = validateInput('provinceSelect', 'Provinsi wajib dipilih.') && isValid; 
    isValid = validateInput('cityInput', 'Kota/Kabupaten wajib diisi.') && isValid;
    isValid = validateInput('districtInput', 'Kecamatan wajib diisi.') && isValid;
    isValid = validateInput('addressInput', 'Alamat lengkap wajib diisi.') && isValid;

    if (isValid && !/^\+?[0-9]{8,15}$/.test(phone.replace(/\s/g, ''))) {
         document.getElementById('phoneInput')?.classList.add('is-invalid');
         showAlert('Nomor HP tidak valid.', 'danger');
         isValid = false;
    }

    if (!isValid) { 
        showAlert('Harap lengkapi semua data dengan benar.', 'danger');
        return;
    }

    currentOrderData = {
        receiverName: receiverName,
        contactPhone: phone,
        contactEmail: email, 
        deliveryProvince: province,
        deliveryCity: city,
        deliveryDistrict: district,
        deliveryAddress: address,
        notes: notes,
        paymentMethod: paymentMethod,
    };
    
    showLoading();
    
    try {
        const response = await fetch(`${API_URL}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(currentOrderData) 
        });

        if (!response.ok) return await handleApiError(response);
        
        const data = await response.json();
        hideLoading();
        
        currentOrderData.totalAmount = data.order.totalAmount; 
        
        showAlert('Pesanan COD Anda berhasil dibuat!', 'success');
        closeModal('cartModal');
        showPurchaseConfirmation(data.order);
        updateCartCount();
        resetOrderState(); 
    } catch (error) {
        hideLoading();
        if (error.message !== 'Session expired') {
            showAlert(`Gagal membuat pesanan: ${error.message}`, 'danger');
            console.error('Error during COD checkout:', error);
        }
    }
}

function showPurchaseConfirmation(order) {
    const purchaseSummary = document.getElementById('purchaseSummary');
    if (!purchaseSummary) return;
    
    const receiverName = currentOrderData.receiverName || 'Pelanggan'; 

    purchaseSummary.innerHTML = `
        <p style="margin-bottom: 8px;"><strong>Order ID:</strong> #${order.id}</p>
        <p style="margin-bottom: 8px;"><strong>Penerima:</strong> ${receiverName} (${currentOrderData.contactPhone})</p>
        <p style="margin-bottom: 8px;"><strong>Email:</strong> ${currentOrderData.contactEmail}</p>
        <p style="margin-bottom: 8px;"><strong>Alamat:</strong> ${currentOrderData.deliveryAddress}</p>
        <p style="margin-bottom: 8px;"><strong>Lokasi:</strong> ${currentOrderData.deliveryDistrict}, ${currentOrderData.deliveryCity}, ${currentOrderData.deliveryProvince}</p>
        <p style="margin-bottom: 8px;"><strong>Total Pembayaran:</strong> <strong style="color: var(--color-danger); font-size: 1.2rem;">${formatRupiah(order.totalAmount)}</strong></p>
        <p style="margin-bottom: 8px;"><strong>Metode:</strong> Bayar di Tempat (COD)</p>
        <p style="margin-bottom: 0;"><strong>Status Order:</strong> ${order.status.toUpperCase()}</p>
    `;
    showModal('purchaseConfirmModal');
}


// --- ADMIN LOGIC (Dipotong untuk fokus pada tampilan) ---

async function changeOrderStatus(orderId, newStatus) {
    if (!authToken || loggedInUser.role !== 'admin') { return; }
    showLoading();
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({ status: newStatus })
        });
        if (!response.ok) throw await handleApiError(response);
        showAlert(`Status Order #${orderId} berhasil diubah menjadi ${newStatus}.`, 'success');
        showAdminOrders(document.getElementById('orderSearchInput')?.value || ''); 
    } catch (error) {
        showAlert('Gagal mengubah status pesanan.', 'danger');
        console.error('Error changing order status:', error);
    } finally {
        hideLoading();
    }
}

async function showAdminOrders(searchTerm = '') {
    if (!authToken || !loggedInUser || loggedInUser.role !== 'admin') { 
        window.location.href = '/'; 
        return; 
    }
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    document.getElementById('adminOrdersBtn')?.classList.add('active-tab');
    document.getElementById('adminItemsBtn')?.classList.remove('active-tab');

    showLoading();
    try {
        const url = searchTerm 
            ? `${API_URL}/orders/all?search=${encodeURIComponent(searchTerm)}`
            : `${API_URL}/orders/all`;

        const response = await fetch(url, { 
            headers: { 'Authorization': `Bearer ${authToken}` } 
        });
        if (!response.ok) throw new Error('Failed to fetch orders.');
        let orders = await response.json();
        orders.sort((a, b) => b.id - a.id); 

        loadedOrdersCache = {}; 
        orders.forEach(order => {
            loadedOrdersCache[order.id] = order;
        });

        // 2. Render HTML (Simplified Admin Table)
        adminContent.innerHTML = `
            <div class="flex-between mb-3 mt-4">
                <h3 class="section-subtitle font-bold text-xl text-primary">Daftar Semua Pesanan (${orders.length} Total)</h3>
                <input type="text" id="orderSearchInput" class="form-input" placeholder="Cari ID, User, atau Kota..." style="max-width: 300px;" value="${searchTerm}">
            </div>
            <div id="ordersTableContainer" class="table-responsive shadow-md rounded-lg">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>User</th>
                            <th>Penerima/Lokasi</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Tanggal</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => {
                            return `
                            <tr>
                                <td data-label="ID">#${order.id}</td>
                                <td data-label="User"><span class="font-semibold">${order.username}</span></td>
                                <td data-label="Penerima/Lokasi">
                                    <span class="text-sm">${order.receiverName}</span><br>
                                    <span class="text-xs muted">${order.deliveryCity}</span>
                                </td>
                                <td data-label="Total" class="font-bold text-danger">${formatRupiah(order.totalAmount)}</td>
                                <td data-label="Status">
                                    <span class="order-status status-${order.status.toLowerCase()}">${order.status}</span>
                                </td>
                                <td data-label="Tanggal">${new Date(order.createdAt).toLocaleDateString('id-ID')}</td>
                                <td data-label="Aksi">
                                    <button class="btn btn-sm btn-info" onclick="window.showOrderDetailModalFromCache(${order.id}, true)">
                                        <i class="fas fa-eye"></i> Detail
                                    </button>
                                </td>
                            </tr>
                            `}).join('')}
                    </tbody>
                </table>
                ${orders.length === 0 ? '<p class="text-center muted p-4">Tidak ada pesanan ditemukan.</p>' : ''}
            </div>
        `;
        
        document.getElementById('orderSearchInput')?.addEventListener('input', (e) => {
            showAdminOrders(e.target.value); 
        });

    } catch (error) {
        showAlert('Gagal memuat pesanan admin.', 'danger');
        console.error('Error fetching admin orders:', error);
    } finally {
        hideLoading();
    }
}

async function showAdminItems() { 
    if (!authToken || !loggedInUser || loggedInUser.role !== 'admin') { return; }
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;

    document.getElementById('adminOrdersBtn')?.classList.remove('active-tab');
    document.getElementById('adminItemsBtn')?.classList.add('active-tab');

    showLoading();
    try {
        const response = await fetch(`${API_URL}/items`, { 
            headers: { 'Authorization': `Bearer ${authToken}` } 
        });
        if (!response.ok) throw await handleApiError(response);
        
        const items = await response.json();
        
        adminContent.innerHTML = `
            <div class="flex-between mb-3 mt-4">
                <h3 class="section-subtitle font-bold text-xl text-primary">Kelola Daftar Produk (${items.length} Total)</h3>
                <button class="btn btn-primary" onclick="window.showItemModal()"><i class="fas fa-plus"></i> Tambah Produk Baru</button>
            </div>
            <div id="itemsTableContainer" class="table-responsive shadow-md rounded-lg">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nama</th>
                            <th>Kategori</th>
                            <th>Harga Jual</th>
                            <th>Harga Asli</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td data-label="ID">#${item.id}</td>
                                <td data-label="Nama" class="font-semibold">${item.name}</td>
                                <td data-label="Kategori">${item.category}</td>
                                <td data-label="Harga Jual" class="font-bold text-danger">${formatRupiah(item.price)}</td>
                                <td data-label="Harga Asli">${item.originalPrice ? formatRupiah(item.originalPrice) : '-'}</td>
                                <td data-label="Aksi" class="flex gap-1">
                                    <button class="btn btn-sm btn-warning" onclick="window.showItemModal(${item.id})">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="window.deleteItem(${item.id})">
                                        <i class="fas fa-trash"></i> Hapus
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${items.length === 0 ? '<p class="text-center muted p-4">Tidak ada produk ditemukan.</p>' : ''}
            </div>
        `;

    } catch (error) {
        showAlert('Gagal memuat daftar produk admin.', 'danger');
        console.error('Error fetching admin items:', error);
    } finally {
        hideLoading();
    }
}

async function showItemModal(itemId = null) { 
    if (!authToken || !loggedInUser || loggedInUser.role !== 'admin') { return; }
    closeModal('orderDetailModal'); 
    clearValidationErrors();
    const modalTitle = document.getElementById('itemModalTitle');
    const form = document.getElementById('itemForm');
    
    form?.reset();
    document.getElementById('itemId').value = ''; 

    if (itemId) {
        modalTitle.innerHTML = `<i class="fas fa-edit"></i> Edit Produk #${itemId}`;
        showLoading();
        try {
            const response = await fetch(`${API_URL}/items/${itemId}`, { 
                headers: { 'Authorization': `Bearer ${authToken}` } 
            });
            if (!response.ok) throw new Error('Produk tidak ditemukan.');
            const item = await response.json();
            
            document.getElementById('itemId').value = item.id;
            document.getElementById('itemCategory').value = item.category || '';
            document.getElementById('itemName').value = item.name || '';
            document.getElementById('itemPrice').value = item.price || 0;
            document.getElementById('itemDescription').value = item.description || '';
            document.getElementById('itemImage').value = item.image || '';
            document.getElementById('itemOriginalPrice').value = item.originalPrice || '';
            document.getElementById('itemBadge').value = item.badge || '';
            
        } catch (error) {
            showAlert('Gagal memuat data produk untuk diedit.', 'danger');
            console.error('Error loading item for edit:', error);
        } finally {
            hideLoading();
        }
    } else {
        modalTitle.innerHTML = `<i class="fas fa-plus"></i> Tambah Produk Baru`;
    }
    
    showModal('itemModal');
}

async function saveItem(event) { 
    event.preventDefault();
    
    if (!authToken || loggedInUser.role !== 'admin') { return; }

    const itemId = document.getElementById('itemId').value;
    
    const category = document.getElementById('itemCategory').value.trim();
    const name = document.getElementById('itemName').value.trim();
    const priceInput = document.getElementById('itemPrice').value.trim();
    
    if (!category || !name || !priceInput) {
        showAlert('Nama, Kategori, dan Harga wajib diisi.', 'danger');
        return;
    }

    const price = parseFloat(priceInput);
    const originalPriceInput = document.getElementById('itemOriginalPrice').value.trim();

    const itemData = {
        category: category,
        name: name,
        price: price,
        description: document.getElementById('itemDescription').value.trim(),
        image: document.getElementById('itemImage').value.trim(),
        originalPrice: originalPriceInput ? parseFloat(originalPriceInput) : null, 
        badge: document.getElementById('itemBadge').value.trim()
    };

    const method = itemId ? 'PUT' : 'POST';
    const url = itemId ? `${API_URL}/items/${itemId}` : `${API_URL}/items`;

    showLoading();
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${authToken}` 
            },
            body: JSON.stringify(itemData)
        });

        if (!response.ok) throw await handleApiError(response);
        
        const action = itemId ? 'diperbarui' : 'ditambahkan';
        showAlert(`Produk berhasil ${action}.`, 'success');
        closeModal('itemModal');
        showAdminItems(); 
        
    } catch (error) {
        showAlert(`Gagal menyimpan produk: ${error.message}`, 'danger');
        console.error('Error saving item:', error);
    } finally {
        hideLoading();
    }
}

async function deleteItem(itemId) { 
    if (!authToken || loggedInUser.role !== 'admin') { return; }

    if (!confirm(`Apakah Anda yakin ingin menghapus Produk #${itemId}? Tindakan ini tidak dapat dibatalkan.`)) {
        return;
    }

    showLoading();
    try {
        const response = await fetch(`${API_URL}/items/${itemId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) throw await handleApiError(response);
        
        showAlert(`Produk #${itemId} berhasil dihapus.`, 'success');
        showAdminItems(); 
        
    } catch (error) {
        showAlert(`Gagal menghapus produk: ${error.message}`, 'danger');
        console.error('Error deleting item:', error);
    } finally {
        hideLoading();
    }
}


// --- MAIN EVENT LISTENERS ---

// MENGHUBUNGKAN FUNGSI KE WINDOW 
window.showModal = showModal;
window.closeModal = closeModal;
window.addToCart = addToCart;
window.changeQuantity = changeQuantity;
window.removeFromCart = removeFromCart;
window.showItemModal = showItemModal;
window.deleteItem = deleteItem;
window.changeOrderStatus = changeOrderStatus; 
window.showOrderDetailModal = showOrderDetailModal; 
window.showOrderDetailModalFromCache = showOrderDetailModalFromCache; 
window.showAdminOrders = showAdminOrders; 
window.showAdminItems = showAdminItems; 
window.showProfileEditModal = showProfileEditModal; 
window.saveProfile = saveProfile; 
window.scrollToProducts = () => { document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); };
window.showAbout = () => showAlert('Ini adalah bagian "Tentang Kami" Toko Pertanian Taniku.', 'info');
window.filterItems = filterItems; 
window.checkout = checkout; 

function updateUI() {
    const authButtons = document.getElementById('authButtons');
    const userButtons = document.getElementById('userButtons');
    const welcomeText = document.getElementById('welcomeText');
    const userDashboard = document.getElementById('userDashboard');

    if (loggedInUser) {
        authButtons?.classList.add('hidden');
        userButtons?.classList.remove('hidden');
        if (welcomeText) welcomeText.textContent = `Halo, ${loggedInUser.username}!`;
        userDashboard?.classList.remove('hidden');
        renderDashboard();
    } else {
        authButtons?.classList.remove('hidden');
        userButtons?.classList.add('hidden');
        userDashboard?.classList.add('hidden');
    }
    updateCartCount();
    fetchItems();
}

window.addEventListener('load', () => {
    loadStoredState();
    if (window.location.pathname.includes('admin.html')) {
        if (loggedInUser && loggedInUser.role === 'admin') {
            document.getElementById('userWelcomeText').textContent = `Halo, ${loggedInUser.username} (Admin)!`;
            document.getElementById('userWelcomeText').classList.remove('hidden');
            showAdminOrders(); 
        } else {
            window.location.href = '/'; 
        }
    } else {
        updateUI();
    }
});

// Event listeners utama
document.getElementById('loginBtn')?.addEventListener('click', showLogin);
document.getElementById('registerBtn')?.addEventListener('click', showRegister);
document.getElementById('loginForm')?.addEventListener('submit', login);
document.getElementById('registerForm')?.addEventListener('submit', register);
document.getElementById('logoutBtn')?.addEventListener('click', logout);
document.getElementById('cartBtn')?.addEventListener('click', showCart);
document.getElementById('checkoutForm')?.addEventListener('submit', checkout); 
document.getElementById('sortItemsSelect')?.addEventListener('change', (e) => sortItems(e.target.value));
document.getElementById('userDashboardBtn')?.addEventListener('click', () => showModal('profileModal')); 

// Event listeners Profile
document.getElementById('editProfileBtn')?.addEventListener('click', showProfileEditModal); 
document.getElementById('profileEditForm')?.addEventListener('submit', saveProfile); 

// Event listeners modal 
document.getElementById('closeLoginModalBtn')?.addEventListener('click', () => closeModal('loginModal'));
document.getElementById('closeRegisterModalBtn')?.addEventListener('click', () => closeModal('registerModal'));
document.getElementById('closeCartModalBtn')?.addEventListener('click', () => closeModal('cartModal'));
document.getElementById('closePurchaseConfirmModalBtn')?.addEventListener('click', () => closeModal('purchaseConfirmModal'));
document.getElementById('closePurchaseConfirmModalBtn2')?.addEventListener('click', () => closeModal('purchaseConfirmModal'));
document.getElementById('closeOrderDetailModalBtn')?.addEventListener('click', () => closeModal('orderDetailModal')); 
document.getElementById('closeItemModalBtn')?.addEventListener('click', () => closeModal('itemModal')); 
document.getElementById('closeProfileModalBtn')?.addEventListener('click', () => closeModal('profileModal')); 
document.getElementById('closeProfileEditModalBtn')?.addEventListener('click', () => closeModal('profileEditModal')); 

document.getElementById('toRegisterLink')?.addEventListener('click', (e) => { e.preventDefault(); closeModal('loginModal'); showRegister(); });
document.getElementById('toLoginLink')?.addEventListener('click', (e) => { e.preventDefault(); closeModal('registerModal'); showLogin(); });