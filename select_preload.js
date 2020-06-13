// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const {remote} = require("electron");
const {dialog, BrowserWindow, Menu, MenuItem} = remote;
const fs = require("fs");
const path = require("path");

var gShowRead = false;
var gRootDir;
var gNowDir;

function selectDirDialog(callback) {
    dialog.showOpenDialog({ properties: ['openDirectory'] }).then((dialog_select) => {
        var dir_path = dialog_select.filePaths[0];
        callback(dir_path);
    })
}

function createThumb(filepath, is_dir) {
    const THUMB_HEIGHT = 100;
    const THUMB_WIDTH = 100;
    const PREVIEW_HEIGHT = 500;
    const PREVIEW_WIDTH = 500;

    var thumbPath=null, previewPath=null;

    // Check thumb & preview path
    if(is_dir) {
        if(checkThumbExists(filepath))
            thumbPath = getThumbPath(filepath);
        if(checkPreviewExists(filepath))
            previewPath = getPreviewPath(filepath);

        if(!thumbPath || !previewPath) {
            var firstPic = getFirstPicSync(filepath);
            if(firstPic) {
                if(!thumbPath)
                    thumbPath = firstPic;
                if(!previewPath)
                    previewPath = firstPic;
            }
            else {
                if(!thumbPath)
                    thumbPath = FOLDER_THUMB_PATH;
            }
        }
    }
    else {
        thumbPath = filepath;
        if(filepath != FOLDER_THUMB_PATH)
            previewPath = filepath;
    }

    // Load thumb
    var thumbImg;
    thumbImg = createImg(thumbPath, THUMB_HEIGHT, THUMB_WIDTH, (canvas, img) => {
        // If thumb not exists, create it.
        if(is_dir && !checkThumbExists(filepath))
            saveThumb(filepath, canvas);
    });

    // Set thumb class & event listeners
    thumbImg.className = "thumb";
    if(previewPath) {
        thumbImg.addEventListener("mouseenter", (ev) => {
            var previewContainer = $("previewContainer");
            // Clear
            previewContainer.innerHTML = "";
            // Load preview
            if(fs.existsSync(previewPath)) {
                // Since the preview draw and the previewpath get do not happen at the same time
                // We should have a double check
                var preview = createImg(previewPath, PREVIEW_HEIGHT, PREVIEW_WIDTH, (canvas, img) => {
                    // If preview not exists, create it
                    if(is_dir && !checkPreviewExists(filepath))
                        savePreview(filepath, canvas);
                });
                // Add to document
                previewContainer.appendChild(preview);
                previewContainer.hidden = false;
            }
        });
        thumbImg.addEventListener("mousemove", (ev) => {
            var previewContainer = $("previewContainer");
            // Calculate the proper position
            var x = ev.x;
            var y = ev.y;
            var preview = previewContainer.children[0];
            var width = preview.width;
            var height = preview.height;
            var screenWidth = document.body.offsetWidth;
            var screenHeight = document.body.offsetHeight;
            if(x+width>screenWidth && x+width-screenWidth > width-x) // Fix left or right
                x -= width;
            if(y+height>screenHeight) {
                // Search best y
                y = screenHeight-height;
            } 
            // Follow the mouse
            previewContainer.style.left = x.toString() + "px";
            previewContainer.style.top = y.toString() + "px";
        });
        thumbImg.addEventListener("mouseleave", () => {
            var previewContainer = $("previewContainer");
            // Hide if mouse move out
            previewContainer.hidden = true;
        });
    }

    // Add to document
    var div = document.createElement("div");
    div.className = "thumbContainer";
    div.appendChild(thumbImg);
    return div;
}

function createListItemDiv(filepath, is_dir) {
    var div = document.createElement("div");
    div.className = "item";
    div.appendChild(createThumb(filepath, is_dir));
    var dirname = document.createElement("span");
    dirname.className = "itemText";
    dirname.innerText = path.basename(filepath);
    dirname.title = path.basename(filepath);
    div.appendChild(dirname);
    return div;
}

function createUpDirItem(updirpath) {
    var div = document.createElement("div");
    div.className = "item";
    div.appendChild(createThumb(FOLDER_THUMB_PATH));
    var dirname = document.createElement("span");
    dirname.className = "itemText";
    dirname.innerText = "..";
    div.appendChild(dirname);
    div.addEventListener("dblclick", (ev) => {
        changeNowDir(updirpath);
    });
    return div;
}

function createDirItem(dirpath) {
    var div = createListItemDiv(dirpath, true);
    div.addEventListener("dblclick", (ev) => {
        changeNowDir(dirpath);
    });

    div.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();

        var metadata = loadMeta(dirpath);
        const right_menu = new Menu();
        right_menu.append(new MenuItem({
            label: "From Beginning",
            click: function() {
                var dirs, pics;
                [dirs, pics] = getDirsAndPicsSync(dirpath);
                if(pics.length == 0) {
                    updateInfo("This folder has no pictures.");
                    return;
                }
                openComicWindow(pics[0]);
            },
        }));
        right_menu.append(new MenuItem({
            label: "From Bookmark",
            click: function() {
                if("bookmark" in metadata)
                    openComicWindow(metadata.bookmark);
            },
            enabled: "bookmark" in metadata
        }));
        right_menu.append(new MenuItem({
            label: "Mark Read",
            click: function() {
                metadata.read = true;
                saveMeta(dirpath, metadata);
                updateInfo("标记\"" + path.basename(dirpath) + "\"为已读");
            },
            enabled: !metadata.read
        }));
        right_menu.append(new MenuItem({
            label: "Mark Unread",
            click: function() {
                metadata.read = false;
                saveMeta(dirpath, metadata);
                updateInfo("标记\"" + path.basename(dirpath) + "\"为未读");
            },
            enabled: !!metadata.read
        }));
        right_menu.popup({window: remote.getCurrentWindow()});
    });
    return div;
}

