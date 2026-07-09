document.addEventListener("DOMContentLoaded", () => {
    // ĐƯỜNG DẪN FILE JSON TRÊN GITHUB CỦA BẠN (Thay đổi thông tin tài khoản của bạn tại đây)
    const JSON_URL = "https://vandekn.qzz.io/PRT-Store/app.json";

    const appGrid = document.querySelector(".app-grid");
    const downloadBtn = document.getElementById("download-btn");
    const urlInput = document.getElementById("url-input");
    const statusMsg = document.getElementById("status-message");
    
    let focusables = [];
    let focusIndex = 0;

    // 1. Hàm tự động kéo danh sách từ GitHub JSON và vẽ giao diện
    async function loadAppsFromGitHub() {
        try {
            statusMsg.innerText = "Đang đồng bộ ứng dụng từ hệ thống...";
            
            // Fetch chống lưu cache (luôn lấy file mới nhất khi bạn sửa trên GitHub)
            const response = await fetch(`${JSON_URL}?t=${new Date().getTime()}`);
            if (!response.ok) throw new Error("Không thể kết nối tới kho ứng dụng GitHub");
            
            const apps = await response.json();
            appGrid.innerHTML = ""; // Xóa dữ liệu cũ trống

            // Duyệt danh sách app từ file JSON
            apps.forEach(app => {
                const card = document.createElement("div");
                card.className = "app-card focusable";
                card.setAttribute("tabindex", "0"); // Cho phép điều khiển bằng remote focus vào
                card.setAttribute("data-url", app.url);
                card.innerHTML = `
                    <div class="app-icon">
                        <img src="${app.icon}" alt="${app.name}" onerror="this.src='https://placehold.co/100?text=App'">
                    </div>
                    <div class="app-info">
                        <h4>${app.name}</h4>
                        <p>${app.description}</p>
                    </div>
                `;
                
                // Sự kiện khi click/chọn vào Card app
                card.addEventListener("click", () => handleDownload(app.url));
                appGrid.appendChild(card);
            });

            statusMsg.innerText = "Đã cập nhật danh sách ứng dụng mới nhất.";
            
            // Kích hoạt lại tính năng điều hướng Remote TV cho phần tử mới sinh ra
            initRemoteControl();

        } catch (error) {
            console.error(error);
            statusMsg.innerText = "Lỗi kết nối máy chủ dữ liệu. Vui lòng kiểm tra mạng hoặc link JSON!";
        }
    }

    // 2. Hệ thống quản lý điều hướng Remote TV (Mũi tên điều hướng + Enter)
    function initRemoteControl() {
        focusables = document.querySelectorAll(".focusable");
        focusIndex = 0;
        
        if (focusables.length > 0) {
            focusables[0].focus();
        }
    }

    window.addEventListener("keydown", (e) => {
        if (focusables.length === 0) return;

        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) {
            e.preventDefault(); // Chặn hành vi cuộn trang web mặc định của TV
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
            document.activeElement.click(); // Kích hoạt click khi nhấn phím giữa Remote
        }
    });

    // 3. Xử lý logic tải file APK
    function handleDownload(url) {
        if (!url) {
            statusMsg.innerText = "Vui lòng nhập link file APK!";
            return;
        }
        
        statusMsg.innerText = "Đang tải xuống tệp tin APK...";

        if (window.cordova) {
            // Khi đã đóng gói thành APK TV (Môi trường Cordova) -> Tự động kích hoạt cài đặt
            downloadAndInstallAPK(url);
        } else {
            // Khi test thử trên trình duyệt máy tính -> Tải file thông thường về thư mục Download máy tính
            statusMsg.innerText = "Trình duyệt: Đang tải tệp về máy tính...";
            const a = document.createElement("a");
            a.href = url;
            a.download = url.split('/').pop();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    // 4. Hàm Native (Chỉ chạy khi đã port sang APK) - Tải file và kích hoạt cài đặt tự động
    function downloadAndInstallAPK(url) {
        const fileTransfer = new FileTransfer();
        const fileName = url.split('/').pop();
        // Lưu tệp vào thư mục Tải xuống cục bộ của Android TV
        const fileURL = cordova.file.externalRootDirectory + "Download/" + fileName;

        fileTransfer.download(
            url,
            fileURL,
            function(entry) {
                statusMsg.innerText = "Tải thành công! Đang tự động mở trình cài đặt...";
                
                // Sử dụng Plugin FileOpener2 để bật bảng cài đặt của hệ điều hành Android TV lên
                cordova.plugins.fileOpener2.open(
                    entry.toURL(),
                    'application/vnd.android.package-archive',
                    {
                        error: (e) => { statusMsg.innerText = 'Lỗi thực thi cài đặt: ' + e.message; },
                        success: () => { statusMsg.innerText = 'Đã mở trình cài đặt hệ thống.'; }
                    }
                );
            },
            function(error) {
                statusMsg.innerText = "Lỗi tải file hệ thống. Mã lỗi: " + error.code;
            },
            false
        );
    }

    // Lắng nghe nút tải thủ công khi nhập URL bằng tay
    downloadBtn.addEventListener("click", () => {
        handleDownload(urlInput.value.trim());
    });

    // Tự động kích hoạt hệ thống lấy dữ liệu khi khởi động app
    loadAppsFromGitHub();
});
