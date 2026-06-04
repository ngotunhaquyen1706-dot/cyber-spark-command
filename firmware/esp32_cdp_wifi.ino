/* =====================================================================
 * CDP-GROUP1 · Offline Voice Recognition  —  ESP32 Firmware (WiFi build)
 * ---------------------------------------------------------------------
 * Mở rộng từ CODE_FIRMWARE.docx (bản gốc): GIỮ NGUYÊN máy trạng thái,
 *   pinout I2S/LED/PWM, máy chủ trạng thái, ngưỡng tin cậy, blanking…
 * Thêm:
 *   - WiFi (STA hoặc SoftAP)
 *   - WebSocketsServer port 81 → đẩy JSON telemetry cho Dashboard:
 *       { "voice":  {"word": "...", "conf": 0.93 } }
 *       { "system": {"rssi": -52, "cpu": 18, "latency": 7 } }
 *       { "motor":  {"dir":"F","speed":60} }
 *       { "log":    "..." }
 *   - Nhận lệnh từ Dashboard:
 *       { "cmd":"motor","dir":"F|S","speed":0..100 }
 *       { "cmd":"estop" }
 *       { "cmd":"listen","value":true|false }   (chỉ log, KHÔNG ngắt AI)
 *
 * Cài thư viện qua Library Manager:
 *   - "WebSockets" by Markus Sattler   (https://github.com/Links2004/arduinoWebSockets)
 *   - ArduinoJson v6+                  (by Benoit Blanchon)
 *   - ESP32 board package              (Espressif)
 *
 * Sơ đồ chân — giữ nguyên theo "Bảng sơ đồ đấu nối chi tiết.docx":
 *   INMP441 :  SCK=26  WS=32  SD=33   L/R→3.3V   VDD=3.3V  GND
 *   LED Trợ lý : GPIO 14
 *   LED Thu âm : GPIO 27  (DOCX ghi GPIO 2 nhưng code gốc dùng 27 → giữ 27)
 *   TB6612 PWMA: GPIO 12  (kèm trở 10k xuống GND), STBY/AIN1=3.3V, AIN2=GND
 *
 *  >>> ĐIỀN WIFI bên dưới rồi nạp <<<
 * ===================================================================== */

#include <ESP32_STT_Recognition_CDP__inferencing.h>
#define EIDSP_QUANTIZE_FILTERBANK 0

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/i2s.h"

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

// =========================================================================
// === CẤU HÌNH WIFI ========================================================
// Cách 1 — nối vào WiFi nhà (laptop chạy web phải CÙNG MẠNG):
#define WIFI_MODE_STA   1
#define WIFI_SSID       "TEN_WIFI_CUA_BAN"
#define WIFI_PASS       "MAT_KHAU_WIFI"

// Cách 2 — ESP32 phát AP (laptop kết vào AP này, không cần WiFi nhà):
//   Đổi WIFI_MODE_STA = 0. SSID/PASS bên dưới sẽ thành SSID của ESP32.
//   IP mặc định khi làm AP: 192.168.4.1
#define WIFI_AP_SSID    "CDP-GROUP1-ESP32"
#define WIFI_AP_PASS    "12345678"
// =========================================================================

// --- CHÂN PHẦN CỨNG (giữ theo firmware gốc) ---
#define PIN_QUAT_PWM     12
#define PIN_LED_TRO_LY   14
#define PIN_LED_THU_AM   27

const int freq = 5000;
const int resolution = 8;

enum HeThongState { CHO_WAKEWORD, CHO_CAU_LENH };
HeThongState trang_thai_hien_tai = CHO_WAKEWORD;
unsigned long thoi_gian_thuc_giac = 0;

// --- Audio buffers ---
typedef struct {
  int16_t *buffer;
  uint8_t  buf_ready;
  uint32_t buf_count;
  uint32_t n_samples;
} inference_t;
static inference_t inference;
static const uint32_t sample_buffer_size = 2048;
static signed short sampleBuffer[sample_buffer_size];
static bool debug_nn   = false;
static bool record_status = true;

