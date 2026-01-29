# 🧩 Task Breakdown – Refactor Reminder System (Context-Aware)

Dokumen ini berisi **task yang harus dilakukan secara berurutan dan terstruktur** untuk merombak **fitur Reminder** pada WhatsAppBotReminder agar sesuai dengan sistem **Reminder Laporan Harian Magang berbasis API eksternal**, tanpa merusak fitur lain.

Dokumen ini **dirancang agar dapat dieksekusi oleh Agent AI / autonomous coding agent**.

---

## 🎯 Tujuan Utama

- Menghapus logika **Reminder berbasis command & database**
- Mengganti dengan **1 system-level daily reminder**
- Reminder berjalan **otomatis 1x sehari (20.00 WIB)**
- Menggunakan **API Attendance & Daily Log**
- Mengirim **1 pesan ringkasan ke grup WhatsApp**
- Menampilkan **nama peserta yang belum mengisi laporan**

---

## 🧱 Constraint (WAJIB DIPATUHI)

- ❌ Tidak mengubah fitur lain (Games, Utility, Fun, Digest, Templates)
- ❌ Tidak mengirim chat pribadi
- ❌ Tidak menyimpan reminder ke tabel `reminders`
- ✅ Menggunakan `participant_id` sebagai key utama
- ✅ Reminder bersifat **system job**, bukan command

---

## PHASE 1 — Audit & Isolation

### Task 1.1 – Identifikasi Reminder Lama
- Telusuri semua file terkait reminder lama
- Tandai fungsi, command, dan cron job yang berhubungan dengan:
  - `!addreminder`
  - `!remindonce`
  - `scheduler.js`

**Output:** daftar file & fungsi reminder lama

---

### Task 1.2 – Nonaktifkan Reminder Lama (Non-Destructive)
- Jangan hapus kode
- Lakukan salah satu:
  - Comment-out load reminder
  - Bypass scheduler lama
- Pastikan bot tetap berjalan normal tanpa error

**Output:** Reminder lama tidak pernah dieksekusi

---

## PHASE 2 — Data Layer Baru (Minimal & Aman)

### Task 2.1 – Definisikan Sumber Data Peserta

Buat satu sumber data statis (pilih salah satu):
- File `participants.json`
- Table Supabase sederhana (opsional)

**Minimal schema:**
```json
{
  "participant_id": "uuid",
  "name": "Nama Peserta",
  "active": true
}
```

**Output:** daftar peserta siap dipakai oleh sistem

---

### Task 2.2 – Validasi Konsistensi participant_id
- Pastikan `participant_id`:
  - Valid UUID
  - Konsisten dengan API attendance & daily log

**Output:** tidak ada participant_id orphan

---

## PHASE 3 — Integrasi API Eksternal

### Task 3.1 – Buat API Client (Read-Only)

Buat module baru, contoh:
```
src/services/internApi.js
```

Fungsi wajib:
- `getAttendance(participant_id, date)`
- `getDailyLog(participant_id, date)`

Constraint:
- GET only
- Handle timeout & error

**Output:** API client reusable

---

### Task 3.2 – Normalisasi Response API

- Pastikan response API dinormalisasi menjadi boolean:
  - `isPresent`
  - `hasDailyLog`

**Output:** tidak ada logika API mentah di scheduler

---

## PHASE 4 — Core Logic (Decision Engine)

### Task 4.1 – Implement Logic Checker

Buat fungsi inti:
```
checkDailyReportStatus(date)
```

Pseudo-logika:
1. Loop semua peserta aktif
2. Jika `attendance !== PRESENT` → skip
3. Jika `dailyLog NOT FOUND` → push nama ke list

**Output:** array nama peserta yang belum mengisi

---

### Task 4.2 – Edge Case Handling

Tangani kondisi:
- Tidak ada peserta hadir
- Semua sudah mengisi
- API error parsial (skip, jangan fail all)

**Output:** sistem tetap stabil

---

## PHASE 5 — Message Builder

### Task 5.1 – Buat Formatter Pesan Grup

Buat module:
```
src/utils/reminderMessageBuilder.js
```

Harus menghasilkan:
- Pesan jika ada yang belum
- Pesan jika semua sudah
- Pesan jika tidak ada kehadiran

**Output:** pesan final siap kirim

---

## PHASE 6 — Scheduler Baru (System-Level)

### Task 6.1 – Buat Daily System Job

- Gunakan `node-cron`
- Schedule: `20:00 Asia/Jakarta`
- Tidak berbasis command

Contoh:
```
cron.schedule('0 20 * * *', dailyInternReminder)
```

**Output:** job aktif 1x per hari

---

### Task 6.2 – Integrasi dengan clientManager

- Gunakan `safeSendMessage`
- Kirim **SATU pesan ke grup**
- Group ID hard-coded via env

**Output:** pesan terkirim aman

---

## PHASE 7 — DRY RUN MODE (WAJIB)

### Task 7.1 – Implement DRY_RUN Flag

- Gunakan env:
```
DRY_RUN=true
```

Jika aktif:
- Jangan kirim WA
- Log hasil ke console / file

**Output:** simulasi aman

---

### Task 7.2 – Logging Output Dry Run

Contoh output:
```
[DRY RUN]
Date: YYYY-MM-DD
Belum Mengisi:
- Andi
- Siti
```

**Output:** hasil dapat diverifikasi manual

---

## PHASE 8 — Production Readiness

### Task 8.1 – Switch ke Live Mode

- Set:
```
DRY_RUN=false
```

- Monitor 2–3 hari

---

### Task 8.2 – Safety Checklist

- [ ] 1 pesan per hari
- [ ] Tidak mention pribadi
- [ ] Tidak ada retry spam
- [ ] Error API tidak crash bot

---

## 🧠 Final Notes for Agent AI

- Jangan refactor besar-besaran
- Jangan menyentuh schema lama kecuali reminder
- Reminder baru = **system responsibility**, bukan user feature
- Fokus pada **correctness > cleverness**

---

## ✅ End of Task File

Dokumen ini siap dieksekusi oleh Agent AI secara bertahap.