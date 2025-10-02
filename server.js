// server.js - Backend Taniku E-Commerce

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const PDFDocument = require('pdfkit'); // PASTIKAN INI ADA DAN SUDAH DI-INSTALL

const app = express();
const PORT = process.env.PORT || 3000;

// --- KONFIGURASI KRITIS & KEAMANAN (TANIKU) ---
const JWT_SECRET = process.env.JWT_SECRET || 'TANIKU_SECRET_KEY_12345_SANGAT_RAHASIA';
const SESSION_SECRET = process.env.NODE_ENV === 'production' ? process.env.SESSION_SECRET : 'taniku-session-secret-pertanian';

if (JWT_SECRET === 'TANIKU_SECRET_KEY_12345_SANGAT_RAHASIA') {
    console.error("❌ FATAL: JWT_SECRET menggunakan default value yang tidak aman. Harap set di file .env.");
}

// Middleware
const allowedOrigins = [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'http://localhost:5500', 
    'http://127.0.0.1:5500' 
]; 

app.use(cors({
    origin: function (origin, callback) {
        if (origin === undefined || origin === null || allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production' && process.env.PROTOCOL === 'https',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 hari
    } 
}));

// Rute untuk melayani file statis
app.use(express.static(path.join(__dirname, 'public')));

// Data file paths
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const ITEMS_FILE = path.join(__dirname, 'data', 'items.json');
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');

// --- KATEGORI TANIKU ---
const VALID_CATEGORIES = ['benih', 'bibit', 'pupuk', 'pestisida', 'alat'];

// --- Fungsi Helper File I/O ---

async function readData(filePath, defaultData = []) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            await writeData(filePath, defaultData);
            return defaultData;
        }
        console.error(`[ERROR] Gagal membaca file ${filePath}:`, err);
        throw new Error(`Failed to read data from ${path.basename(filePath)}`);
    }
}

async function writeData(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`[ERROR] Gagal menulis ke file ${filePath}:`, err);
        throw new Error(`Failed to write data to ${path.basename(filePath)}`);
    }
}

// --- Inisialisasi Data Awal (TANIKU) ---
async function ensureDataFiles() {
    try {
        await fs.mkdir('data', { recursive: true });
        
        // Data Awal Produk Pertanian
await readData(ITEMS_FILE, [
    // 🔹 Benih & Bibit
    { 
        id: 1, 
        category: 'benih', 
        name: 'Benih Padi Ciherang 5kg', 
        price: 120000, 
        description: 'Benih unggul padi varietas Ciherang dengan daya tumbuh tinggi.', 
        image: 'https://placehold.co/300x200/4CAF50/FFFFFF/png?text=Benih+Padi', 
        originalPrice: 135000, 
        badge: 'PROMO' 
    },
    { 
        id: 2, 
        category: 'bibit', 
        name: 'Bibit Kopi Robusta 20 batang', 
        price: 400000, 
        description: 'Bibit kopi robusta pilihan siap tanam.', 
        image: 'https://placehold.co/300x200/795548/FFFFFF/png?text=Bibit+Kopi' 
    },

    // 🔹 Pupuk
    { 
        id: 3, 
        category: 'pupuk', 
        name: 'Pupuk Urea 50kg', 
        price: 350000, 
        description: 'Pupuk urea kualitas tinggi untuk meningkatkan hasil panen.', 
        image: 'https://placehold.co/300x200/8BC34A/333333/png?text=Pupuk+Urea' 
    },
    { 
        id: 4, 
        category: 'pupuk', 
        name: 'Pupuk NPK 25kg', 
        price: 280000, 
        description: 'Pupuk majemuk untuk pertumbuhan daun, bunga, dan buah.', 
        image: 'https://placehold.co/300x200/CDDC39/333333/png?text=Pupuk+NPK' 
    },

    // 🔹 Pestisida
    { 
        id: 5, 
        category: 'pestisida', 
        name: 'Insektisida Cair 250ml', 
        price: 55000, 
        description: 'Obat pengendali hama serangga pada tanaman.', 
        image: 'https://placehold.co/300x200/F44336/FFFFFF/png?text=Insektisida' 
    },
    { 
        id: 6, 
        category: 'pestisida', 
        name: 'Fungisida Bubuk 100gr', 
        price: 35000, 
        description: 'Obat pengendali jamur penyebab penyakit tanaman.', 
        image: 'https://placehold.co/300x200/9C27B0/FFFFFF/png?text=Fungisida' 
    },

    // 🔹 Alat Tani
    { 
        id: 7, 
        category: 'alat', 
        name: 'Cangkul Baja Berkualitas', 
        price: 80000, 
        description: 'Alat pertanian kokoh untuk segala jenis tanah.', 
        image: 'https://placehold.co/300x200/03A9F4/FFFFFF/png?text=Cangkul' 
    },
    { 
        id: 8, 
        category: 'alat', 
        name: 'Sprayer Elektrik 16L', 
        price: 450000, 
        description: 'Alat penyemprot elektrik untuk pupuk cair dan pestisida.', 
        image: 'https://placehold.co/300x200/009688/FFFFFF/png?text=Sprayer' 
    }
]);

        
        await readData(ORDERS_FILE, []);
        
        const existingUsers = await readData(USERS_FILE, []);
        if (existingUsers.length === 0) {
            // Mengubah kredensial admin default menjadi Taniku
            const defaultAdmin = { id: 1, username: 'AdminTaniku', email: 'admin@taniku.com', password: await bcrypt.hash('taniku123', 10), role: 'admin', createdAt: new Date().toISOString() };
            await writeData(USERS_FILE, [defaultAdmin]);
            console.log(`[TANIKU SERVER] Admin Credentials: admin@taniku.com / taniku123`);
        }
        
        console.log("[TANIKU SERVER] Data files initialized.");
        
    } catch (err) {
        console.error('❌ Failed to initialize data directory or files:', err);
        process.exit(1);
    }
}

