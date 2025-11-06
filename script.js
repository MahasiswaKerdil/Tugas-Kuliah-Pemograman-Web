/* script.js
   Penyimpanan sederhana menggunakan localStorage.
   Struktur data:
   - participants: [{id,name,role}]
   - books: [{id,judul,penulis,stok}]
   - borrowHistory: [{id,participantId,bookId,dateBorrow,dueDate}]
   - menu: [{id,nama,harga}]
   - orders: [{id,participantId,menuId,qty,date}]
   - attendance: {YYYY-MM-DD: [{participantId,role,status}]}
*/
// COLLAPSIBLE (HIDER)
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.collapsible').forEach(header=>{
    header.addEventListener('click',()=>{
      const content = header.nextElementSibling;
      content.classList.toggle('active');
    });
  });
});

/* ---------- Helpers ---------- */
const uid = (prefix='id')=> prefix + '_' + Math.random().toString(36).slice(2,9);
const todayKey = ()=> new Date().toISOString().slice(0,10);

function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function load(key){ const v=localStorage.getItem(key); return v?JSON.parse(v):null; }

// ---- LOGIN SYSTEM ----
function login(){
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value.trim();
  if(u === 'admin' && p === 'admin'){
    localStorage.setItem('loggedIn', 'true');
    alert('Login berhasil. Selamat datang, Admin!');
    showMainApp();
  } else {
    alert('Username atau password salah!');
  }
}

function showMainApp(){
  document.getElementById('loginPage').classList.add('hidden');
  document.querySelectorAll('aside, footer, .view').forEach(el=>{
    if(el.id !== 'loginPage') el.classList.remove('hidden');
  });
  renderDashboard();
}

// Cek status login saat halaman dibuka
document.addEventListener('DOMContentLoaded',()=>{
  const logged = localStorage.getItem('loggedIn');
  if(logged==='true'){
    showMainApp();
  } else {
    document.querySelectorAll('aside, footer, .view').forEach(el=>{
      if(el.id !== 'loginPage') el.classList.add('hidden');
    });
    document.getElementById('loginPage').classList.remove('hidden');
  }
});



/* ---------- Initialize storage if empty ---------- */
function ensureData(){
  if(!load('participants')) save('participants', []);
  if(!load('books')) save('books', []);
  if(!load('borrowHistory')) save('borrowHistory', []);
  if(!load('menu')) save('menu', []);
  if(!load('orders')) save('orders', []);
  if(!load('attendance')) save('attendance', {}); // map tanggal -> array
}
ensureData();

/* ---------- Navigation ---------- */
document.querySelectorAll('nav a').forEach(a=>{
  a.addEventListener('click', (e)=>{
    e.preventDefault();
    document.querySelectorAll('nav a').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
    const view = a.dataset.view;
    document.querySelectorAll('.view').forEach(s=>s.classList.add('hidden'));
    document.getElementById(view).classList.remove('hidden');
    // render view-specific
    if(view==='dashboard') renderDashboard();
    if(view==='peserta') renderPeserta();
    if(view==='perpustakaan') { renderBuku(); renderBorrowSelectors(); renderHistory(); }
    if(view==='kantin') { renderMenu(); renderOrderSelectors(); renderOrders(); }
    if(view==='absensi') { renderAttendance(); }
    if(view==='about') { /* halaman statis tidak perlu render JS */ }
  });
});

