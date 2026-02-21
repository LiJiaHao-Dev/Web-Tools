document.addEventListener('DOMContentLoaded', () => {
    let base64Image = null;

    // 1. 设置默认时间
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('editTime').value = now.toISOString().slice(0,16);

    // 2. 面板折叠逻辑
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const targetId = header.getAttribute('data-target');
            document.getElementById(targetId).classList.toggle('active');
        });
    });

    // 3. 渲染机型列表
    const iphones = [
        'iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17 Plus', 'iPhone 17',
        'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16',
        'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
        'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
        'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini',
        'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini',
        'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
        'iPhone XS Max', 'iPhone XS', 'iPhone XR'
    ];

    const grid = document.getElementById('deviceGrid');
    iphones.forEach((model, index) => {
        const btn = document.createElement('button');
        btn.className = `btn-grid ${index === 0 ? 'active' : ''}`;
        btn.innerText = model;
        btn.onclick = () => {
            document.querySelectorAll('#deviceGrid .btn-grid').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('editModel').value = model;
            updateLensString();
        };
        grid.appendChild(btn);
    });

    // 4. 图片上传与 Canvas 强制格式化 (解决 PNG/截屏核心痛点)
    const fileInput = document.getElementById('fileInput');
    document.getElementById('uploadArea').onclick = () => fileInput.click();
    document.getElementById('reselectBtn').onclick = () => fileInput.click();
    document.getElementById('clearBtn').onclick = () => location.reload();

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // 绘制 Canvas 进行底层拦截转码
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');

                // 铺白底，防止透明 PNG 变黑图
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);

                // 强制转为高画质 JPG
                base64Image = canvas.toDataURL('image/jpeg', 1.0);

                // UI 更新
                document.getElementById('realThumbnail').src = base64Image;
                document.getElementById('uploadArea').classList.add('hidden');
                document.getElementById('selectedArea').classList.remove('hidden');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 5. 分辨率预设点击联动
    const resButtons = document.querySelectorAll('#resolutionGrid .btn-grid');
    const widthInput = document.getElementById('editWidth');
    resButtons.forEach(btn => {
        btn.onclick = () => {
            resButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            widthInput.value = btn.getAttribute('data-w');
            widthInput.dataset.h = btn.getAttribute('data-h');
        };
    });

    // 6. 镜头描述中文字符串生成
    function updateLensString() {
        const model = document.getElementById('editModel').value;
        const focal = document.getElementById('editFocal').value;
        const aperture = document.getElementById('editAperture').value;
        document.getElementById('editLens').value = `${model} 后置摄像头 — ${focal}mm f/${aperture}`;
    }
    document.getElementById('editModel').addEventListener('input', updateLensString);
    document.getElementById('editFocal').addEventListener('input', updateLensString);
    document.getElementById('editAperture').addEventListener('input', updateLensString);
    updateLensString();

    // 7. 导出处理逻辑 (包含 iOS 长按弹窗)
    document.getElementById('exportBtn').onclick = () => {
        if (!base64Image) {
            alert("老婆，你还没上传照片呢！");
            return;
        }

        try {
            const make = document.getElementById('editMake').value;
            const model = document.getElementById('editModel').value;
            const fNumber = parseFloat(document.getElementById('editAperture').value);
            const focal = parseFloat(document.getElementById('editFocal').value);
            const focal35 = parseInt(document.getElementById('editFocal35').value);
            const iso = parseInt(document.getElementById('editISO').value);
            const lensStr = document.getElementById('editLens').value;
            
            const imgWidth = parseInt(widthInput.value);
            const imgHeight = parseInt(widthInput.dataset.h || Math.round(imgWidth * 0.75));
            
            const dateVal = document.getElementById('editTime').value;
            const dateObj = new Date(dateVal);
            const formattedDate = dateObj.getFullYear() + ":" + 
                ("0" + (dateObj.getMonth() + 1)).slice(-2) + ":" + 
                ("0" + dateObj.getDate()).slice(-2) + " " + 
                ("0" + dateObj.getHours()).slice(-2) + ":" + 
                ("0" + dateObj.getMinutes()).slice(-2) + ":00";

            const zeroth = {};
            zeroth[piexif.ImageIFD.Make] = make;
            zeroth[piexif.ImageIFD.Model] = model;
            zeroth[piexif.ImageIFD.DateTime] = formattedDate;

            const exif = {};
            exif[piexif.ExifIFD.DateTimeOriginal] = formattedDate;
            
            // 解决中文导致报错的关键步骤
            const utf8Lens = unescape(encodeURIComponent(lensStr));
            exif[piexif.ExifIFD.LensModel] = utf8Lens;
            
            exif[piexif.ExifIFD.FNumber] = [Math.round(fNumber * 100), 100];
            exif[piexif.ExifIFD.FocalLength] = [Math.round(focal * 100), 100];
            exif[piexif.ExifIFD.FocalLengthIn35mmFilm] = focal35;
            exif[piexif.ExifIFD.ISOSpeedRatings] = iso;
            exif[piexif.ExifIFD.PixelXDimension] = imgWidth;
            exif[piexif.ExifIFD.PixelYDimension] = imgHeight;

            const exifObj = {"0th": zeroth, "Exif": exif};
            const exifStr = piexif.dump(exifObj);
            
            // 注入数据，生成终极成品图
            const newImage = piexif.insert(exifStr, base64Image);

            // ================= 唤起结果弹窗 =================
            const modal = document.getElementById('resultModal');
            const finalImg = document.getElementById('finalImage');
            const androidBtn = document.getElementById('androidDownloadBtn');

            finalImg.src = newImage;

            // 显示弹窗动画
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            setTimeout(() => modal.classList.remove('opacity-0'), 10);

            // 关闭弹窗
            document.getElementById('closeModalBtn').onclick = () => {
                modal.classList.add('opacity-0');
                setTimeout(() => {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                }, 300);
            };

            // 备用下载通道 (PC / 安卓)
            androidBtn.onclick = () => {
                const link = document.createElement("a");
                link.href = newImage;
                link.download = `IMG_EDITED_${Date.now()}.jpg`;
                link.click();
            };

        } catch (e) {
            console.error("导出异常：", e);
            alert("处理照片时出错了，请稍后重试。");
        }
    };
});