// --- Middleware Otentikasi & Otorisasi ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication token required.' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = { id: user.id, username: user.username, role: user.role }; 
        next();
    });
}

function checkAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
}

function ensureCart(req, res, next) {
    if (!req.session.cart) req.session.cart = [];
    next();
}

// ===================================
// RUTE AUTENTIKASI & PROFIL
// ===================================

app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Semua field (username, email, password) wajib diisi.' });
        }
        
        const users = await readData(USERS_FILE);
        const existingUser = users.find(u => u.email === email || u.username === username);
        if (existingUser) {
            return res.status(400).json({ error: 'Email atau Username sudah terdaftar.' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: Date.now(), username, email, password: hashedPassword, role: 'user', createdAt: new Date().toISOString() };
        users.push(newUser);
        await writeData(USERS_FILE, users);
        
        res.status(201).json({ message: 'Pendaftaran berhasil. Silakan login.' });
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).json({ error: 'Server error: Gagal mendaftarkan pengguna.' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email dan password wajib diisi.' });
        }
        
        const users = await readData(USERS_FILE);
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: 'Email atau password salah.' });
        }
        
        // Menggunakan req.session.regenerate untuk Session Fixation Prevention
        req.session.regenerate(err => {
            if (err) {
                console.error('Error regenerating session:', err);
                return res.status(500).json({ error: 'Gagal membuat sesi baru saat login.' });
            }
            
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
            
            // Inisialisasi keranjang setelah regenerasi
            req.session.cart = req.session.cart || []; 
            
            res.json({ message: 'Login berhasil', token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
        });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ error: 'Server error: Gagal melakukan login.' });
    }
});

app.get('/api/user', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// RUTE PROFIL UPDATE
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const userId = req.user.id;
        
        if (!username || !email) {
            return res.status(400).json({ error: 'Username dan email wajib diisi.' });
        }

        const users = await readData(USERS_FILE);
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            return res.status(404).json({ error: 'User tidak ditemukan.' });
        }
        
        const currentUser = users[userIndex];

        // Cek duplikasi username/email oleh user lain
        const existingUser = users.find(u => 
            u.id !== userId && (u.email === email || u.username === username)
        );
        if (existingUser) {
            return res.status(400).json({ error: 'Email atau Username sudah digunakan oleh pengguna lain.' });
        }
        
        let hashedPassword = currentUser.password;
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ error: 'Password minimal 6 karakter.' });
            }
            hashedPassword = await bcrypt.hash(password, 10);
        }
        
        const updatedUser = { 
            ...currentUser, 
            username, 
            email, 
            password: hashedPassword,
            updatedAt: new Date().toISOString()
        };

        users[userIndex] = updatedUser;
        await writeData(USERS_FILE, users);
        
        // Buat token baru dengan info user terbaru
        const token = jwt.sign({ id: updatedUser.id, username: updatedUser.username, role: updatedUser.role }, JWT_SECRET, { expiresIn: '1d' });

        res.json({ 
            message: 'Profil berhasil diperbarui.', 
            token,
            user: { id: updatedUser.id, username: updatedUser.username, email: updatedUser.email, role: updatedUser.role } 
        });

    } catch (err) {
        console.error('Error during profile update:', err);
        res.status(500).json({ error: 'Server error: Gagal memperbarui profil.' });
    }
});