function openComicWindow(filepath) {
    const imgWindow = new BrowserWindow({
        fullscreen: true,
        webPreferences: {
            preload: path.join(__dirname, 'comic_preload.js'),
            enableRemoteModule: true,
            nodeIntegration: true,
            additionalArguments: [
                filepath,
            ],
        },
    });
    imgWindow.removeMenu();
    imgWindow.loadFile('comic.html');

    if(remote.getGlobal("debug_flag"))
        imgWindow.webContents.openDevTools()
}

function createPicItem(filepath) {
    var div = createListItemDiv(filepath, false);
    div.ondblclick = (ev) => {
        openComicWindow(filepath);
    }
    return div;
}

function changeNowDir(dir_path) {
    gNowDir = dir_path;

    $("dirView").innerHTML = "";
    $("imageView").innerHTML = "";
    if(gNowDir != gRootDir) {
        $("dirView").append(createUpDirItem(path.dirname(dir_path)));
        $("imageView").append(createUpDirItem(path.dirname(dir_path)));
    }

    var dirs, pics;
    [dirs, pics] = getDirsAndPicsSync(dir_path);

    for(var dir of dirs) {
        if(!gShowRead) {
            if(path.basename(dir) == READ_DIR)
                continue;
            var metadata = loadMeta(dir);
            if(metadata.read)
                continue;
        }
        var thumb = createDirItem(dir);
        $("dirView").append(thumb);
    }

    for(var pic of pics) {
        var thumb = createPicItem(pic);
        $("imageView").append(thumb);
    }

    if(dirs.length == 0)
        switchToImageView();
    else if(pics.length == 0)
        switchToDirView();
}

function switchToDirView() {
    $("imageView").hidden = true;
    $("dirView").hidden = false;

    $("switchViewBtn").innerText = "切换到图片视图";
    $("switchViewBtn").title = "在图片视图下只会显示图片，而不显示文件夹";
    $("switchViewBtn").onclick = () => {
        switchToImageView();
    }
}

function switchToImageView() {
    $("imageView").hidden = false;
    $("dirView").hidden = true;

    $("switchViewBtn").innerText = "切换到文件夹视图";
    $("switchViewBtn").title = "在文件夹视图下只会显示文件夹，而不显示图片";
    $("switchViewBtn").onclick = () => {
        switchToDirView();
    }
}

function updateInfo(info_str) {
    showInfoAndUpdateInfoText($("infoContainer"), $("infoText"), info_str);
}

function setRootDir(dirpath) {
    updateConfigItem("root", dirpath);
    gRootDir = dirpath;
    $("rootDirPath").innerText = dirpath;
    changeNowDir(dirpath);
}

window.addEventListener('DOMContentLoaded', () => {
    $("rootDirSetBtn").onclick = () => {
        selectDirDialog((dir_path) => {
            if(dir_path)
                setRootDir(dir_path);
        });
    };
    $("showRead").onclick = () => {
        gShowRead = $("showRead").checked;
        changeNowDir(gNowDir);
    };
    $("moveToReadBtn").onclick = () => {
        var nowReadDir = path.join(gNowDir, READ_DIR);
        if(!fs.existsSync(nowReadDir))
            fs.mkdirSync(nowReadDir);
        var dirs, pics;
        [dirs, pics] = getDirsAndPicsSync(gNowDir);

        // search read dirs
        var readDirs = [];
        for (const dir of dirs) {
            var metadata = loadMeta(dir);
            if(!metadata.read)
                continue;
            readDirs.push(dir);
        }

        // move to read dir
        var movedCount = 0;
        for (const dir of readDirs) {
            var newPath = path.join(nowReadDir, path.basename(dir));
            fs.rename(dir, newPath, () => {
                movedCount++;
                if(movedCount >= readDirs.length)
                    updateInfo("Moved " + movedCount.toString() + " directories to " + READ_DIR);
            });
        }
        if(gShowRead)
            changeNowDir(gNowDir);
    };
    $("clearCacheBtn").onclick = (ev) => {
        var dirs, pics;
        [dirs, pics] = getDirsAndPicsSync(gNowDir);
        for (const dir of dirs) {
            if(checkThumbExists(dir))
                fs.unlinkSync(getThumbPath(dir));
            if(checkPreviewExists(dir))
                fs.unlinkSync(getPreviewPath(dir));
        }
        updateInfo("Clear the cache.");
    };

    var rootPath = path.normalize("test/root");
    var configRootPath = getConfigItem("root");
    if(configRootPath)
        rootPath = configRootPath;
    setRootDir(rootPath);
    switchToDirView();
})