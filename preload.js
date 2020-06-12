// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const {remote} = require("electron");
const {dialog, BrowserWindow, Menu, MenuItem} = remote;
const fs = require("fs");
const path = require("path");

const READ_DIR = "(0";
const FOLDER_THUMB_PATH = "folder.png";

var gShowRead = false;
var gNowDir;

function selectDirDialog(callback) {
    dialog.showOpenDialog({ properties: ['openDirectory'] }).then((dialog_select) => {
        var dir_path = dialog_select.filePaths[0];
        callback(dir_path);
    })
}

function createThumbnail(filepath, is_dir) {
    const THUMB_HEIGHT = 100;
    const THUMB_WIDTH = 100;
    const PREVIEW_HEIGHT = 500;
    const PREVIEW_WIDTH = 500;

    var img_path;
    if(is_dir) {
        var dirs, pics;
        [dirs, pics] = getDirsAndPics(filepath);
        if(pics.length == 0)
            img_path = FOLDER_THUMB_PATH;
        else
            img_path = pics[0];
    }
    else 
        img_path = filepath;

    var thumb_img;
    thumb_img = createImg(img_path, THUMB_HEIGHT, THUMB_WIDTH);
    thumb_img.className = "thumb";
    if(img_path != FOLDER_THUMB_PATH) {
        thumb_img.addEventListener("mouseenter", (ev) => {
            var previewContainer = $("previewContainer");
            previewContainer.innerHTML = "";
            var preview = createImg(img_path, PREVIEW_HEIGHT, PREVIEW_WIDTH);
            previewContainer.appendChild(preview);
            previewContainer.hidden = false;
        });
        thumb_img.addEventListener("mousemove", (ev) => {
            var previewContainer = $("previewContainer");
            previewContainer.style.left = ev.x.toString() + "px";
            previewContainer.style.top = ev.y.toString() + "px";
        });
        thumb_img.addEventListener("mouseleave", () => {
            var previewContainer = $("previewContainer");
            previewContainer.hidden = true;
        });
    }

    var div = document.createElement("div");
    div.className = "thumbContainer";
    div.appendChild(thumb_img);
    return div;
}

function createListItemDiv(filepath, is_dir) {
    var div = document.createElement("div");
    div.className = "item";
    div.appendChild(createThumbnail(filepath, is_dir));
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
    div.appendChild(createThumbnail(FOLDER_THUMB_PATH));
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
            label: "From Bookmark",
            click: function() {
                if("bookmark" in metadata)
                    openImageViewWindow(metadata.bookmark);
            },
            enabled: "bookmark" in metadata
        }));
        right_menu.popup({window: remote.getCurrentWindow()});
    });
    return div;
}

function openImageViewWindow(filepath) {
    const imgWindow = new BrowserWindow({
        fullscreen: true,
        webPreferences: {
            preload: path.join(__dirname, 'view_preload.js'),
            enableRemoteModule: true,
            nodeIntegration: true,
            additionalArguments: [
                filepath,
            ],
        },
    });
    imgWindow.removeMenu();
    imgWindow.loadFile('view.html');

    if(remote.getGlobal("debug_flag"))
        imgWindow.webContents.openDevTools()
}

function createPicItem(filepath) {
    var div = createListItemDiv(filepath, false);
    div.ondblclick = (ev) => {
        openImageViewWindow(filepath);
    }
    return div;
}

function changeNowDir(dir_path) {
    $("dirView").innerHTML = "";
    $("dirView").append(createUpDirItem(path.dirname(dir_path)));
    $("imageView").innerHTML = "";
    $("imageView").append(createUpDirItem(path.dirname(dir_path)));

    gNowDir = dir_path;

    var dirs, pics;
    [dirs, pics] = getDirsAndPics(dir_path);

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

    $("switchViewBtn").innerText = "Switch To ImageView";
    $("switchViewBtn").onclick = () => {
        switchToImageView();
    }
}

function switchToImageView() {
    $("imageView").hidden = false;
    $("dirView").hidden = true;

    $("switchViewBtn").innerText = "Switch To DirView";
    $("switchViewBtn").onclick = () => {
        switchToDirView();
    }
}

function updateInfo(info_str) {
    showInfoAndUpdateInfoText($("infoContainer"), $("infoText"), info_str);
}

window.addEventListener('DOMContentLoaded', () => {
    $("dirGetTest").onclick = () => {
        selectDirDialog((dir_path) => {
            $("rootDirPath").innerText = dir_path;
            changeNowDir(dir_path);
        });
    };
    $("infoTest").onclick = () => {
        updateInfo("INFOINFOINFOINFOINFOINFOINFOINFOINFOINFOINFOINFOINFOINFOINFOINFO");
    };
    $("checkTest").onclick = () => {
        if(askForCheck("Test check\nSelect one"))
            updateInfo("Yes");
        else
            updateInfo("No");
    };
    $("showRead").onclick = () => {
        gShowRead = $("showRead").checked;
        changeNowDir(gNowDir);
    };
    $("moveToReadBtn").onclick = () => {
        var nowReadDir = path.join(gNowDir, READ_DIR);
        var dirs, pics;
        [dirs, pics] = getDirsAndPics(gNowDir);

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

    changeNowDir("D:\\theothers\\ACG\\COMIC\\ComicViewer\\resources\\app\\test\\root");
    switchToDirView();
})