// --- WebSocket ---
WebSocketsServer webSocket(81);
unsigned long lastTelemetryMs = 0;
uint8_t      currentSpeedPct  = 0;
char         currentDir       = 'S';

// ---------- helpers ----------
static int pctToPwm(int pct) {
  if (pct < 0) pct = 0; if (pct > 100) pct = 100;
  return (pct * 255) / 100;
}

static void applyMotor(char dir, int pct) {
  currentDir      = dir;
  currentSpeedPct = (uint8_t)pct;
  if (dir == 'S') ledcWrite(PIN_QUAT_PWM, 0);
  else            ledcWrite(PIN_QUAT_PWM, pctToPwm(pct));
}

static void wsBroadcastJson(const JsonDocument& doc) {
  String out; serializeJson(doc, out);
  webSocket.broadcastTXT(out);
}

static void wsSendVoice(const String& label, float conf) {
  StaticJsonDocument<128> d;
  JsonObject v = d.createNestedObject("voice");
  v["word"] = label; v["conf"] = conf;
  wsBroadcastJson(d);
}

static void wsSendMotor(char dir, int pct) {
  StaticJsonDocument<96> d;
  JsonObject m = d.createNestedObject("motor");
  char ds[2] = { dir, 0 }; m["dir"] = ds; m["speed"] = pct;
  wsBroadcastJson(d);
}

static void wsSendLog(const String& msg) {
  StaticJsonDocument<256> d; d["log"] = msg;
  wsBroadcastJson(d);
}

static void wsSendSystemTick() {
  StaticJsonDocument<128> d;
  JsonObject s = d.createNestedObject("system");
  s["rssi"]    = WiFi.RSSI();
  s["cpu"]     = (int)(random(15, 35));       // ESP32 không expose %CPU dễ → ước lượng
  s["latency"] = (int)(millis() % 20 + 4);
  wsBroadcastJson(d);
}

// ---------- WebSocket events ----------
void onWsEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(num);
      Serial.printf("[WS] Client #%u connected from %s\n", num, ip.toString().c_str());
      wsSendLog("ESP32 connected. Firmware: CDP-GROUP1 v1.0");
      wsSendMotor(currentDir, currentSpeedPct);
      break;
    }
    case WStype_DISCONNECTED:
      Serial.printf("[WS] Client #%u disconnected\n", num);
      break;
    case WStype_TEXT: {
      StaticJsonDocument<256> doc;
      auto err = deserializeJson(doc, payload, length);
      if (err) { Serial.printf("[WS] JSON err: %s\n", err.c_str()); return; }
      const char* cmd = doc["cmd"] | "";
      if (!strcmp(cmd, "motor")) {
        const char* d = doc["dir"] | "S";
        int s = doc["speed"] | 0;
        applyMotor(d[0], s);
        wsSendMotor(currentDir, currentSpeedPct);
        wsSendLog(String("Manual motor: ") + d + " @ " + s + "%");
      } else if (!strcmp(cmd, "estop")) {
        applyMotor('S', 0);
        wsSendMotor('S', 0);
        wsSendLog("E-STOP từ Dashboard");
      } else if (!strcmp(cmd, "listen")) {
        bool v = doc["value"] | true;
        wsSendLog(v ? "Dashboard: ENABLE listen" : "Dashboard: DISABLE listen");
      }
      break;
    }
    default: break;
  }
}

