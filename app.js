document.addEventListener("DOMContentLoaded", () => {
    // ĐỔI THÀNH LINK GITHUB THỰC TẾ CỦA BẠN
    const JSON_URL = "https://raw.githubusercontent.com/minhduc290613/PRT-Store/refs/heads/main/apps.json";

    const appGrid = document.querySelector(".app-grid");
    const downloadBtn = document.getElementById("download-btn");
    const urlInput = document.getElementById("url-input");
    const statusMsg = document.getElementById("status-message");
    
    let focusables = [];
    let focusIndex = 0;
    let appDatabase = []; 

    // 1. Tải dữ liệu từ GitHub (Đã nâng cấp bộ lọc lỗi)
    async function loadAppsFromGitHub() {
        try {
            statusMsg.innerText = "Đang đồng bộ dữ liệu...";
            // Gọi fetch lấy dữ liệu
            const response = await fetch(`${JSON_URL}?t=${new Date().getTime()}`);
            
            // Nếu link sai (404) hoặc không kết nối được
            if (!response.ok) {
                throw new Error(`Lỗi kết nối mạng! (Mã lỗi: ${response.status})`);
            }
            
            // Thử phân tích cú pháp JSON
            try {
                appDatabase = await response.json();
            } catch (jsonParseError) {
                // Nếu chạy vào đây nghĩa là Link đúng, nhưng file apps.json viết sai cú pháp
                throw new Error("❌ File apps.json bị lỗi cú pháp (Thừa/thiếu dấu phẩy hoặc ngoặc)!");
            }
            
            appGrid.innerHTML = ""; 

            appDatabase.forEach(app => {
                const card = document.createElement("div");
                card.className = "app-card focusable";
                card.setAttribute("tabindex", "0");
                card.setAttribute("data-url", app.url);
                
                card.innerHTML = `
                    <div class="app-icon">
                        <img src="${app.icon}" alt="${app.name}" onerror="this.src='https://placehold.co/100?text=App'">
                    </div>
                    <div class="app-info">
                        <div class="app-title-wrapper">
                            <h4>${app.name}</h4>
                            <span class="app-code-badge">Mã: ${app.code}</span>
                        </div>
                        <p>${app.description}</p>
                    </div>
                `;
                
                card.addEventListener("click", () => handleDownload(app.url, app.name));
                appGrid.appendChild(card);
            });

            statusMsg.innerText = "Sẵn sàng tải xuống!";
            initRemoteControl();

        } catch (error) {
            console.error(error);
            // Hiện thẳng thông báo chi tiết lỗi lên màn hình TV/Trình duyệt để sửa ngay
            statusMsg.innerText = error.message; 
        }
    }

    // 2. Logic điều khiển Remote TV
    function initRemoteControl() {
        focusables = document.querySelectorAll(".focusable");
        focusIndex = 0;
        if (focusables.length > 0) focusables[0].focus();
    }

    window.addEventListener("keydown", (e) => {
        if (focusables.length === 0) return;
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) {
            e.preventDefault(); 
        }

        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
            if (focusIndex < focusables.length - 1) {
                focusIndex++;
                focusables[focusIndex].focus();
            }
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
            if (focusIndex > 0) {
                focusIndex--;
                focusables[focusIndex].focus();
            }
        } else if (e.key === "Enter") {
            document.activeElement.click(); 
        }
    });

    // 3. XỬ LÝ KHI BẤM NÚT TẢI XUỐNG
    downloadBtn.addEventListener("click", () => {
        let inputVal = urlInput.value.trim();
        
        if (!inputVal) {
            statusMsg.innerText = "Vui lòng nhập mã số hoặc link!";
            return;
        }

        // Trường hợp 1: Người dùng nhập LINK trực tiếp
        if (inputVal.toLowerCase().startsWith("http")) {
            handleDownload(inputVal, " can_caidat");
        } 
        // Trường hợp 2: Người dùng nhập MÃ SỐ rút gọn
        else {
            const foundApp = appDatabase.find(app => app.code === inputVal);
            
            if (foundApp) {
                statusMsg.innerText = `Tìm thấy: ${foundApp.name}. Đang kết nối...`;
                // TRUYỀN ĐÚNG LINK VÀ TÊN CỦA APP ĐÃ TÌM THẤY
                handleDownload(foundApp.url, foundApp.name);
            } else {
                statusMsg.innerText = "❌ Mã số không tồn tại trên hệ thống!";
            }
        }
    });

    // 4. HÀM TẢI XUỐNG VÀ ÉP ĐUÔI FILE .APK
    function handleDownload(url, appName) {
        // Tự động chuyển đổi tên App thành dạng viết liền không dấu để làm tên file an toàn
        // Ví dụ: "SmartTube Stable" -> "SmartTube_Stable.apk"
        const safeName = appName ? appName.replace(/[^a-zA-Z0-9]/g, "_") : "ung_dung";
        const fileName = `${safeName}.apk`;

        statusMsg.innerText = `Đang tải xuống: ${fileName}...`;

        if (window.cordova) {
            // Chạy trên Android TV (Cordova)
            downloadAndInstallAPK(url, fileName);
        } else {
            // Chạy thử nghiệm trên trình duyệt Máy tính -> Ép trình duyệt phải lưu file đuôi .apk
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName; 
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    // 5. HÀM NATIVE ĐÓNG GÓI APK (Tự động chạy khi port sang TV)
    function downloadAndInstallAPK(url, fileName) {
        const fileTransfer = new FileTransfer();
        // Ép đường dẫn lưu trữ luôn luôn kết thúc bằng tên file .apk chuẩn
        const fileURL = cordova.file.externalRootDirectory + "Download/" + fileName;

        fileTransfer.download(
            url,
            fileURL,
            function(entry) {
                statusMsg.innerText = "Tải xong! Đang mở trình cài đặt...";
                cordova.plugins.fileOpener2.open(
                    entry.toURL(),
                    'application/vnd.android.package-archive',
                    {
                        error: (e) => { statusMsg.innerText = 'Lỗi mở file: ' + e.message; },
                        success: () => { statusMsg.innerText = 'Đã mở bảng cài đặt hệ thống.'; }
                    }
                );
            },
            function(error) {
                statusMsg.innerText = "Lỗi tải file APK. Vui lòng kiểm tra lại Link gốc!";
            },
            false
        );
    }

    loadAppsFromGitHub();
});