// =====================
// RUTE PRODUK (ITEMS)
// =====================

app.get('/api/items', async (req, res) => {
    try {
        const items = await readData(ITEMS_FILE);
        const { category, search } = req.query;
        let filteredItems = items;
        
        if (category) {
            filteredItems = filteredItems.filter(item => item.category?.toLowerCase() === category.toLowerCase());
        }

        if (search) {
            const searchTerm = search.toLowerCase();
            filteredItems = filteredItems.filter(item => 
                item.name.toLowerCase().includes(searchTerm) || 
                item.description.toLowerCase().includes(searchTerm)
            );
        }

        res.json(filteredItems);
    } catch (err) {
        console.error('Error fetching items:', err);
        res.status(500).json({ error: 'Server error: Gagal memuat produk.' });
    }
});

app.get('/api/items/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID produk tidak valid.' });
        
        const items = await readData(ITEMS_FILE);
        const item = items.find(i => i.id === id);
        
        if (!item) return res.status(404).json({ error: 'Produk tidak ditemukan' });
        res.json(item);
    } catch (err) {
        console.error('Error fetching item by ID:', err);
        res.status(500).json({ error: 'Server error: Gagal memuat detail produk.' });
    }
});

app.post('/api/items', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const { category, name, price, description, image, originalPrice, badge } = req.body;
        if (!category || !name || !price || isNaN(parseFloat(price))) {
            return res.status(400).json({ error: 'Kategori, nama, dan harga wajib diisi dan harga harus berupa angka.' });
        }
        
        const lowerCategory = category.toLowerCase();
        if (!VALID_CATEGORIES.includes(lowerCategory)) {
            return res.status(400).json({ error: `Kategori tidak valid. Pilihan: ${VALID_CATEGORIES.join(', ')}.` });
        }
        
        const items = await readData(ITEMS_FILE);
        
        // Pastikan harga asli jika ada, diubah ke float
        let finalOriginalPrice = undefined;
        if (originalPrice !== null && originalPrice !== undefined && originalPrice !== '' && !isNaN(parseFloat(originalPrice))) {
            finalOriginalPrice = parseFloat(originalPrice);
        }

        const newItem = { 
            id: Date.now(), 
            category: lowerCategory, 
            name, 
            price: parseFloat(price), 
            description: description || '', 
            image: image || 'https://placehold.co/300x200?text=TANIKU', 
            originalPrice: finalOriginalPrice,
            badge: badge || '',
            createdAt: new Date().toISOString() 
        };
        items.push(newItem);
        await writeData(ITEMS_FILE, items);
        res.status(201).json({ message: 'Produk berhasil ditambahkan', item: newItem });
    } catch (err) {
        console.error('Error adding item:', err);
        res.status(500).json({ error: 'Server error: Gagal menambah produk.' });
    }
});

app.put('/api/items/:id', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID produk tidak valid.' });
        
        const items = await readData(ITEMS_FILE);
        const itemIndex = items.findIndex(i => i.id === id);
        
        if (itemIndex === -1) return res.status(404).json({ error: 'Produk tidak ditemukan' });
        
        const { category, name, price, description, image, originalPrice, badge } = req.body;
        
        if (!category || !name || !price || isNaN(parseFloat(price))) {
            return res.status(400).json({ error: 'Kategori, nama, dan harga wajib diisi dan harga harus berupa angka.' });
        }
        
        const lowerCategory = category.toLowerCase();
        if (!VALID_CATEGORIES.includes(lowerCategory)) {
            return res.status(400).json({ error: `Kategori tidak valid. Pilihan: ${VALID_CATEGORIES.join(', ')}.` });
        }

        // Handle originalPrice null/undefined/kosong untuk PUT
        let finalOriginalPrice;
        if (originalPrice === null || originalPrice === undefined || originalPrice === '') {
            finalOriginalPrice = undefined; 
        } else if (!isNaN(parseFloat(originalPrice))) {
            finalOriginalPrice = parseFloat(originalPrice);
        } else {
            return res.status(400).json({ error: 'Harga asli harus berupa angka atau kosong/null.' });
        }

        items[itemIndex] = { 
            ...items[itemIndex], 
            category: lowerCategory, 
            name, 
            price: parseFloat(price), 
            description: description || items[itemIndex].description, 
            image: image || items[itemIndex].image, 
            originalPrice: finalOriginalPrice, 
            badge: badge || items[itemIndex].badge,
            updatedAt: new Date().toISOString() 
        };
        await writeData(ITEMS_FILE, items);
        res.json({ message: 'Produk berhasil diperbarui', item: items[itemIndex] });
    } catch (err) {
        console.error('Error updating item:', err);
        res.status(500).json({ error: 'Server error: Gagal memperbarui produk.' });
    }
});

