---
name: Brainstorm CORS fix
overview: Phân tích nguyên nhân lỗi CORS khi gọi request trong Localman (Tauri) và các hướng xử lý — không implement, chỉ brainstorm và đề xuất.
todos: []
isProject: false
---

# Brainstorm: Lỗi CORS khi gọi request trong Localman

## 1. Hiện trạng

- **Luồng gọi HTTP:** [response-store.ts](src/stores/response-store.ts) `executeRequest` → [http-client.ts](src/services/http-client.ts) `executeHttp` → `getFetch()` chọn:
  - **Nếu Tauri:** `await import('@tauri-apps/plugin-http')` → `tauriFetch` (qua Rust, **không** chịu CORS trình duyệt).
  - **Nếu không Tauri:** `globalThis.fetch` (browser fetch → **chịu CORS**).
- **Nhận diện Tauri:** `isTauri()` = `typeof window !== 'undefined' && !!window.__TAURI__` ([http-client.ts](src/services/http-client.ts) L9–11).
- **Backend:** [lib.rs](src-tauri/src/lib.rs) đã register `tauri_plugin_http::init()`, [capabilities/default.json](src-tauri/capabilities/default.json) cho phép `http://`** và `https://`**.
- **Console trong ảnh:** CORS chặn script `http://localhost:1420/@vite/client` từ **origin 'null'**; thêm "Failed to fetch" trên UI.

---

## 2. Nguyên nhân có thể


| #     | Nguyên nhân                             | Giải thích ngắn                                                                                                                                                                                                                                             |
| ----- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | `**isTauri()` = false lúc gọi**         | WebView load xong nhưng `window.__TAURI__` chưa có hoặc khác cấu trúc (Tauri 2) → dùng `globalThis.fetch` → request tới gitlabs.inet.vn bị CORS (server không gửi `Access-Control-Allow-Origin` cho origin của WebView).                                    |
| **B** | **Vite dev + origin 'null'**            | Trong dev, WebView có thể có origin `null` (hoặc custom scheme). Vite mặc định không gửi `Access-Control-Allow-Origin: null` → chặn load `@vite/client` → script lỗi, app có thể không chạy đúng hoặc plugin-http không load → fallback sang browser fetch. |
| **C** | **Dynamic import plugin-http thất bại** | `await import('@tauri-apps/plugin-http')` throw (ví dụ do môi trường chưa sẵn sàng) → code không có `tauriFetch` → thực tế vẫn dùng browser fetch.                                                                                                          |
| **D** | **Hai lỗi độc lập**                     | (1) CORS với Vite chỉ ảnh hưởng dev (load script); (2) "Failed to fetch" là do request API thật sự dùng browser fetch vì A hoặc C. Cần xử lý cả hai nếu muốn dev ổn định.                                                                                   |


---

## 3. Các hướng xử lý

### Hướng 1: Củng cố dùng Tauri HTTP (ưu tiên cho request API)

- **Ý tưởng:** Đảm bảo mọi request từ app (khi chạy trong Tauri) luôn đi qua plugin-http, không rơi vào browser fetch.
- **Cách làm gợi ý:**
  - **Nhận diện Tauri chắc chắn hơn:** Thay vì chỉ `window.__TAURI__`, có thể thử gọi `invoke('plugin:http|...')` hoặc check `window.__TAURI_INTERNALS__` (nếu Tauri 2 expose). Nếu không có, dùng fallback chỉ khi chắc là browser (ví dụ `window.__TAURI__ === undefined` sau vài ms).
  - **Không fallback sang fetch khi đang trong Tauri:** Nếu `import('@tauri-apps/plugin-http')` throw, log rõ và set state lỗi (ví dụ "HTTP plugin unavailable") thay vì ngầm dùng `globalThis.fetch`.
  - **Cho phép cấu hình:** Env hoặc flag (dev-only) để bắt buộc dùng plugin-http khi chạy bằng `pnpm tauri dev`, tránh nhầm với browser.
