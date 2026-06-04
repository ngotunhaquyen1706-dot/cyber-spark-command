# CDP-GROUP1 · Firmware ESP32 (WiFi build)

File `esp32_cdp_wifi.ino` = firmware gốc của các bạn (giữ nguyên I2S, máy
trạng thái, ngưỡng tin cậy, blanking) + **WiFi + WebSocket** để Dashboard
web nhận data thật.

## 1. Cài thư viện (Arduino IDE → Library Manager)
- **WebSockets** by Markus Sattler  (arduinoWebSockets)
- **ArduinoJson** v6+ by Benoit Blanchon
- Board ESP32 (Espressif)
- Thư viện model Edge Impulse đã có sẵn từ file ZIP của bạn:
  `ei-esp32_stt_recognition-(-cdp)-arduino-1.0.5-impulse-#1.zip`
  → Sketch → Include Library → Add .ZIP Library…

## 2. Sửa WiFi trong file `.ino`
Mở `esp32_cdp_wifi.ino`, dòng ~45:

```cpp
#define WIFI_MODE_STA   1                  // 1 = nối WiFi nhà, 0 = ESP32 phát AP
#define WIFI_SSID       "TEN_WIFI_CUA_BAN"
#define WIFI_PASS       "MAT_KHAU_WIFI"
#define WIFI_AP_SSID    "CDP-GROUP1-ESP32" // dùng khi STA fail hoặc MODE=0
#define WIFI_AP_PASS    "12345678"
```

## 3. Nạp & lấy IP
- Mở Serial Monitor 115200 baud, ESP32 sẽ in:
  `[WiFi] OK. IP = 192.168.x.x`
- Nếu chọn AP: laptop kết WiFi `CDP-GROUP1-ESP32` (pass `12345678`), IP mặc định **192.168.4.1**.

## 4. Kết web với mạch
Trên Dashboard → trang **Settings** → nhập IP vừa lấy, port **81** → Save.
TopBar sẽ chuyển sang **🟢 LIVE** trong vài giây.

## 5. Giao thức JSON (đã code sẵn)
ESP32 → Web:
```json
{ "voice":  { "word": "bật", "conf": 0.92 } }
{ "motor":  { "dir": "F", "speed": 60 } }
{ "system": { "rssi": -52, "cpu": 22, "latency": 8 } }
{ "log":    "Trợ lý thức giấc — chờ lệnh 10s" }
```
Web → ESP32 (nút điều khiển tay & E-STOP):
```json
{ "cmd": "motor", "dir": "F", "speed": 60 }
{ "cmd": "estop" }
{ "cmd": "listen", "value": true }
```

## 6. Lưu ý HTTPS (Mixed Content)
Web `https://...lovable.app` mở từ HTTPS không gọi được `ws://` trực tiếp.
Cách demo nhanh:
- Mở web tại `http://localhost` (chạy local) — thoải mái dùng `ws://`.
- Hoặc trong Chrome: 🔒 → Site settings → Insecure content → Allow.

## 7. Sơ đồ chân — đúng theo `Bảng_sơ_đồ_đấu_nối_chi_tiết.docx`
| Linh kiện | Chân | ESP32 |
|---|---|---|
| INMP441 | SCK / WS / SD / L-R | 26 / 32 / 33 / 3.3V |
| LED Thu âm | + | GPIO 27 |
| LED Trợ lý | + | GPIO 14 |
| TB6612 PWMA | (kèm trở 10k↓GND) | GPIO 12 |
| TB6612 STBY / AIN1 | 3.3V | |
| TB6612 AIN2 | GND | |
| TB6612 VM | + Pin 7.4V | |
| TB6612 AO1/AO2 | Quạt 5V | |
| Tụ 10 µF | EN ESP32 ↔ GND | |