app.delete('/api/items/:id', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID produk tidak valid.' });
        
        const items = await readData(ITEMS_FILE);
        const itemIndex = items.findIndex(i => i.id === id);
        
        if (itemIndex === -1) return res.status(404).json({ error: 'Produk tidak ditemukan' });
        
        items.splice(itemIndex, 1);
        await writeData(ITEMS_FILE, items);
        res.json({ message: 'Produk berhasil dihapus.' });
    } catch (err) {
        console.error('Error deleting item:', err);
        res.status(500).json({ error: 'Server error: Gagal menghapus produk.' });
    }
});

// ===================================
// RUTE KERANJANG (CART)
// ===================================

app.post('/api/cart/add', authenticateToken, ensureCart, async (req, res) => {
    try {
        const { item } = req.body;
        if (!item || !item.id || !item.name || !item.price) {
            return res.status(400).json({ error: 'Data item tidak lengkap.' });
        }
        
        const cart = req.session.cart;
        const existingItem = cart.find(cartItem => cartItem.id === item.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            const itemData = { 
                id: item.id, 
                name: item.name, 
                price: item.price, 
                image: item.image,
                category: item.category,
                quantity: 1 
            };
            cart.push(itemData);
        }
        
        res.json({ message: `${item.name} added to cart.`, cart });
    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).json({ error: 'Server error: Gagal menambahkan item ke keranjang.' });
    }
});

app.get('/api/cart', authenticateToken, ensureCart, (req, res) => {
    res.json({ cart: req.session.cart });
});

app.put('/api/cart/update', authenticateToken, ensureCart, (req, res) => {
    const { itemId, change } = req.body;
    const cart = req.session.cart;
    
    if (!itemId || isNaN(parseInt(change))) {
        return res.status(400).json({ error: 'ID item dan perubahan kuantitas wajib diisi.' });
    }
    
    const item = cart.find(cartItem => cartItem.id === itemId);
    
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            req.session.cart = cart.filter(cartItem => cartItem.id !== itemId);
        }
        res.json({ message: 'Cart updated.', cart: req.session.cart });
    } else {
        res.status(404).json({ error: 'Item not found in cart.' });
    }
});

app.delete('/api/cart/remove/:itemId', authenticateToken, ensureCart, (req, res) => {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) return res.status(400).json({ error: 'ID item tidak valid.' });
    
    const initialLength = req.session.cart.length;
    req.session.cart = req.session.cart.filter(item => item.id !== itemId);
    
    if (req.session.cart.length === initialLength) {
        return res.status(404).json({ error: 'Item not found in cart.' });
    }
    
    res.json({ message: 'Item removed from cart.', cart: req.session.cart });
});