- **Ưu:** Đúng kiến trúc "Tauri bypass CORS"; request tới gitlabs.inet.vn không còn phụ thuộc CORS trình duyệt.
- **Nhược:** Cần kiểm tra Tauri 2 inject `__TAURI__` lúc nào; nếu inject sau khi React chạy có thể cần delay hoặc retry.

### Hướng 2: Sửa Vite dev cho WebView origin 'null'

- **Ý tưởng:** Trong dev, Vite luôn cho phép origin mà WebView báo (kể cả `null`) để script và HMR load được, tránh app/plugin không load.
- **Cách làm gợi ý:** Trong [vite.config.ts](vite.config.ts), thêm `server.cors: { origin: true }` (hoặc `origin: ['null', 'http://localhost:1420']`) để Vite gửi `Access-Control-Allow-Origin` tương ứng.
- **Ưu:** Sửa lỗi CORS với `@vite/client`, app và plugin có thể load đúng trong dev.
- **Nhược:** Chỉ giải quyết phần dev; nếu request API vẫn dùng browser fetch (do A/C) thì vẫn cần Hướng 1.

### Hướng 3: Kết hợp (nên làm)

1. **Vite:** Bật CORS cho server dev (Hướng 2) để không còn chặn script khi origin là `null` hoặc localhost.
2. **http-client:** Củng cố nhận diện Tauri và không fallback sang browser fetch khi đang trong Tauri (Hướng 1); nếu plugin không load thì báo lỗi rõ.
3. **Kiểm tra thêm:** Chạy `pnpm tauri dev`, mở DevTools, trong console gõ `window.__TAURI__` trước khi bấm Send — nếu có object thì `isTauri()` đúng; nếu undefined thì đây là gốc của "Failed to fetch" và cần điều chỉnh detection hoặc thứ tự load script.

---

## 4. Rủi ro và lưu ý

- **YAGNI:** Không thêm proxy server hay backend chỉ để tránh CORS; plugin-http đã đủ nếu dùng đúng.
- **Thời điểm `__TAURI__`:** Tauri inject script có thể chạy sau bundle của bạn; nếu `getFetch()` chạy quá sớm (ví dụ ở top-level), có thể nhận false. Nên gọi `getFetch()` **lúc thực sự gửi request** (đã đúng trong `executeHttp`), không cache sớm ở module load.
- **Capabilities:** Đã có `https://`**; nếu sau này có host cụ thể bị chặn, kiểm tra lại [capabilities/default.json](src-tauri/capabilities/default.json).

---

## 5. Cách xác nhận nhanh

- Trong cửa sổ Tauri dev, Console:
  - `window.__TAURI__` → nếu `undefined` thì nguyên nhân A rất có khả năng.
  - Sau khi bấm Send, xem network: request tới gitlabs.inet.vn là do "fetch" từ page (browser) hay do Tauri (sẽ không thấy trong tab Network của WebView với cùng kiểu).
- Bật CORS cho Vite dev (Hướng 2), reload: nếu CORS với `@vite/client` biến mất và app vẫn "Failed to fetch" thì lỗi API là do đang dùng browser fetch (A/C).

---

## 6. Kết luận đề xuất

- **Nguyên nhân chính khả dĩ:** (A) `isTauri()` false trong WebView nên request đi qua browser fetch và bị CORS; hoặc (B) CORS với Vite khiến app/plugin không load đúng, gián tiếp dẫn tới dùng fetch.
- **Hành động đề xuất:** Làm Hướng 3: chỉnh Vite CORS cho dev + củng cố http-client (detection + không fallback sang fetch trong Tauri) + bước kiểm tra `window.__TAURI__` và CORS như trên. Không thêm proxy hay backend; giữ đúng kiến trúc "Tauri HTTP plugin bypass CORS".