/* ---------- DASHBOARD ---------- */
function renderDashboard(){
  const participants = load('participants') || [];
  const books = load('books') || [];
  const history = load('borrowHistory') || [];
  const orders = load('orders') || [];

  document.getElementById('statPeserta').innerText = `Peserta: ${participants.length}`;
  document.getElementById('statBuku').innerText = `Buku: ${books.length}`;
  document.getElementById('statPinjam').innerText = `Peminjaman: ${history.length}`;
  // orders today
  const today = todayKey();
  const ordersToday = orders.filter(o=> o.date && o.date.slice(0,10) === today);
  document.getElementById('statPesanan').innerText = `Pesanan: ${ordersToday.length}`;

  const last = history.slice(-3).reverse();
  const area = document.getElementById('lastBorrow');
  if(last.length===0) area.innerText = 'Belum ada peminjaman.';
  else {
    area.innerHTML = last.map(h=>{
      const p = participants.find(x=>x.id===h.participantId) || {name:'-'}; 
      const b = books.find(x=>x.id===h.bookId) || {judul:'-'};
      return `<div style="margin-bottom:6px"><strong>${p.name}</strong> meminjam <em>${b.judul}</em> pada ${h.dateBorrow.slice(0,10)}</div>`;
    }).join('');
  }
}

/* ---------- PESERTA ---------- */
function addPeserta(){
  const name = document.getElementById('p_nama').value.trim();
  const pid = document.getElementById('p_id').value.trim() || uid('P');
  const role = document.getElementById('p_role').value;
  if(!name){ alert('Nama tidak boleh kosong'); return; }
  const parts = load('participants') || [];
  parts.push({id:pid,name,role});
  save('participants', parts);
  document.getElementById('p_nama').value = '';
  document.getElementById('p_id').value = '';
  renderPeserta();
  renderBorrowSelectors();
  renderOrderSelectors();
  alert('Peserta ditambahkan.');
}

function renderPeserta(){
  const parts = load('participants') || [];
  const tbody = document.querySelector('#tablePeserta tbody');
  tbody.innerHTML = '';
  parts.forEach((p,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${p.name}</td><td>${p.id}</td><td>${p.role}</td>
      <td><button onclick="hapusPeserta('${p.id}')">Hapus</button></td>`;
    tbody.appendChild(tr);
  });
}

function hapusPeserta(id){
  if(!confirm('Hapus peserta ini?')) return;
  let parts = load('participants') || [];
  parts = parts.filter(p=>p.id!==id);
  save('participants', parts);
  renderPeserta();
  renderBorrowSelectors();
  renderOrderSelectors();
}

/* ---------- BUKU / PERPUSTAKAAN ---------- */
function addBuku(){
  const judul = document.getElementById('b_judul').value.trim();
  const penulis = document.getElementById('b_penulis').value.trim();
  const stok = parseInt(document.getElementById('b_stok').value) || 0;
  if(!judul || stok<=0){ alert('Judul & stok harus valid'); return; }
  const books = load('books') || [];
  books.push({id: uid('B'), judul, penulis, stok});
  save('books', books);
  document.getElementById('b_judul').value='';
  document.getElementById('b_penulis').value='';
  document.getElementById('b_stok').value='1';
  renderBuku();
  renderBorrowSelectors();
}

function renderBuku(){
  const books = load('books') || [];
  const tbody = document.querySelector('#tableBuku tbody');
  tbody.innerHTML = '';
  books.forEach((b,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${b.judul}</td><td>${b.penulis}</td><td>${b.stok}</td>
      <td><button ${b.stok<=0?'disabled':''} onclick="preparePinjam('${b.id}')">Pinjam</button>
          <button onclick="hapusBuku('${b.id}')">Hapus</button></td>`;
    tbody.appendChild(tr);
  });
}

function hapusBuku(id){
  if(!confirm('Hapus buku ini?')) return;
  let books = load('books') || [];
  books = books.filter(b=>b.id!==id);
  save('books', books);
  renderBuku();
  renderBorrowSelectors();
}

function renderBorrowSelectors(){
  const parts = load('participants') || [];
  const books = load('books') || [];
  const selP = document.getElementById('selectPesertaForBorrow');
  const selB = document.getElementById('selectBukuForBorrow');
  selP.innerHTML = parts.length? parts.map(p=>`<option value="${p.id}">${p.name} (${p.role})</option>`).join('') : '<option value="">-- kosong --</option>';
  selB.innerHTML = books.length? books.map(b=>`<option value="${b.id}" ${b.stok<=0?'disabled':''}>${b.judul} — stok: ${b.stok}</option>`).join('') : '<option value="">-- kosong --</option>';
}

