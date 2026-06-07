/* =========================================================================
 *  CDP-GROUP1 · ESP32 Offline Voice Recognition + WiFi/WebSocket bridge
 *  Giữ NGUYÊN toàn bộ logic Edge Impulse / I2S / máy trạng thái của bản gốc,
 *  chỉ thêm WiFi + WebSocket để Dashboard web nhận data thật.
 *
 *  Thư viện cần cài trong Arduino IDE / PlatformIO / VSCode (Library Manager):
 *    - WebSockets       by Markus Sattler  (arduinoWebSockets)
 *    - ArduinoJson      v6+               by Benoit Blanchon
 *    - Board ESP32 (Espressif)
 *    - Model Edge Impulse: ESP32_STT_Recognition_CDP__inferencing.h  (.ZIP)
 * ========================================================================= */

#include <ESP32_STT_Recognition_CDP__inferencing.h>

#define EIDSP_QUANTIZE_FILTERBANK   0

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/i2s.h"

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

// =========================================================================
// --- CẤU HÌNH WIFI ---
// =========================================================================
#define WIFI_MODE_STA   1                       // 1 = nối WiFi nhà; 0 = ESP32 phát AP
#define WIFI_SSID       "TEN_WIFI_CUA_BAN"
#define WIFI_PASS       "MAT_KHAU_WIFI"
#define WIFI_AP_SSID    "CDP-GROUP1-ESP32"      // dùng khi STA fail hoặc MODE=0
#define WIFI_AP_PASS    "12345678"
#define WS_PORT         81

WebSocketsServer webSocket = WebSocketsServer(WS_PORT);
bool wsClientConnected = false;

// =========================================================================
// --- CẤU HÌNH CHÂN PHẦN CỨNG ---
// =========================================================================
#define PIN_QUAT_PWM    12   // PWM quạt (mắc trở 10k xuống GND)
#define PIN_LED_TRO_LY  14   // Đèn báo Trợ Lý
#define PIN_LED_THU_AM  27   // Đèn báo đang mở Mic

const int freq = 5000;
const int resolution = 8;

enum HeThongState { CHO_WAKEWORD, CHO_CAU_LENH };
HeThongState trang_thai_hien_tai = CHO_WAKEWORD;
unsigned long thoi_gian_thuc_giac = 0;

int  current_speed_pct = 0;     // 0..100, để gửi telemetry
char current_dir       = 'S';   // 'F' = quay, 'S' = dừng

// =========================================================================
// --- AUDIO BUFFERS ---
// =========================================================================
typedef struct {
    int16_t *buffer;
    uint8_t  buf_ready;
    uint32_t buf_count;
    uint32_t n_samples;
} inference_t;

static inference_t inference;
static const uint32_t sample_buffer_size = 2048;
static signed short   sampleBuffer[sample_buffer_size];
static bool           debug_nn      = false;
static bool           record_status = true;

// Forward declarations (cho VSCode/PlatformIO biên dịch chặt hơn)
static bool microphone_inference_start(uint32_t n_samples);
static bool microphone_inference_record(void);
static int  microphone_audio_signal_get_data(size_t offset, size_t length, float *out_ptr);
static void microphone_inference_end(void);
static int  i2s_init(uint32_t sampling_rate);
static int  i2s_deinit(void);

// =========================================================================
// --- WIFI / WEBSOCKET HELPERS ---
// =========================================================================
void wsSendJson(const JsonDocument& doc) {
    if (!wsClientConnected) return;
    String out;
    serializeJson(doc, out);
    webSocket.broadcastTXT(out);
}

void wsSendLog(const String& msg) {
    Serial.println(msg);
    StaticJsonDocument<256> d;
    d["log"] = msg;
    wsSendJson(d);
}

void wsSendVoice(const String& word, float conf) {
    StaticJsonDocument<128> d;
    JsonObject v = d.createNestedObject("voice");
    v["word"] = word;
    v["conf"] = conf;
    wsSendJson(d);
}

void wsSendMotor() {
    StaticJsonDocument<128> d;
    JsonObject m = d.createNestedObject("motor");
    m["dir"]   = String(current_dir);
    m["speed"] = current_speed_pct;
    wsSendJson(d);
}

void wsSendSystem() {
    StaticJsonDocument<128> d;
    JsonObject s = d.createNestedObject("system");
    s["rssi"]    = WiFi.RSSI();
    s["cpu"]     = (int)(ESP.getFreeHeap() / 1024);   // KB free heap (dùng tạm)
    s["latency"] = 0;
    wsSendJson(d);
}

void setFanSpeed(int pwm, const char* note) {
    ledcWrite(PIN_QUAT_PWM, pwm);
    current_speed_pct = map(pwm, 0, 255, 0, 100);
    current_dir = (pwm > 0) ? 'F' : 'S';
    wsSendLog(String("[PentaCore] -> ") + note);
    wsSendMotor();
}

void onWsEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_CONNECTED: {
            IPAddress ip = webSocket.remoteIP(num);
            wsClientConnected = true;
            Serial.printf("[WS] Client #%u connected from %s\n", num, ip.toString().c_str());
            wsSendLog("Dashboard connected");
            wsSendMotor();
            wsSendSystem();
            break;
        }
        case WStype_DISCONNECTED:
            Serial.printf("[WS] Client #%u disconnected\n", num);
            if (webSocket.connectedClients() == 0) wsClientConnected = false;
            break;
        case WStype_TEXT: {
            StaticJsonDocument<256> d;
            DeserializationError err = deserializeJson(d, payload, length);
            if (err) { Serial.println("[WS] Bad JSON from web"); return; }
            const char* cmd = d["cmd"] | "";
            if (strcmp(cmd, "motor") == 0) {
                int speed = d["speed"] | 0;          // 0..100
                int pwm   = constrain(map(speed, 0, 100, 0, 255), 0, 255);
                setFanSpeed(pwm, "Lệnh tay từ Web");
            } else if (strcmp(cmd, "estop") == 0) {
                setFanSpeed(0, "E-STOP từ Web");
                trang_thai_hien_tai = CHO_WAKEWORD;
                digitalWrite(PIN_LED_TRO_LY, LOW);
            }
            break;
        }
        default: break;
    }
}

void setupWifi() {
#if WIFI_MODE_STA
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    Serial.printf("[WiFi] Connecting to %s ", WIFI_SSID);
    unsigned long t0 = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) {
        delay(400); Serial.print(".");
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WiFi] OK. IP = %s\n", WiFi.localIP().toString().c_str());
        return;
    }
    Serial.println("\n[WiFi] STA fail -> fallback AP");
#endif
    WiFi.mode(WIFI_AP);
    WiFi.softAP(WIFI_AP_SSID, WIFI_AP_PASS);
    Serial.printf("[WiFi] AP: %s / %s  IP = %s\n",
        WIFI_AP_SSID, WIFI_AP_PASS, WiFi.softAPIP().toString().c_str());
}

// =========================================================================
// --- SETUP ---
// =========================================================================
void setup() {
    Serial.begin(115200);
    while (!Serial);
    Serial.println("\nEdge Impulse Inferencing Demo + WiFi");

    setupWifi();
    webSocket.begin();
    webSocket.onEvent(onWsEvent);
    Serial.printf("[WS] Server on port %d\n", WS_PORT);

    if (microphone_inference_start(EI_CLASSIFIER_RAW_SAMPLE_COUNT) == false) {
        ei_printf("ERR: Could not allocate audio buffer\r\n");
        return;
    }

    pinMode(PIN_LED_TRO_LY, OUTPUT);  digitalWrite(PIN_LED_TRO_LY, LOW);
    pinMode(PIN_LED_THU_AM, OUTPUT);  digitalWrite(PIN_LED_THU_AM, LOW);

    ledcAttach(PIN_QUAT_PWM, freq, resolution);
    ledcWrite(PIN_QUAT_PWM, 0);

    Serial.println("\n[HỆ THỐNG] Đang lọc nhiễu Micro khởi động (3s)...");
    for (int i = 0; i < 3; i++) {
        digitalWrite(PIN_LED_THU_AM, HIGH); delay(500);
        digitalWrite(PIN_LED_THU_AM, LOW);  delay(500);
    }
    Serial.println("[HỆ THỐNG] Đã sẵn sàng hoạt động!");
}

// =========================================================================
// --- LOOP ---
// =========================================================================
unsigned long last_sys_push = 0;

void loop() {
    webSocket.loop();

    // Telemetry hệ thống ~1s/lần
    if (millis() - last_sys_push > 1000) {
        last_sys_push = millis();
        wsSendSystem();
    }

    Serial.println("\n[ >>> ĐANG MỞ MIC (1s) - HÃY NÓI BÂY GIỜ! <<< ]");
    digitalWrite(PIN_LED_THU_AM, HIGH);

    bool m = microphone_inference_record();

    digitalWrite(PIN_LED_THU_AM, LOW);
    Serial.println("[ --- ĐÓNG MIC - AI ĐANG SUY LUẬN --- ]");

    if (!m) { ei_printf("ERR: Failed to record audio...\n"); return; }

    signal_t signal;
    signal.total_length = EI_CLASSIFIER_RAW_SAMPLE_COUNT;
    signal.get_data     = &microphone_audio_signal_get_data;
    ei_impulse_result_t result = { 0 };

    EI_IMPULSE_ERROR r = run_classifier(&signal, &result, debug_nn);
    if (r != EI_IMPULSE_OK) { ei_printf("ERR: classifier (%d)\n", r); return; }

    String label = "";
    float  confidence = 0.0;
    for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
        if (result.classification[ix].value > confidence) {
            confidence = result.classification[ix].value;
            label = String(result.classification[ix].label);
        }
    }

    // Gửi mọi kết quả lên web (kể cả noise / dưới ngưỡng) để Voice page hiện realtime
    wsSendVoice(label, confidence);

    // ===== MÁY TRẠNG THÁI =====
    if (trang_thai_hien_tai == CHO_WAKEWORD) {
        if (label == "trợ lí" && confidence > 0.85) {
            trang_thai_hien_tai = CHO_CAU_LENH;
            thoi_gian_thuc_giac = millis();
            digitalWrite(PIN_LED_TRO_LY, HIGH);
            wsSendLog("[PentaCore] -> Trợ lý đã thức giấc! Chờ lệnh 10s...");
        }
    } else { // CHO_CAU_LENH
        if (millis() - thoi_gian_thuc_giac > 10000) {
            trang_thai_hien_tai = CHO_WAKEWORD;
            digitalWrite(PIN_LED_TRO_LY, LOW);
            wsSendLog("[PentaCore] -> Quá 10s, trợ lý đi ngủ lại.");
        } else if (confidence > 0.80) {
            bool done = true;
            if      (label == "bật")        setFanSpeed(150, "BẬT QUẠT (60%)");
            else if (label == "dừng lại")   setFanSpeed(0,   "DỪNG LẠI (TẮT QUẠT)");
            else if (label == "quay nhanh") setFanSpeed(255, "QUAY NHANH (100%)");
            else if (label == "quay chậm")  setFanSpeed(85,  "QUAY CHẬM (33%)");
            else done = false;

            if (done) {
                trang_thai_hien_tai = CHO_WAKEWORD;
                digitalWrite(PIN_LED_TRO_LY, LOW);
            }
        }
    }
}

