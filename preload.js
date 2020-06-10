// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const {remote} = require("electron");
const {dialog, BrowserWindow, Menu, MenuItem} = remote;
const fs = require("fs");
const path = require("path");

function selectDirDialog(callback) {
    dialog.showOpenDialog({ properties: ['openDirectory'] }).then((dialog_select) => {
        var dir_path = dialog_select.filePaths[0];
        callback(dir_path);
    })
}

function createThumbnail(filepath, is_dir) {
    const max_height = 200;
    const max_width = 50;
    if(is_dir) {
        var dirs, pics;
        [dirs, pics] = getDirsAndPics(filepath);
        if(pics.length == 0)
            return createImg("folder.png", max_height, max_width);
        else
            return createImg(pics[0], max_height, max_width);
    }
    else 
        return createImg(filepath, max_height, max_width);
}

function createListItemDiv(filepath, is_dir) {
    var div = document.createElement("div");
    div.appendChild(createThumbnail(filepath, is_dir));
    var dirname = document.createElement("span");
    dirname.innerText = path.basename(filepath);
    div.appendChild(dirname);
    return div;
}

function createUpDirItem(updirpath) {
    var div = document.createElement("div");
    div.appendChild(createThumbnail("folder.png"));
    var dirname = document.createElement("span");
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

        const right_menu = new Menu();
        right_menu.append(new MenuItem({
            label: "From Bookmark",
            click: function() {
                var metadata = loadMeta(dirpath);
                if("bookmark" in metadata)
                    openImageViewWindow(metadata.bookmark);
                else {
                    // TODO info user this folder has no bookmark
                }
            }
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

    // and load the index.html of the app.
    imgWindow.loadFile('view.html');

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

    var dirs, pics;
    [dirs, pics] = getDirsAndPics(dir_path);

    for(var dir of dirs) {
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

window.addEventListener('DOMContentLoaded', () => {
    $("dirGetTest").onclick = () => {
        selectDirDialog((dir_path) => {
            $("rootDirPath").innerText = dir_path;
            changeNowDir(dir_path);
        });
    };

    // changeNowDir("D:/theothers/ACG/COMIC/ComicViewer/test/root/%#+ &=A9御姉流)]ソラノシタデ(ヨスガノソラ)~");
    changeNowDir("D:/theothers/ACG/COMIC/ComicViewer");
    switchToDirView();
})