function preparePinjam(bookId){
  document.getElementById('selectBukuForBorrow').value = bookId;
  // open Perpustakaan view already visible
}

function pinjamBuku(){
  const pId = document.getElementById('selectPesertaForBorrow').value;
  const bId = document.getElementById('selectBukuForBorrow').value;
  const durasi = parseInt(document.getElementById('durasiPinjam').value) || 7;
  if(!pId || !bId){ alert('Pilih peserta dan buku'); return; }

  // update stok
  let books = load('books') || [];
  const book = books.find(b=>b.id===bId);
  if(!book || book.stok <= 0){ alert('Stok tidak mencukupi'); renderBuku(); renderBorrowSelectors(); return; }
  book.stok -= 1;
  save('books', books);

  // add history
  const history = load('borrowHistory') || [];
  const now = new Date();
  const due = new Date(now.getTime() + durasi*24*60*60*1000);
  history.push({
    id: uid('H'),
    participantId: pId,
    bookId: bId,
    dateBorrow: now.toISOString(),
    dueDate: due.toISOString()
  });
  save('borrowHistory', history);

  alert('Peminjaman berhasil dicatat.');
  renderBuku();
  renderBorrowSelectors();
  renderHistory();
  renderDashboard();
}

function renderHistory(){
  const history = load('borrowHistory') || [];
  const parts = load('participants') || [];
  const books = load('books') || [];
  const area = document.getElementById('historyArea');
  if(history.length===0){ area.innerHTML = '<div class="small">Riwayat kosong.</div>'; return; }
  area.innerHTML = history.slice().reverse().map(h=>{
    const p = parts.find(x=>x.id===h.participantId) || {name:'-'};
    const b = books.find(x=>x.id===h.bookId) || {judul:'-'};
    return `<div class="history-item">
      <strong>${p.name}</strong> — <em>${b.judul}</em><br>
      Dipinjam: ${h.dateBorrow.slice(0,10)} | Jatuh tempo: ${h.dueDate.slice(0,10)}
    </div>`;
  }).join('');
}

function hapusSemuaRiwayat(){
  if(!confirm('Yakin ingin menghapus semua riwayat peminjaman? Tindakan ini tidak dapat dibatalkan.')) return;
  save('borrowHistory', []);
  renderHistory();
  alert('Riwayat dipenuhi.');
  renderDashboard();
}

/* ---------- KANTIN ---------- */
function tambahMenu(){
  const nama = document.getElementById('m_nama').value.trim();
  const harga = parseInt(document.getElementById('m_harga').value) || 0;
  if(!nama || harga<=0){ alert('Nama & harga valid'); return; }
  const menu = load('menu') || [];
  menu.push({id: uid('M'), nama, harga});
  save('menu', menu);
  document.getElementById('m_nama').value='';
  renderMenu();
  renderOrderSelectors();
}

function renderMenu(){
  const menu = load('menu') || [];
  const area = document.getElementById('menuList');
  if(menu.length===0){ area.innerHTML = '<div class="small">Menu kosong. Tambah item untuk mencoba.</div>'; return; }
  area.innerHTML = menu.map(it=>{
    return `<div class="menu-item"><strong>${it.nama}</strong> — Rp${it.harga.toLocaleString('id-ID')}</div>`;
  }).join('');
}

function renderOrderSelectors(){
  const parts = load('participants') || [];
  const menu = load('menu') || [];
  const selP = document.getElementById('selectPesertaForOrder');
  const selM = document.getElementById('selectMenuForOrder');
  selP.innerHTML = parts.length? parts.map(p=>`<option value="${p.id}">${p.name} (${p.role})</option>`).join('') : '<option value="">-- kosong --</option>';
  selM.innerHTML = menu.length? menu.map(m=>`<option value="${m.id}">${m.nama} — Rp${m.harga.toLocaleString('id-ID')}</option>`).join('') : '<option value="">-- kosong --</option>';
}

