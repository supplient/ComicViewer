// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const {dialog, BrowserWindow} = require('electron').remote;
const fs = require("fs");
const path = require("path");

function selectDirDialog(callback) {
    dialog.showOpenDialog({ properties: ['openDirectory'] }).then((dialog_select) => {
        var dir_path = dialog_select.filePaths[0];
        callback(dir_path);
    })
}

function createThumbnail(img_path, callback) {
    const max_height = 200;
    const max_width = 50;
    return createImg(img_path, max_height, max_width, callback);
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

    // and load the index.html of the app.
    imgWindow.loadFile('view.html');

    imgWindow.webContents.openDevTools()
}

function createPicItem(filepath) {
    var div = createItemDiv(filepath, false);
    div.ondblclick = (ev) => {
        openImageViewWindow(filepath);
    }
    return div;
}

function changeNowDir(dir_path) {
    $("imageSet").innerHTML = "";
    $("imageSet").append(createUpDirItem(path.dirname(dir_path)));

    var dirs, pics;
    [dirs, pics] = getDirsAndPics(dir_path);

    for(var dir of dirs) {
        var thumb = createDirItem(dir);
        $("imageSet").append(thumb);
    }

    for(var pic of pics) {
        var thumb = createPicItem(pic);
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

    // changeNowDir("D:/theothers/ACG/COMIC/ComicViewer/test/root/%#+ &=A9御姉流)]ソラノシタデ(ヨスガノソラ)~");
    changeNowDir("D:/theothers/ACG/COMIC/ComicViewer");

    console.log("test: " + isDirectory("test"));
    console.log("01.jpg: " + isDirectory("01.jpg"));

    console.log("01.jpg: " + isPicture("01.jpg"));
    console.log("index.html: " + isPicture("index.html"));
})
