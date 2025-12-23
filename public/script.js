class ShopeeBot {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.currentSession = null;
        this.qrInterval = null;
        this.sessionTimer = null;
        this.sessionStart = Date.now();
        this.isScanning = false;
        
        this.init();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    init() {
        // Hide loading screen after 1.5 seconds
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            this.showToast('Shopee Bot siap digunakan!', 'success');
            this.startSessionTimer();
            this.loadSession();
            this.setupEventListeners();
            this.addActivity('Session baru dimulai');
        }, 1500);
    }

    showToast(message, type = 'info') {
        Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: type === 'success' ? "#2ECC71" : 
                           type === 'error' ? "#E74C3C" : 
                           type === 'warning' ? "#F39C12" : "#3498DB",
            stopOnFocus: true
        }).showToast();
    }

    startSessionTimer() {
        this.sessionTimer = setInterval(() => {
            const elapsed = Date.now() - this.sessionStart;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            document.getElementById('session-time').textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    async loadSession() {
        try {
            const response = await fetch(`/api/session/${this.sessionId}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentSession = data.data;
                this.updateUI();
                this.addActivity('Session dimuat dari penyimpanan');
            }
        } catch (error) {
            console.log('No existing session found:', error.message);
        }
    }

    updateUI() {
        if (this.currentSession) {
            const hasCookies = this.currentSession.cookies && Object.keys(this.currentSession.cookies).length > 0;
            const hasAccountInfo = this.currentSession.accountInfo;
            
            // Update status badges
            document.getElementById('login-status').textContent = hasCookies ? 'Sudah Login' : 'Belum Login';
            document.getElementById('login-status').className = `status-badge ${hasCookies ? 'status-online' : 'status-offline'}`;
            
            document.getElementById('cookies-status').textContent = hasCookies ? 'Tersedia' : 'Tidak Ada';
            document.getElementById('cookies-status').className = `status-badge ${hasCookies ? 'status-online' : 'status-offline'}`;
            
            document.getElementById('qr-status').textContent = this.isScanning ? 'Memindai' : 'Tidak Aktif';
            document.getElementById('qr-status').className = `status-badge ${this.isScanning ? 'status-waiting' : 'status-inactive'}`;
            
            // Update cookies display
            if (hasCookies && this.currentSession.coloredCookies) {
                this.updateCookiesDisplay(this.currentSession.coloredCookies);
            }
            
            // Update account info
            if (hasAccountInfo) {
                this.updateAccountResult({
                    success: true,
                    profile: hasAccountInfo.profile,
                    account: hasAccountInfo.account
                });
            }
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.showPage(page);
                
                // Update active state
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // Quick Actions
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // QR Login
        document.getElementById('generate-qr').addEventListener('click', () => this.generateQRCode());
        document.getElementById('stop-qr').addEventListener('click', () => this.stopQRScan());
        document.getElementById('refresh-qr').addEventListener('click', () => this.generateQRCode());

        // Check Account
        document.getElementById('check-account-btn').addEventListener('click', () => this.checkAccount());
        document.getElementById('paste-cookies').addEventListener('click', () => this.pasteCookies());

        // Cookies Page
        document.getElementById('copy-cookies').addEventListener('click', () => this.copyCookies());
        document.getElementById('clear-cookies').addEventListener('click', () => this.clearCookies());
        document.getElementById('export-cookies').addEventListener('click', () => this.exportCookies());

        // Format buttons
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.changeCookieFormat(e.currentTarget.dataset.format);
            });
        });

        // FAQ toggle
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', (e) => {
                const answer = e.currentTarget.nextElementSibling;
                answer.classList.toggle('active');
                const icon = e.currentTarget.querySelector('i');
                icon.classList.toggle('fa-chevron-down');
                icon.classList.toggle('fa-chevron-up');
            });
        });

        // New session
        document.getElementById('new-session').addEventListener('click', () => this.newSession());

        // Close modal
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('account-modal').classList.remove('active');
        });

        // Click outside modal to close
        document.getElementById('account-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('account-modal')) {
                document.getElementById('account-modal').classList.remove('active');
            }
        });
    }

    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
    }

    handleQuickAction(action) {
        switch(action) {
            case 'qr-login':
                this.showPage('qr-login');
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                document.querySelector('.nav-item[data-page="qr-login"]').classList.add('active');
                break;
            case 'check-account':
                this.showPage('check-account');
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                document.querySelector('.nav-item[data-page="check-account"]').classList.add('active');
                break;
            case 'copy-cookies':
                this.copyCookies();
                break;
            case 'clear-session':
                this.clearSession();
                break;
        }
    }

    async generateQRCode() {
        try {
            this.isScanning = true;
            
            // Reset UI
            document.getElementById('qr-image').style.display = 'none';
            document.getElementById('qr-placeholder').style.display = 'flex';
            document.getElementById('stop-qr').style.display = 'block';
            document.getElementById('generate-qr').style.display = 'none';
            
            // Update steps
            this.updateQrSteps(1);
            this.updateUI();
            
            const response = await fetch('/api/generate-qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: this.sessionId })
            });

            const data = await response.json();

            if (data.success) {
                // Show QR Code
                const qrImage = document.getElementById('qr-image');
                qrImage.src = `data:image/png;base64,${data.qrcode_base64}`;
                qrImage.style.display = 'block';
                document.getElementById('qr-placeholder').style.display = 'none';
                
                this.showToast('QR Code berhasil dibuat', 'success');
                this.addActivity('QR Code berhasil dibuat');
                this.updateQrSteps(2);
                
                // Start timer and polling
                this.startQRTimer(data.qrcode_id);
                this.startQRPolling(data.qrcode_id);
            } else {
                throw new Error(data.error || 'Gagal generate QR Code');
            }
        } catch (error) {
            this.showToast(error.message, 'error');
            this.stopQRScan();
            this.addActivity('Gagal membuat QR Code: ' + error.message);
        }
    }

    startQRTimer(qrcodeId) {
        let timeLeft = 60;
        const timerElement = document.getElementById('qr-timer');
        const progressBar = document.querySelector('.progress-fill');
        
        const timer = setInterval(() => {
            if (!this.isScanning) {
                clearInterval(timer);
                return;
            }
            
            timeLeft--;
            timerElement.textContent = timeLeft;
            progressBar.style.width = `${(timeLeft / 60) * 100}%`;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                this.showToast('QR Code expired', 'error');
                this.stopQRScan();
                this.addActivity('QR Code expired');
            }
        }, 1000);
    }

    async startQRPolling(qrcodeId) {
        const poll = async () => {
            if (!this.isScanning) return;

            try {
                const response = await fetch('/api/check-qr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ qrcodeId, sessionId: this.sessionId })
                });

                const data = await response.json();

                if (data.status === 'confirmed') {
                    this.updateQrSteps(3);
                    this.showToast('QR Code berhasil di-scan!', 'success');
                    this.addActivity('QR Code berhasil di-scan');
                    
                    // Login with QR
                    await this.loginWithQR(qrcodeId, data.qrcode_token);
                    
                } else if (data.status === 'expired') {
                    this.showToast('QR Code expired', 'error');
                    this.stopQRScan();
                    this.addActivity('QR Code expired');
                } else {
                    // Continue polling
                    setTimeout(poll, 1000);
                }
            } catch (error) {
                console.error('Polling error:', error);
                setTimeout(poll, 2000);
            }
        };

        poll();
    }

    async loginWithQR(qrcodeId, qrcodeToken) {
        try {
            this.updateQrSteps(4);
            
            const response = await fetch('/api/login-qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    qrcodeId, 
                    qrcodeToken, 
                    sessionId: this.sessionId 
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Login berhasil! Cookies didapatkan', 'success');
                this.addActivity('Login QR berhasil, cookies didapatkan');
                
                // Update session
                this.currentSession = {
                    ...this.currentSession,
                    cookies: data.rawCookies,
                    coloredCookies: data.coloredCookies
                };
                
                this.updateUI();
                this.stopQRScan();
                
                // Auto-check account
                await this.checkAccountFromCookies(data.rawCookies);
                
            } else {
                throw new Error(data.error || 'Login gagal');
            }
        } catch (error) {
            this.showToast(error.message, 'error');
            this.addActivity('Login QR gagal: ' + error.message);
        }
    }

    async checkAccountFromCookies(cookies) {
        try {
            const response = await fetch('/api/check-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    cookies, 
                    sessionId: this.sessionId 
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Akun berhasil dicek!', 'success');
                this.updateAccountResult(data);
                this.addActivity('Status akun berhasil dicek');
            } else {
                this.showToast(data.error, 'warning');
                this.addActivity('Gagal mengecek akun: ' + data.error);
            }
        } catch (error) {
            this.showToast('Gagal mengecek akun', 'error');
            this.addActivity('Error saat mengecek akun: ' + error.message);
        }
    }

    async checkAccount() {
        const cookieInput = document.getElementById('cookie-input').value.trim();
        
        if (!cookieInput) {
            this.showToast('Masukkan cookies terlebih dahulu', 'warning');
            return;
        }

        this.showToast('Memproses cookies...', 'info');

        try {
            // Parse cookies string
            const parseResponse = await fetch('/api/parse-cookies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cookieString: cookieInput })
            });

            const parseData = await parseResponse.json();

            if (!parseData.success) {
                this.showToast(parseData.error || 'Format cookies tidak valid', 'error');
                this.updateAccountResult({ 
                    success: false, 
                    error: parseData.error || 'Format cookies tidak valid' 
                });
                return;
            }

            console.log('✅ Cookies parsed successfully:', parseData.count, 'cookies found');

            // Check account
            this.showToast('Mengecek status akun...', 'info');
            
            const checkResponse = await fetch('/api/check-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    cookies: parseData.cookies, 
                    sessionId: this.sessionId 
                })
            });

            const checkData = await checkResponse.json();

            if (checkData.success) {
                this.showToast('Akun berhasil dicek!', 'success');
                
                this.currentSession = {
                    ...this.currentSession,
                    cookies: parseData.cookies,
                    coloredCookies: checkData.coloredCookies,
                    accountInfo: {
                        profile: checkData.profile,
                        account: checkData.account
                    }
                };
                
                this.updateAccountResult(checkData);
                this.updateUI();
                this.addActivity('Akun berhasil dicek dari input manual');
                
            } else {
                this.showToast(checkData.error, 'error');
                this.updateAccountResult({ 
                    success: false, 
                    error: checkData.error 
                });
                this.addActivity('Gagal mengecek akun: ' + checkData.error);
            }

        } catch (error) {
            console.error('Check account error:', error);
            this.showToast('Terjadi kesalahan: ' + error.message, 'error');
            this.updateAccountResult({ 
                success: false, 
                error: 'Terjadi kesalahan: ' + error.message 
            });
        }
    }

    updateAccountResult(data) {
        const resultContainer = document.getElementById('account-result');
        
        if (data.success) {
            const statusElement = document.getElementById('account-status');
            statusElement.textContent = 'AKTIF';
            statusElement.className = 'status-badge status-online';
            
            let profileHtml = '';
            if (data.profile) {
                profileHtml = `
                    <div class="detail-group">
                        <h4><i class="fas fa-id-card"></i> Informasi Profil</h4>
                        <div class="detail-item">
                            <span>UserID:</span>
                            <code>${data.profile.userid || '-'}</code>
                        </div>
                        <div class="detail-item">
                            <span>Username:</span>
                            <code>${data.profile.username || '-'}</code>
                        </div>
                        <div class="detail-item">
                            <span>Nickname:</span>
                            <code>${data.profile.nickname || '-'}</code>
                        </div>
                        <div class="detail-item">
                            <span>Gender:</span>
                            <code>${data.profile.gender || '-'}</code>
                        </div>
                    </div>`;
            }
            
            resultContainer.innerHTML = `
                <div class="account-details">
                    ${profileHtml}
                    
                    <div class="detail-group">
                        <h4><i class="fas fa-user-circle"></i> Informasi Akun</h4>
                        <div class="detail-item">
                            <span>Nama:</span>
                            <code>${data.account?.name || '-'}</code>
                        </div>
                        <div class="detail-item">
                            <span>No HP:</span>
                            <code>${data.account?.phone || '-'}</code>
                        </div>
                        <div class="detail-item">
                            <span>Email:</span>
                            <code>${data.account?.email || '-'}</code>
                        </div>
                    </div>
                    
                    <button id="view-full-account" class="btn btn-secondary">
                        <i class="fas fa-external-link-alt"></i> Lihat Detail Lengkap
                    </button>
                </div>
            `;
            
            // Add event listener to view full account button
            document.getElementById('view-full-account')?.addEventListener('click', () => {
                this.showAccountModal(data);
            });
            
        } else {
            const statusElement = document.getElementById('account-status');
            statusElement.textContent = 'ERROR';
            statusElement.className = 'status-badge status-offline';
            
            resultContainer.innerHTML = `
                <div class="error-result">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Gagal Mengecek Akun</h4>
                    <p>${data.error || 'Terjadi kesalahan'}</p>
                    <p class="error-tip">Pastikan cookies valid dan tidak expired</p>
                    <div class="error-tips">
                        <p><strong>Tips:</strong></p>
                        <ul>
                            <li>Salin semua cookies dari browser</li>
                            <li>Pastikan format: key=value; key2=value2;</li>
                            <li>Cookies minimal harus ada SPC_T_ID dan SPC_EC</li>
                            <li>Gunakan fitur Login QR jika cookies sering expired</li>
                        </ul>
                    </div>
                </div>
            `;
        }
    }

    showAccountModal(accountData) {
        const modalBody = document.getElementById('modal-account-details');
        
        let profileSection = '';
        if (accountData.profile) {
            profileSection = `
                <div class="modal-section">
                    <h4><i class="fas fa-user-shield"></i> Detail Profil</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>UserID</label>
                            <p>${accountData.profile.userid || '-'}</p>
                        </div>
                        <div class="info-item">
                            <label>ShopID</label>
                            <p>${accountData.profile.shopid || '-'}</p>
                        </div>
                        <div class="info-item">
                            <label>Username</label>
                            <p>${accountData.profile.username || '-'}</p>
                        </div>
                        <div class="info-item">
                            <label>Nickname</label>
                            <p>${accountData.profile.nickname || '-'}</p>
                        </div>
                        <div class="info-item">
                            <label>Gender</label>
                            <p>${accountData.profile.gender || '-'}</p>
                        </div>
                    </div>
                </div>`;
        }
        
        modalBody.innerHTML = `
            <div class="modal-account-info">
                ${profileSection}
                
                <div class="modal-section">
                    <h4><i class="fas fa-address-card"></i> Kontak</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Nama Lengkap</label>
                            <p>${accountData.account?.name || '-'}</p>
                        </div>
                        <div class="info-item">
                            <label>Nomor HP</label>
                            <p>${accountData.account?.phone || '-'}</p>
                        </div>
                        <div class="info-item">
                            <label>Email</label>
                            <p>${accountData.account?.email || '-'}</p>
                        </div>
                    </div>
                </div>
                
                <div class="modal-section">
                    <h4><i class="fas fa-cookie-bite"></i> Status Cookies</h4>
                    <div class="status-info">
                        <div class="status-item success">
                            <i class="fas fa-check-circle"></i>
                            <div>
                                <h5>Valid</h5>
                                <p>Cookies aktif dan dapat digunakan</p>
                            </div>
                        </div>
                        <div class="status-item">
                            <i class="fas fa-clock"></i>
                            <div>
                                <h5>Session</h5>
                                <p>${new Date().toLocaleDateString('id-ID', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('account-modal').classList.add('active');
    }

    updateQrSteps(step) {
        document.querySelectorAll('.step').forEach((el, index) => {
            if (index < step) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }

    stopQRScan() {
        this.isScanning = false;
        
        // Reset UI
        document.getElementById('stop-qr').style.display = 'none';
        document.getElementById('generate-qr').style.display = 'block';
        document.getElementById('qr-image').style.display = 'none';
        document.getElementById('qr-placeholder').style.display = 'flex';
        document.querySelector('.progress-fill').style.width = '0%';
        
        // Reset steps
        this.updateQrSteps(1);
        this.updateUI();
        
        if (this.qrInterval) {
            clearInterval(this.qrInterval);
        }
    }

    pasteCookies() {
        navigator.clipboard.readText().then(text => {
            if (text) {
                document.getElementById('cookie-input').value = text;
                this.showToast('Cookies berhasil di-paste', 'success');
            } else {
                this.showToast('Clipboard kosong', 'warning');
            }
        }).catch(err => {
            console.error('Clipboard error:', err);
            this.showToast('Gagal membaca clipboard. Izinkan akses clipboard.', 'error');
        });
    }

    copyCookies() {
        if (!this.currentSession?.cookies) {
            this.showToast('Tidak ada cookies yang tersimpan', 'warning');
            return;
        }

        const cookiesString = Object.entries(this.currentSession.cookies)
                                .map(([key, value]) => `${key}=${value}`)
                                .join('; ');

        navigator.clipboard.writeText(cookiesString).then(() => {
            this.showToast('Cookies berhasil disalin ke clipboard', 'success');
            this.addActivity('Cookies disalin ke clipboard');
        }).catch(err => {
            this.showToast('Gagal menyalin cookies', 'error');
        });
    }

    clearCookies() {
        if (confirm('Apakah Anda yakin ingin menghapus cookies?')) {
            this.currentSession = null;
            this.updateUI();
            this.showToast('Cookies berhasil dihapus', 'success');
            this.addActivity('Cookies dihapus');
            
            // Clear cookies display
            document.getElementById('cookies-output').innerHTML = `
                <div class="no-cookies">
                    <i class="fas fa-cookie"></i>
                    <p>Belum ada cookies yang tersimpan</p>
                    <p class="subtext">Login QR atau cek akun untuk mendapatkan cookies</p>
                </div>
            `;
        }
    }

    exportCookies() {
        if (!this.currentSession?.cookies) {
            this.showToast('Tidak ada cookies yang tersimpan', 'warning');
            return;
        }

        const cookiesString = JSON.stringify(this.currentSession.cookies, null, 2);
        const blob = new Blob([cookiesString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `shopee_cookies_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Cookies berhasil diexport', 'success');
        this.addActivity('Cookies diexport ke file JSON');
    }

    updateCookiesDisplay(cookiesHtml) {
        document.getElementById('cookies-output').innerHTML = cookiesHtml;
    }

    changeCookieFormat(format) {
        if (!this.currentSession?.cookies) return;

        let formattedCookies = '';

        switch(format) {
            case 'colored':
                formattedCookies = this.currentSession.coloredCookies || 
                    Object.entries(this.currentSession.cookies)
                        .map(([key, value]) => 
                            `<span class="cookie-${key.startsWith('SPC_') ? 'spc' : 'other'}">${key}=${value}</span>; `
                        ).join('');
                break;
            case 'raw':
                formattedCookies = Object.entries(this.currentSession.cookies)
                    .map(([key, value]) => 
                        `<span class="cookie-${key.startsWith('SPC_') ? 'spc' : 'other'}">${key}=${value}</span>; `
                    ).join('');
                break;
            case 'bash':
                formattedCookies = Object.entries(this.currentSession.cookies)
                    .map(([key, value]) => `${key}=${value};`)
                    .join(' ');
                break;
        }

        this.updateCookiesDisplay(formattedCookies);
    }

    clearSession() {
        if (confirm('Apakah Anda yakin ingin mengakhiri session ini?')) {
            this.currentSession = null;
            this.sessionStart = Date.now();
            this.updateUI();
            
            // Reset all displays
            document.getElementById('account-result').innerHTML = `
                <div class="no-result">
                    <i class="fas fa-user-clock"></i>
                    <p>Masukkan cookies dan klik "Cek Status Akun"</p>
                </div>
            `;
            
            document.getElementById('cookie-input').value = '';
            
            this.showToast('Session berhasil direset', 'success');
            this.addActivity('Session direset');
        }
    }

    newSession() {
        this.sessionId = this.generateSessionId();
        this.currentSession = null;
        this.sessionStart = Date.now();
        
        this.showToast('Session baru dibuat', 'success');
        this.addActivity('Session baru dibuat');
        
        // Reset UI
        this.updateUI();
    }

    addActivity(message) {
        const activityList = document.getElementById('activity-list');
        const now = new Date();
        const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <p><strong>${time}</strong> - ${message}</p>
        `;
        
        activityList.insertBefore(activityItem, activityList.firstChild);
        
        // Limit to 10 activities
        if (activityList.children.length > 10) {
            activityList.removeChild(activityList.lastChild);
        }
    }
}

// Initialize the bot when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.shopeeBot = new ShopeeBot();
});