// ===================================
// RUTE CHECKOUT (COD FINAL)
// ===================================
app.post('/api/checkout', authenticateToken, ensureCart, async (req, res) => {
    try {
        // Ambil semua data yang diperlukan dari body
        const { receiverName, contactEmail, contactPhone, deliveryAddress, deliveryProvince, deliveryCity, deliveryDistrict, notes } = req.body; 
        const cartItems = req.session.cart;
        
        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ error: 'Keranjang belanja kosong.' });
        }
        
        // Validasi data wajib, termasuk email dan provinsi (sesuai frontend)
        if (!receiverName || !deliveryAddress || !contactPhone || !deliveryProvince || !deliveryCity || !deliveryDistrict || !contactEmail) {
            return res.status(400).json({ error: 'Data pemesan dan alamat lengkap (termasuk email) wajib diisi.' });
        }
        
        const allItems = await readData(ITEMS_FILE);
        let totalAmount = 0;
        const validatedItems = [];
        
        for (const item of cartItems) {
            const foundItem = allItems.find(i => i.id === item.id);
            if (!foundItem) {
                return res.status(404).json({ error: `Produk dengan ID ${item.id} tidak ditemukan di katalog.` });
            }
            const currentPrice = foundItem.price; 
            totalAmount += currentPrice * item.quantity;
            
            validatedItems.push({ 
                itemId: foundItem.id, 
                name: foundItem.name, 
                price: currentPrice, 
                quantity: item.quantity,
                category: foundItem.category
            });
        }
        
        const orders = await readData(ORDERS_FILE);
        const newOrder = { 
            id: Date.now(), 
            userId: req.user.id, 
            username: req.user.username, 
            receiverName,
            deliveryAddress,  
            contactPhone,     
            contactEmail, // Simpan Email
            deliveryProvince, // Simpan Provinsi
            deliveryCity,
            deliveryDistrict,
            notes: notes || '',
            items: validatedItems, 
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            status: 'pending', 
            paymentMethod: 'COD',
            createdAt: new Date().toISOString() 
        };
        orders.push(newOrder);
        await writeData(ORDERS_FILE, orders);

        req.session.cart = [];

        res.status(201).json({ message: 'Pesanan COD berhasil dibuat.', order: newOrder });
    } catch (err) {
        console.error('Error during checkout:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server saat checkout.' });
    }
});


// =====================
// RUTE PESANAN (ORDERS)
// =====================