function buatPesanan(){
  const pId = document.getElementById('selectPesertaForOrder').value;
  const mId = document.getElementById('selectMenuForOrder').value;
  const qty = parseInt(document.getElementById('orderQty').value) || 1;
  if(!pId || !mId || qty<1){ alert('Lengkapi data pesanan'); return; }
  const orders = load('orders') || [];
  orders.push({id: uid('O'), participantId: pId, menuId: mId, qty, date: new Date().toISOString()});
  save('orders', orders);
  renderOrders();
  renderDashboard();
  alert('Pesanan berhasil dibuat.');
}

function renderOrders(){
  const orders = load('orders') || [];
  const menu = load('menu') || [];
  const parts = load('participants') || [];
  const area = document.getElementById('orderList');
  if(orders.length===0){ area.innerHTML = '<div class="small">Belum ada pesanan.</div>'; return; }
  area.innerHTML = orders.slice().reverse().map(o=>{
    const p = parts.find(x=>x.id===o.participantId) || {name:'-'};
    const m = menu.find(x=>x.id===o.menuId) || {nama:'-'};
    return `<div class="order-item"><strong>${p.name}</strong> memesan <em>${m.nama}</em> x ${o.qty} — ${new Date(o.date).toLocaleString()}</div>`;
  }).join('');
}

/* ---------- ABSENSI ---------- */
function absensiHarian(){
  // Build a UI to set hadir/sakit for each participant
  const parts = load('participants') || [];
  if(parts.length===0){ alert('Belum ada peserta terdaftar.'); return; }
  const area = document.getElementById('attendanceArea');
  area.innerHTML = parts.map(p=>{
    return `<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
      <div style="flex:1"><strong>${p.name}</strong> <small>${p.role}</small></div>
      <select data-pid="${p.id}" class="att-select">
        <option value="none">--</option>
        <option value="hadir">Hadir</option>
        <option value="sakit">Sakit</option>
      </select>
    </div>`;
  }).join('');
  document.getElementById('todayDate').innerText = todayKey();

  // Add save button
  const btn = document.createElement('div');
  btn.style.marginTop = '8px';
  btn.innerHTML = `<button onclick="simpanAbsensi()">Simpan Absensi Hari Ini</button>`;
  area.appendChild(btn);
}

function simpanAbsensi(){
  const selects = Array.from(document.querySelectorAll('.att-select'));
  const attendance = load('attendance') || {};
  const date = todayKey();
  attendance[date] = attendance[date] || [];
  selects.forEach(s=>{
    const pid = s.dataset.pid;
    const val = s.value;
    if(val==='none') return;
    // record
    const parts = load('participants') || [];
    const p = parts.find(x=>x.id===pid);
    attendance[date].push({participantId: pid, role: p? p.role : 'unknown', status: val});
  });
  save('attendance', attendance);
  alert('Absensi tersimpan untuk tanggal ' + date);
  renderAttendance();
  renderRekap();
}

function renderAttendance(){
  const filter = document.getElementById('filterRole').value;
  const attendance = load('attendance') || {};
  const today = todayKey();
  const arr = attendance[today] || [];
  const parts = load('participants') || [];

  const area = document.getElementById('rekapArea');
  // show detailed list by filter
  const filtered = arr.filter(r=> filter==='all' ? true : r.role===filter);
  if(filtered.length===0){
    area.innerHTML = '<div class="small">Belum ada data absensi hari ini.</div>';
    return;
  }
  area.innerHTML = filtered.map(r=>{
    const p = parts.find(x=>x.id===r.participantId) || {name:'-'};
    return `<div style="padding:6px;border-bottom:1px dashed #eee">${p.name} — ${r.role} — <strong>${r.status}</strong></div>`;
  }).join('');
}