// =========================================================================
// --- I2S / MICROPHONE (giữ nguyên bản gốc) ---
// =========================================================================
static void audio_inference_callback(uint32_t n_bytes) {
    for (int i = 0; i < n_bytes >> 1; i++) {
        inference.buffer[inference.buf_count++] = sampleBuffer[i];
        if (inference.buf_count >= inference.n_samples) {
            inference.buf_count = 0;
            inference.buf_ready = 1;
        }
    }
}

static void capture_samples(void* arg) {
    const int32_t i2s_bytes_to_read = (uint32_t)arg;
    size_t bytes_read = i2s_bytes_to_read;
    while (record_status) {
        i2s_read((i2s_port_t)1, (void*)sampleBuffer, i2s_bytes_to_read, &bytes_read, 100);
        if (bytes_read > 0) {
            for (int x = 0; x < i2s_bytes_to_read / 2; x++) {
                sampleBuffer[x] = (int16_t)(sampleBuffer[x]) * 8;
            }
            if (record_status) audio_inference_callback(i2s_bytes_to_read);
            else break;
        }
    }
    vTaskDelete(NULL);
}

static bool microphone_inference_start(uint32_t n_samples) {
    inference.buffer = (int16_t *)malloc(n_samples * sizeof(int16_t));
    if (inference.buffer == NULL) return false;
    inference.buf_count = 0;
    inference.n_samples = n_samples;
    inference.buf_ready = 0;
    if (i2s_init(EI_CLASSIFIER_FREQUENCY)) ei_printf("Failed to start I2S!");
    ei_sleep(100);
    record_status = true;
    xTaskCreate(capture_samples, "CaptureSamples", 1024 * 32,
                (void*)sample_buffer_size, 10, NULL);
    return true;
}

static bool microphone_inference_record(void) {
    while (inference.buf_ready == 0) delay(10);
    inference.buf_ready = 0;
    return true;
}

static int microphone_audio_signal_get_data(size_t offset, size_t length, float *out_ptr) {
    numpy::int16_to_float(&inference.buffer[offset], out_ptr, length);
    return 0;
}

static void microphone_inference_end(void) {
    i2s_deinit();
    ei_free(inference.buffer);
}

static int i2s_init(uint32_t sampling_rate) {
    i2s_config_t i2s_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX | I2S_MODE_TX),
        .sample_rate = sampling_rate,
        .bits_per_sample = (i2s_bits_per_sample_t)16,
        .channel_format = I2S_CHANNEL_FMT_ONLY_RIGHT,
        .communication_format = I2S_COMM_FORMAT_I2S,
        .intr_alloc_flags = 0,
        .dma_buf_count = 8,
        .dma_buf_len = 512,
        .use_apll = false,
        .tx_desc_auto_clear = false,
        .fixed_mclk = -1,
    };
    i2s_pin_config_t pin_config = {
        .bck_io_num   = 26,
        .ws_io_num    = 32,
        .data_out_num = -1,
        .data_in_num  = 33,
    };
    i2s_driver_install((i2s_port_t)1, &i2s_config, 0, NULL);
    i2s_set_pin((i2s_port_t)1, &pin_config);
    i2s_zero_dma_buffer((i2s_port_t)1);
    return 0;
}

static int i2s_deinit(void) {
    i2s_driver_uninstall((i2s_port_t)1);
    return 0;
}

#if !defined(EI_CLASSIFIER_SENSOR) || EI_CLASSIFIER_SENSOR != EI_CLASSIFIER_SENSOR_MICROPHONE
#error "Invalid model for current sensor."
#endif