// >>>>> Rute Resi PDF <<<<<
app.get('/api/orders/:id/receipt', authenticateToken, async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        if (isNaN(orderId)) return res.status(400).json({ error: 'ID order tidak valid.' });

        const orders = await readData(ORDERS_FILE);
        const order = orders.find(o => o.id === orderId);

        if (!order) return res.status(404).json({ error: 'Order tidak ditemukan.' });
        if (order.userId !== req.user.id && req.user.role !== 'admin') {
             return res.status(403).json({ error: 'Anda tidak memiliki akses ke pesanan ini.' });
        }
        
        // --- LOGIKA GENERASI PDF MENGGUNAKAN PDFKIT ---
        const doc = new PDFDocument({ margin: 30 });
        const filename = `Faktur_Taniku_Order_${order.id}.pdf`;
        const PADDING = 30;
        const WIDTH = 612 - 2 * PADDING;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        doc.pipe(res);
        
        const BRAND_COLOR = '#4CAF50'; // Hijau Taniku
        const ACCENT_COLOR = '#F44336'; // Merah untuk Total
        
        const formatRupiah = (number) => {
            return 'Rp ' + parseFloat(number).toLocaleString('id-ID');
        };

        // --- FUNGSI HELPER BARU ---
        function drawLine(y, color = '#eee') {
            doc.moveTo(PADDING, y)
               .lineTo(WIDTH + PADDING, y)
               .lineWidth(0.5)
               .stroke(color);
        }

        // --- 1. HEADER BRANDING & FAKTUR INFO ---
        
        // Kotak Biru Header
        doc.rect(PADDING, 40, WIDTH, 40)
           .fill(BRAND_COLOR); 

        // Judul Faktur
        doc.fillColor('#FFFFFF')
           .fontSize(16)
           .text('FAKTUR PEMBAYARAN', PADDING, 52, { width: WIDTH, align: 'center' });

        // Info Order di kanan
        doc.fillColor('#000000')
           .fontSize(9)
           .text(`Tanggal Order: ${new Date(order.createdAt).toLocaleDateString('id-ID')}`, PADDING, 90, { width: WIDTH, align: 'right' });
        doc.fontSize(11).fillColor(BRAND_COLOR)
           .text(`FAKTUR ID: #${order.id}`, PADDING, 105, { width: WIDTH, align: 'right' });
        doc.moveDown(2);

        // --- 2. INFORMASI ALAMAT (Pengirim vs Penerima) ---
        let infoY = doc.y;
        
        // Kolom KIRI: Pengirim (Taniku)
        doc.fontSize(10).fillColor('#666')
           .text('DIKIRIM OLEH (TANIKU)', PADDING, infoY);
        doc.fontSize(10).fillColor('#000')
           .text('Taniku Indonesia', PADDING, infoY + 12);
        doc.text('support@taniku.com', PADDING, infoY + 24);
        doc.text('Malang, Jawa Timur, Indonesia', PADDING, infoY + 36);

        // Kolom KANAN: Penerima
        doc.fontSize(10).fillColor('#666')
           .text('DIKIRIM KEPADA', 300, infoY);
        doc.fontSize(10).fillColor('#000')
           .text(order.receiverName, 300, infoY + 12);
        doc.text(order.contactPhone, 300, infoY + 24);
        doc.text(`${order.deliveryAddress}, ${order.deliveryCity}, ${order.deliveryProvince}`, 300, infoY + 36, { width: 282 });

        doc.moveDown(5); 

        // --- 3. TABEL ITEM ---

        const tableTop = doc.y;
        const col1 = PADDING; 
        const col2 = 300; 
        const col3 = 400; 
        const col4 = 480; 
        const rowHeight = 25;
        
        // Header Tabel
        doc.fillColor(BRAND_COLOR)
           .rect(PADDING, tableTop, WIDTH, 20)
           .fill(BRAND_COLOR);

        doc.fillColor('#FFFFFF')
           .fontSize(9)
           .font('Helvetica-Bold')
           .text('DESKRIPSI PRODUK', col1 + 5, tableTop + 6)
           .text('SATUAN', col2, tableTop + 6, { width: 70, align: 'right' })
           .text('QTY', col3, tableTop + 6, { width: 50, align: 'center' })
           .text('TOTAL', col4, tableTop + 6, { width: 100, align: 'right' });
        
        doc.y = tableTop + 20;

        // Isi Tabel
        let currentY = doc.y;
        doc.font('Helvetica');

        order.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            
            doc.fillColor('#000000')
               .fontSize(9)
               .text(item.name, col1 + 5, currentY + 7, { width: 280, continued: false, ellipsis: true });
            
            doc.text(formatRupiah(item.price), col2, currentY + 7, { width: 70, align: 'right' })
               .text(item.quantity.toString(), col3, currentY + 7, { width: 50, align: 'center' })
               .text(formatRupiah(itemTotal), col4, currentY + 7, { width: 100, align: 'right' });
            
            // Garis pembatas antar item
            currentY += rowHeight;
            drawLine(currentY); 
        });

        doc.y = currentY + 10;
        
        // --- 4. RINGKASAN TOTAL ---
        const sumTop = doc.y;

        // Subtotal
        doc.fontSize(10).fillColor('#666')
           .text('Subtotal Barang:', 400, sumTop, { width: 100, align: 'right' });
        doc.fillColor('#000').text(formatRupiah(order.totalAmount), 480, sumTop, { width: 100, align: 'right' });

        // Biaya Pengiriman (Asumsi Gratis)
        doc.fontSize(10).fillColor('#666')
           .text('Biaya Pengiriman:', 400, sumTop + 15, { width: 100, align: 'right' });
        doc.fillColor('#000').text('Gratis', 480, sumTop + 15, { width: 100, align: 'right' });

        // TOTAL AKHIR (Kotak Hijau)
        doc.rect(400, sumTop + 35, 182, 30) // Kotak Hijau
           .fill(BRAND_COLOR);
           
        doc.fontSize(10).fillColor('#FFFFFF')
           .text('TOTAL TAGIHAN (COD):', 400, sumTop + 40, { width: 100, align: 'left', font: 'Helvetica-Bold' });
        doc.fontSize(14).fillColor('#FFFFFF')
           .text(formatRupiah(order.totalAmount), 480, sumTop + 38, { width: 100, align: 'right', font: 'Helvetica-Bold' });
        
        // --- 5. CATATAN PENTING ---
        
        doc.y = sumTop + 100;
        doc.fontSize(10).fillColor('#000')
           .text('CATATAN PENTING:', PADDING, doc.y);
        doc.fontSize(8).fillColor('#666')
           .text('1. Pembayaran total tagihan dilakukan tunai kepada kurir saat barang diterima.', PADDING, doc.y + 12);
        doc.text('2. Faktur ini sah tanpa tanda tangan karena dicetak secara elektronik.', PADDING, doc.y + 22);
        
        doc.end();

    } catch (err) {
        console.error('Error generating PDF receipt:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server saat membuat dokumen resi.' });
    }
});
// >>>>> Akhir Rute Resi PDF <<<<<


