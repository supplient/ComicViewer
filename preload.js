// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const {dialog, BrowserWindow} = require('electron').remote;
const fs = require("fs");
const path = require("path");

function $(id) {
    return document.getElementById(id);
}

function selectDirDialog(callback) {
    dialog.showOpenDialog({ properties: ['openDirectory'] }).then((dialog_select) => {
        var dir_path = dialog_select.filePaths[0];
        callback(dir_path);
    })
}

function createThumbnail(filepath, callback) {
    const max_height = 200;
    const max_width = 50;
    var img = new Image(max_width, max_height);
    img.src = urlEscape(filepath);
    img.onload = ()=>{
        var nat_height = img.naturalHeight;
        var nat_width = img.naturalWidth;
        var tmp = adjustWidthHeight(nat_width, nat_height, max_width, max_height);
        img.width = tmp[0];
        img.height = tmp[1];
        if(callback)
            callback(img);
    };
    return img;
}

function isDirectory(filepath) {
    var stat = fs.statSync(filepath);
    return stat.isDirectory();
}

function isPicture(filepath) {
    const valid_ext_list = [
        ".jpg", ".png", ".gif", 
    ];
    var file_ext = path.extname(filepath);
    for(var valid_ext of valid_ext_list) {
        if(valid_ext == file_ext)
            return true;
    }
    return false;
}

function createItemDiv(filepath, isDir) {
    var div = document.createElement("div");
    if(isDir)
        div.appendChild(createThumbnail("folder.png"));
    else
        div.appendChild(createThumbnail(filepath));
    var dirname = document.createElement("span");
    dirname.innerText = path.basename(filepath);
    div.appendChild(dirname);
    return div;
}

function createUpDirItem(updirpath) {
    var div = createDirItem(updirpath);
    div.childNodes[1].innerText = "..";
    return div;
}

function createDirItem(filepath) {
    var div = createItemDiv(filepath, true);
    div.ondblclick = (ev) => {
        changeNowDir(filepath);
    };
    return div;
}

function createPicItem(filepath) {
    var div = createItemDiv(filepath, false);
    div.ondblclick = (ev) => {
        const imgWindow = new BrowserWindow({
            fullscreen: true,
            webPreferences: {
                preload: path.join(__dirname, 'view_preload.js'),
                // nodeIntegration: true,
                // enableRemoteModule: true
                additionalArguments: [
                    filepath,
                ],
            },
        });

        // and load the index.html of the app.
        imgWindow.loadFile('view.html');

        imgWindow.webContents.openDevTools()
    }
    return div;
}

function changeNowDir(dir_path) {
    var files = fs.readdirSync(dir_path);
    $("imageSet").innerHTML = "";
    $("imageSet").append(createUpDirItem(path.dirname(dir_path)));

    for(var filepath of files) {
        filepath = path.join(dir_path, filepath);

        var thumb;
        if(isDirectory(filepath))
            thumb = createDirItem(filepath)
        else if(isPicture(filepath))
            thumb = createPicItem(filepath)
        else
            continue;
        
        $("imageSet").append(thumb);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    $("dirGetTest").onclick = () => {
        selectDirDialog((dir_path) => {
            $("rootDirPath").innerText = dir_path;
            changeNowDir(dir_path);
        });
    };

    $("fullscreenTest").onclick = () => {
        const mainWindow = new BrowserWindow({
            fullscreen: true,
            webPreferences: {
                // preload: path.join(__dirname, 'view_preload.js'),
                // nodeIntegration: true,
                // enableRemoteModule: true
            }
        });

        // and load the index.html of the app.
        mainWindow.loadFile('view.html');
    };

    console.log("test: " + isDirectory("test"));
    console.log("01.jpg: " + isDirectory("01.jpg"));

    console.log("01.jpg: " + isPicture("01.jpg"));
    console.log("index.html: " + isPicture("index.html"));
})
