document.addEventListener('DOMContentLoaded', () => {
    let base64Image = null;

    // 1. 初始化当前时间
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

    // 3. 全系 iPhone 设备库 (从 17 倒序排到 XR)
    const iphones = [
        'iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17 Plus', 'iPhone 17',
        'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16',
        'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
        'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
        'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini',
        'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini',
        'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
        'iPhone XS Max', 'iPhone XS', 'iPhone XR',
        'iPhone SE (3rd Gen)', 'iPhone SE (2nd Gen)'
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

    // 4. 图片上传与交互事件
    const fileInput = document.getElementById('fileInput');
    
    document.getElementById('uploadArea').onclick = () => fileInput.click();
    document.getElementById('reselectBtn').onclick = () => fileInput.click();
    document.getElementById('clearBtn').onclick = () => location.reload();

    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
            alert("由于相册底层协议限制，请必须上传 JPG 格式的照片才能修改信息！");
            return;
        }
        const reader = new FileReader();
        reader.onload = function(event) {
            base64Image = event.target.result;
            document.getElementById('realThumbnail').src = base64Image;
            document.getElementById('uploadArea').classList.add('hidden');
            document.getElementById('selectedArea').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    });

    // 5. 分辨率按钮联动
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

    // 6. 镜头描述联动更新
    function updateLensString() {
        const model = document.getElementById('editModel').value;
        const focal = document.getElementById('editFocal').value;
        const aperture = document.getElementById('editAperture').value;
        document.getElementById('editLens').value = `${model} 后置摄像头 — ${focal}mm f/${aperture}`;
    }
    document.getElementById('editModel').addEventListener('input', updateLensString);
    document.getElementById('editFocal').addEventListener('input', updateLensString);
    document.getElementById('editAperture').addEventListener('input', updateLensString);
    updateLensString(); // 初始执行一次

    // 7. 导出处理逻辑
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
            const newImage = piexif.insert(exifStr, base64Image);

            const link = document.createElement("a");
            link.href = newImage;
            link.download = `IMG_EDITED_${Date.now()}.jpg`;
            link.click();

        } catch (e) {
            console.error("导出异常：", e);
            alert("处理照片时出错了！原因可能是图片格式不支持或者中文字符导致兼容问题。");
        }
    };
});