// >>>>> Rute DELETE Pesanan Pengguna <<<<<
app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const userId = req.user.id;
        
        if (isNaN(orderId)) return res.status(400).json({ error: 'ID order tidak valid.' });

        const orders = await readData(ORDERS_FILE);
        const orderIndex = orders.findIndex(o => o.id === orderId);

        if (orderIndex === -1) return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });

        const orderToDelete = orders[orderIndex];

        // Otorisasi: Hanya pemilik pesanan yang bisa menghapus
        if (orderToDelete.userId !== userId) {
            return res.status(403).json({ error: 'Anda tidak diizinkan menghapus pesanan pengguna lain.' });
        }
        
        // Aturan Bisnis: Hanya boleh menghapus jika status Selesai atau Dibatalkan
        if (orderToDelete.status !== 'completed' && orderToDelete.status !== 'cancelled') {
            return res.status(400).json({ error: `Pesanan hanya bisa dihapus jika statusnya 'completed' atau 'cancelled'. Status saat ini: ${orderToDelete.status}.` });
        }

        // Hapus pesanan dari array
        orders.splice(orderIndex, 1);
        
        await writeData(ORDERS_FILE, orders);
        res.json({ message: `Pesanan #${orderId} berhasil dihapus dari riwayat.` });

    } catch (err) {
        console.error('Error deleting user order:', err);
        res.status(500).json({ error: 'Server error saat menghapus pesanan.' });
    }
});
// >>>>> Akhir Rute DELETE Pesanan Pengguna <<<<<

app.get('/api/orders/all', authenticateToken, checkAdmin, async (req, res) => {
    try {
        let orders = await readData(ORDERS_FILE);
        const { search } = req.query; 

        // Logika Pencarian Server-Side
        if (search) {
            const searchTerm = search.toLowerCase();
            orders = orders.filter(order =>
                order.id.toString().includes(searchTerm) ||
                order.username?.toLowerCase().includes(searchTerm) ||
                order.receiverName?.toLowerCase().includes(searchTerm) ||
                order.deliveryCity?.toLowerCase().includes(searchTerm)
            );
        }
        // Akhir Logika Pencarian

        res.json(orders);
    } catch (err) {
        console.error('Error fetching all orders:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server saat memuat semua pesanan.' });
    }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await readData(ORDERS_FILE);
        const userOrders = orders.filter(order => order.userId === req.user.id);
        res.json(userOrders);
    } catch (err) {
        console.error('Error fetching user orders:', err);
        res.status(500).json({ error: 'Terjadi kesalahan server saat memuat pesanan pengguna.' });
    }
});

app.put('/api/orders/:id/status', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const { status } = req.body;
        
        if (isNaN(orderId)) return res.status(400).json({ error: 'ID order tidak valid.' });
        if (!status) return res.status(400).json({ error: 'Status wajib diisi.' });

        const orders = await readData(ORDERS_FILE);
        const orderIndex = orders.findIndex(o => o.id === orderId);

        if (orderIndex === -1) return res.status(404).json({ error: 'Order not found.' });

        const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
        const lowerStatus = status.toLowerCase();
        
        if (!validStatuses.includes(lowerStatus)) {
            return res.status(400).json({ error: `Invalid status provided. Must be one of: ${validStatuses.join(', ')}.` });
        }

        orders[orderIndex].status = lowerStatus;
        orders[orderIndex].updatedAt = new Date().toISOString();
        
        await writeData(ORDERS_FILE, orders);
        res.json({ message: `Order #${orderId} status updated to ${lowerStatus}.`, order: orders[orderIndex] });

    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).json({ error: 'Server error when updating status.' });
    }
});

// =====================
// RUTE TAMPILAN HTML
// =====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin.html', authenticateToken, checkAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// =====================
// ERROR HANDLER GLOBAL
// =====================
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.stack);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({ error: 'Terjadi kesalahan internal server yang tidak terduga.' });
});


// =====================
// SERVER START (TANIKU)
// =====================
async function startServer() {
    await ensureDataFiles();
    app.listen(PORT, () => {
        console.log(`[TANIKU SERVER] 🟢 . email : admin@taniku.com / taniku123.... Running on port ${PORT}`);
        console.log(`Visit http://localhost:${PORT}`);
    });
}

startServer();