function renderRekap(){
  // called on opening absensi view as well
  const attendance = load('attendance') || {};
  const today = todayKey();
  const arr = attendance[today] || [];
  const hadir = arr.filter(x=>x.status==='hadir').length;
  const sakit = arr.filter(x=>x.status==='sakit').length;
  document.getElementById('rekapArea').innerHTML = `<div class="small">Hadir: ${hadir} | Sakit: ${sakit} | Total catatan: ${arr.length}</div>`;
}

/* ---------- SEED / RESET ---------- */
function seedSampleData(){
  const sampleParticipants = [
    {id:'S001', name:'Alya Nur', role:'siswa'},
    {id:'S002', name:'Rahma', role:'siswa'},
    {id:'S003', name:'Nuriyah', role:'siswa'},
    {id:'S004', name:'Maman', role:'siswa'},
    {id:'S005', name:'Budi Santoso', role:'siswa'},
    {id:'G001', name:'Ibu Rina', role:'guru'},
    {id:'G002', name:'Bapak Budiman', role:'guru'},
    {id:'G003', name:'Bapak Dodo', role:'guru'},
    {id:'G004', name:'Ibu Nimi', role:'guru'},
    {id:'G005', name:'Ibu Nirma', role:'guru'},
    {id:'SF01', name:'Pak Joko', role:'staff'},
    {id:'SF02', name:'Pak Kiki', role:'staff'},
    {id:'SF03', name:'Pak Majid', role:'staff'},
  ];
  const sampleBooks = [
    {id:'B1', judul:'Pemrograman Web Dasar', penulis:'Pengajar Komputer', stok:3},
    {id:'B2', judul:'Dasar-dasar JavaScript', penulis:'Pengajar JS', stok:2},
    {id:'B3', judul:'Matematika Sekolah', penulis:'Dr. Math', stok:1},
    {id:'B4', judul:'Bahasa Lokal', penulis:'Dr. Muklas', stok:8},
    {id:'B5', judul:'Bahasa Internasional', penulis:'Dr. Didi', stok:5},
  ];
  const sampleMenu = [
    {id:'M1', nama:'Nasi Goreng', harga:12000},
    {id:'M2', nama:'Es Teh', harga:4000},
    {id:'M3', nama:'Roti Isi', harga:8000},
    {id:'M4', nama:'Ketoprak', harga:15000},
    {id:'M5', nama:'Jagung Bakar', harga:5000},
    {id:'M6', nama:'Ayam Bakar', harga:10000},
    {id:'M7', nama:'Nasi Goreng', harga:12000},
    {id:'M8', nama:'Corn Dog', harga:17000}
  ];
  save('participants', sampleParticipants);
  save('books', sampleBooks);
  save('menu', sampleMenu);
  save('orders', []);
  save('borrowHistory', []);
  save('attendance', {});
  alert('Contoh data dimuat.');
  renderDashboard();
  renderPeserta();
  renderBuku();
  renderMenu();
  renderBorrowSelectors();
  renderOrderSelectors();
  renderOrders();
}

function resetAllData(){
  if(!confirm('Reset semua data? Semua data akan hilang dari localStorage.')) return;
  localStorage.clear();
  ensureData();
  renderDashboard();
  renderPeserta();
  renderBuku();
  renderMenu();
  renderHistory();
  renderOrders();
  alert('Semua data direset.');
}

/* ---------- Inisialisasi awal tampilan ---------- */
(function init(){
  renderDashboard();
  renderPeserta();
  renderBuku();
  renderMenu();
  renderHistory();
  renderOrders();
  renderBorrowSelectors();
  renderOrderSelectors();
  // show dashboard by default (nav already set)
})();

function logout(){
  localStorage.removeItem('loggedIn');
  alert('Anda telah logout.');
  location.reload();
}