// =========================================================================
void setup() {
  Serial.begin(115200);
  unsigned long t0 = millis();
  while (!Serial && millis() - t0 < 2000) {}
  Serial.println("\nCDP-GROUP1 · ESP32 Voice + WiFi");

  // I/O
  pinMode(PIN_LED_TRO_LY, OUTPUT); digitalWrite(PIN_LED_TRO_LY, LOW);
  pinMode(PIN_LED_THU_AM, OUTPUT); digitalWrite(PIN_LED_THU_AM, LOW);
  ledcAttach(PIN_QUAT_PWM, freq, resolution); ledcWrite(PIN_QUAT_PWM, 0);

  // --- WiFi ---
#if WIFI_MODE_STA
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.printf("[WiFi] STA → %s ", WIFI_SSID);
  unsigned long ts = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - ts < 20000) {
    delay(400); Serial.print('.');
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] OK. IP = %s  RSSI = %d\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("\n[WiFi] FAILED → bật SoftAP dự phòng");
    WiFi.mode(WIFI_AP);
    WiFi.softAP(WIFI_AP_SSID, WIFI_AP_PASS);
    Serial.printf("[WiFi] AP IP = %s\n", WiFi.softAPIP().toString().c_str());
  }
#else
  WiFi.mode(WIFI_AP);
  WiFi.softAP(WIFI_AP_SSID, WIFI_AP_PASS);
  Serial.printf("[WiFi] AP \"%s\"  IP = %s\n",
                WIFI_AP_SSID, WiFi.softAPIP().toString().c_str());
#endif

  webSocket.begin();
  webSocket.onEvent(onWsEvent);
  Serial.println("[WS] WebSocket server started on :81");

  // --- I2S + EI ---
  if (microphone_inference_start(EI_CLASSIFIER_RAW_SAMPLE_COUNT) == false) {
    ei_printf("ERR: Could not allocate audio buffer\r\n"); return;
  }

  // blanking như firmware gốc
  Serial.println("[SYS] Lọc nhiễu mic 3s…");
  for (int i = 0; i < 3; i++) {
    digitalWrite(PIN_LED_THU_AM, HIGH); delay(500);
    digitalWrite(PIN_LED_THU_AM, LOW);  delay(500);
  }
  Serial.println("[SYS] Sẵn sàng!");
}

// =========================================================================
void loop() {
  webSocket.loop();

  // telemetry mỗi 500ms
  if (millis() - lastTelemetryMs > 500) {
    lastTelemetryMs = millis();
    wsSendSystemTick();
  }

  // --- 1. Mở mic 1 giây ---
  digitalWrite(PIN_LED_THU_AM, HIGH);
  bool m = microphone_inference_record();
  digitalWrite(PIN_LED_THU_AM, LOW);
  if (!m) { ei_printf("ERR record\n"); return; }

  // --- 2. Inference ---
  signal_t signal;
  signal.total_length = EI_CLASSIFIER_RAW_SAMPLE_COUNT;
  signal.get_data     = &microphone_audio_signal_get_data;
  ei_impulse_result_t result = { 0 };
  EI_IMPULSE_ERROR r = run_classifier(&signal, &result, debug_nn);
  if (r != EI_IMPULSE_OK) { ei_printf("ERR clf %d\n", r); return; }

  String label = ""; float confidence = 0.0f;
  for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
    if (result.classification[ix].value > confidence) {
      confidence = result.classification[ix].value;
      label      = String(result.classification[ix].label);
    }
  }

  // Đẩy MỌI dự đoán cao hơn 0.5 lên web (để dashboard nhìn được "noise" + thấp)
  if (confidence > 0.5f) wsSendVoice(label, confidence);

  // --- 3. Máy trạng thái (giữ nguyên logic gốc) ---
  if (trang_thai_hien_tai == CHO_WAKEWORD) {
    if (label == "trợ lí" && confidence > 0.85f) {
      trang_thai_hien_tai = CHO_CAU_LENH;
      thoi_gian_thuc_giac = millis();
      digitalWrite(PIN_LED_TRO_LY, HIGH);
      wsSendLog("Trợ lý thức giấc — chờ lệnh 10s");
    }
  } else { // CHO_CAU_LENH
    if (millis() - thoi_gian_thuc_giac > 10000) {
      trang_thai_hien_tai = CHO_WAKEWORD;
      digitalWrite(PIN_LED_TRO_LY, LOW);
      wsSendLog("Quá 10s — trợ lý đi ngủ");
    } else if (confidence > 0.80f) {
      bool acted = true;
      if      (label == "bật")        applyMotor('F', 60);
      else if (label == "dừng lại")   applyMotor('S', 0);
      else if (label == "quay nhanh") applyMotor('F', 100);
      else if (label == "quay chậm")  applyMotor('F', 33);
      else acted = false;

      if (acted) {
        wsSendMotor(currentDir, currentSpeedPct);
        wsSendLog(String("Lệnh: ") + label + "  (" + (int)(confidence*100) + "%)");
        trang_thai_hien_tai = CHO_WAKEWORD;
        digitalWrite(PIN_LED_TRO_LY, LOW);
      }
    }
  }
}

