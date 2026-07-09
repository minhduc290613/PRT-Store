document.addEventListener("DOMContentLoaded", () => {
    // ĐỔI THÀNH LINK GITHUB CỦA BẠN
    const JSON_URL = "https://raw.githubusercontent.com/minhduc290613/PRT-Store/refs/heads/main/apps.json";

    const appGrid = document.querySelector(".app-grid");
    const downloadBtn = document.getElementById("download-btn");
    const urlInput = document.getElementById("url-input");
    const statusMsg = document.getElementById("status-message");
    
    let focusables = [];
    let focusIndex = 0;
    
    // Biến lưu trữ dữ liệu app để quét mã số
    let appDatabase = []; 

    // 1. Tải dữ liệu từ GitHub
    async function loadAppsFromGitHub() {
        try {
            statusMsg.innerText = "Đang đồng bộ dữ liệu...";
            const response = await fetch(`${JSON_URL}?t=${new Date().getTime()}`);
            if (!response.ok) throw new Error("Không thể kết nối");
            
            appDatabase = await response.json();
            appGrid.innerHTML = ""; 

            appDatabase.forEach(app => {
                const card = document.createElement("div");
                card.className = "app-card focusable";
                card.setAttribute("tabindex", "0");
                card.setAttribute("data-url", app.url);
                
                // Hiển thị cả tên, logo và mã số rút gọn trên giao diện
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
                
                card.addEventListener("click", () => handleDownload(app.url));
                appGrid.appendChild(card);
            });

            statusMsg.innerText = "Sẵn sàng tải xuống!";
            initRemoteControl();

        } catch (error) {
            console.error(error);
            statusMsg.innerText = "Lỗi kết nối máy chủ dữ liệu!";
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

    // 3. XỬ LÝ NHẬP MÃ SỐ HOẶC LINK
    downloadBtn.addEventListener("click", () => {
        let inputVal = urlInput.value.trim();
        
        if (!inputVal) {
            statusMsg.innerText = "Vui lòng nhập mã số hoặc link!";
            return;
        }

        // Nếu người dùng nhập link bắt đầu bằng http hoặc https
        if (inputVal.toLowerCase().startsWith("http")) {
            handleDownload(inputVal);
        } 
        // Nếu người dùng nhập mã số (Dò tìm trong file JSON)
        else {
            // Quét xem có app nào có mã code trùng với số người dùng nhập không
            const foundApp = appDatabase.find(app => app.code === inputVal);
            
            if (foundApp) {
                statusMsg.innerText = `Tìm thấy: ${foundApp.name}. Đang kết nối...`;
                // Nếu tìm thấy mã, gọi hàm tải với link tương ứng
                handleDownload(foundApp.url);
            } else {
                statusMsg.innerText = "❌ Mã số không tồn tại trong hệ thống!";
            }
        }
    });

    // 4. Chức năng tải và cài đặt
    function handleDownload(url) {
        statusMsg.innerText = "Đang tải xuống tệp tin APK...";

        if (window.cordova) {
            downloadAndInstallAPK(url);
        } else {
            statusMsg.innerText = "Trình duyệt: Đang tải tệp về máy tính...";
            const a = document.createElement("a");
            a.href = url;
            a.download = url.split('/').pop();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    function downloadAndInstallAPK(url) {
        const fileTransfer = new FileTransfer();
        const fileName = url.split('/').pop();
        const fileURL = cordova.file.externalRootDirectory + "Download/" + fileName;

        fileTransfer.download(
            url,
            fileURL,
            function(entry) {
                statusMsg.innerText = "Tải thành công! Đang mở bảng cài đặt...";
                cordova.plugins.fileOpener2.open(
                    entry.toURL(),
                    'application/vnd.android.package-archive',
                    {
                        error: (e) => { statusMsg.innerText = 'Lỗi thực thi cài đặt: ' + e.message; },
                        success: () => { statusMsg.innerText = 'Đã mở bảng cài đặt.'; }
                    }
                );
            },
            function(error) {
                statusMsg.innerText = "Lỗi tải tệp. Vui lòng thử lại!";
            },
            false
        );
    }

    loadAppsFromGitHub();
});
