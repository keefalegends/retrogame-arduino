#  Galactic Defender - Arduino Joystick Retro Game

Game arcade retro luar angkasa (**Galactic Defender**) yang dikendalikan langsung oleh **Arduino** menggunakan modul analog joystick **KY-023** melalui kabel USB (**Web Serial API**).

---

## 🕹️ Komponen yang Dibutuhkan
1. **Board Arduino** (Arduino Uno, Nano, Mega, dsb.)
2. **Modul Joystick Analog KY-023** (Dual Axis PS2 Thumbstick)
3. **5 buah kabel jumper** (Female-to-Male atau Male-to-Male)
4. **Kabel USB Arduino** ke Komputer
5. **Browser Modern** (Google Chrome atau Microsoft Edge)

---

## 🔌 Skema Rangkaian Pin (Wiring)

Hubungkan pin pada modul joystick **KY-023** ke pin **Arduino** sebagai berikut:

| Pin Modul KY-023 | Pin Arduino | Keterangan |
| :--- | :--- | :--- |
| **GND** | **GND** | Ground tegangan |
| **+5V** (VCC) | **5V** | Sumber daya 5 Volt |
| **VRx** | **A0** | Sumbu Horizontal (Analog 0 - 1023) |
| **VRy** | **A1** | Sumbu Vertikal (Analog 0 - 1023) |
| **SW** | **D2** | Tombol klik joystick (Digital Pullup) |

---

## 🛠️ Langkah-Langkah Menjalankan

### Langkah 1: Upload Program ke Arduino
1. Buka software **Arduino IDE**.
2. Buka file sketch: [`sketch_sep5a/sketch_sep5a.ino`](sketch_sep5a/sketch_sep5a.ino).
3. Pilih board Anda (misal: *Arduino Uno*) dan pilih **Port COM** yang sesuai di menu *Tools -> Port*.
4. Klik tombol **Upload** (tanda panah kanan).
5. Tunggu sampai muncul pesan *"Done uploading"*.

> **⚠️ PENTING:**  
> Jika Anda membuka **Serial Monitor** di Arduino IDE untuk mengetes, **PASTIKAN DITUTUP KEMBALI** sebelum menghubungkan ke game di browser, karena satu port COM USB hanya bisa diakses oleh satu aplikasi dalam satu waktu!

---

### Langkah 2: Buka Game di Browser
Ada dua cara mudah untuk membuka gamenya:

* **Cara A (Sangat Mudah):**  
  Cukup *double-click* file [`index.html`](index.html) atau drag-and-drop file tersebut ke **Google Chrome** / **Microsoft Edge**.
* **Cara B (Dengan Live Server VS Code):**  
  Klik kanan file `index.html` di VS Code lalu pilih **"Open with Live Server"** (atau klik tombol **Go Live** di pojok kanan bawah VS Code).

---

### Langkah 3: Sambungkan Joystick & Mainkan!
1. Di halaman game, klik tombol **"🔌 Hubungkan Arduino"** di pojok kanan atas.
2. Jendela pop-up browser akan muncul menampilkan daftar port USB. Pilih port Arduino Anda (misal: *USB-SERIAL CH340 (COM3)* atau *Arduino Uno (COM4)*), lalu klik **Connect**.
3. Status port akan berubah menjadi hijau: **TERSAMBUNG (115200)**.
4. Perhatikan indikator di HUD bawah: saat Anda menggerakkan joystick atau menekan tombolnya, titik joystick dan status tombol akan bergerak secara *real-time*!
5. Tekan tombol joystick (**SW**) atau tombol **Spasi** untuk memulai permainan dan menembak laser!

---

## 🎮 Kontrol Permainan

| Aksi | Kontrol Joystick Arduino | Fallback Keyboard PC |
| :--- | :--- | :--- |
| **Kemudi 360°** | Goyang joystick KY-023 ke segala arah | <kbd>W</kbd>, <kbd>A</kbd>, <kbd>S</kbd>, <kbd>D</kbd> / Tombol Panah |
| **Tembak Laser** | Tekan joystick ke dalam (Tombol SW) | <kbd>Spasi</kbd> (Spacebar) |
| **Balik Sumbu** | Tombol *Invert X* / *Invert Y* di layar | Tombol *Invert X* / *Invert Y* di layar |
| **Mute Audio** | Tombol *Audio ON/OFF* di layar | Tombol *Audio ON/OFF* di layar |

---

## ✨ Fitur Game
- **Zero Install Driver/App**: Menggunakan standar **Web Serial API** bawaan Google Chrome & Edge.
- **Synthesized 8-Bit Audio FX**: Efek suara tembakan laser, ledakan, dan power-up digenerate langsung secara matematis menggunakan **Web Audio API** (tanpa perlu download file audio eksternal).
- **Parallax Starfield & Dynamic Explosions**: Visual partikel retro arcade responsif 60 FPS.
- **Power-Ups**:
  - `+♥` (Shield): Menambah perisai nyawa pesawat.
  - `3X` (Triple Laser): Menembakkan 3 sinar laser sekaligus selama beberapa detik.
  - `💣` (Bomb): Ledakan nuklir yang menghancurkan semua meteor di layar.
- **High Score System**: Skor tertinggi otomatis tersimpan di browser (`localStorage`).