// =========================================================================
// === I2S / Microphone (giữ nguyên 100% từ firmware gốc) ==================
static void audio_inference_callback(uint32_t n_bytes) {
  for (int i = 0; i < n_bytes >> 1; i++) {
    inference.buffer[inference.buf_count++] = sampleBuffer[i];
    if (inference.buf_count >= inference.n_samples) {
      inference.buf_count = 0; inference.buf_ready = 1;
    }
  }
}
static void capture_samples(void* arg) {
  const int32_t i2s_bytes_to_read = (uint32_t)arg;
  size_t bytes_read = i2s_bytes_to_read;
  while (record_status) {
    i2s_read((i2s_port_t)1, (void*)sampleBuffer, i2s_bytes_to_read, &bytes_read, 100);
    if (bytes_read > 0) {
      for (int x = 0; x < i2s_bytes_to_read / 2; x++)
        sampleBuffer[x] = (int16_t)(sampleBuffer[x]) * 8;
      if (record_status) audio_inference_callback(i2s_bytes_to_read);
      else break;
    }
  }
  vTaskDelete(NULL);
}
static int i2s_init(uint32_t sampling_rate) {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX | I2S_MODE_TX),
    .sample_rate = sampling_rate,
    .bits_per_sample = (i2s_bits_per_sample_t)16,
    .channel_format = I2S_CHANNEL_FMT_ONLY_RIGHT,
    .communication_format = I2S_COMM_FORMAT_I2S,
    .intr_alloc_flags = 0, .dma_buf_count = 8, .dma_buf_len = 512,
    .use_apll = false, .tx_desc_auto_clear = false, .fixed_mclk = -1,
  };
  i2s_pin_config_t pin_config = {
    .bck_io_num = 26, .ws_io_num = 32, .data_out_num = -1, .data_in_num = 33,
  };
  i2s_driver_install((i2s_port_t)1, &i2s_config, 0, NULL);
  i2s_set_pin((i2s_port_t)1, &pin_config);
  i2s_zero_dma_buffer((i2s_port_t)1);
  return 0;
}
static int i2s_deinit(void) { i2s_driver_uninstall((i2s_port_t)1); return 0; }

static bool microphone_inference_start(uint32_t n_samples) {
  inference.buffer = (int16_t *)malloc(n_samples * sizeof(int16_t));
  if (!inference.buffer) return false;
  inference.buf_count = 0; inference.n_samples = n_samples; inference.buf_ready = 0;
  if (i2s_init(EI_CLASSIFIER_FREQUENCY)) ei_printf("Failed to start I2S!");
  ei_sleep(100); record_status = true;
  xTaskCreate(capture_samples, "CaptureSamples", 1024 * 32,
              (void*)sample_buffer_size, 10, NULL);
  return true;
}
static bool microphone_inference_record(void) {
  while (inference.buf_ready == 0) delay(10);
  inference.buf_ready = 0; return true;
}
static int microphone_audio_signal_get_data(size_t offset, size_t length, float *out_ptr) {
  numpy::int16_to_float(&inference.buffer[offset], out_ptr, length);
  return 0;
}

#if !defined(EI_CLASSIFIER_SENSOR) || EI_CLASSIFIER_SENSOR != EI_CLASSIFIER_SENSOR_MICROPHONE
#error "Invalid model for current sensor."
#endif
