const { remote } = require("electron");
const { Menu, MenuItem } = remote;
const path = require("path");
const fs = require("fs");

// State vars
var gDirPath;
var gPicList;
var gNowIndex;

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    var args = process.argv.slice(-1);
    var img_path = args[0];

    gDirPath = path.dirname(img_path);
    var tmp = getDirsAndPics(gDirPath);
    gPicList = tmp[1];
    gNowIndex = gPicList.indexOf(img_path);
    if(gNowIndex == -1)
        throw "gNowImgPath does not exist in gPicList, something error.";

    updateNowImage();
});

// Window concerned
window.addEventListener("resize", updateNowImage);

// Build right menu
const right_menu = new Menu();
right_menu.append(new MenuItem({
    label: "Exit",
    click: function() {
        remote.getCurrentWindow().close();
    }
}));
right_menu.append(new MenuItem({
    label: "Add bookmark",
    click: addBookmark
}));
window.addEventListener("contextmenu", function(e) {
    e.preventDefault();
    right_menu.popup({window: remote.getCurrentWindow()});
});

// Input process
window.addEventListener("mouseup", function(e) {
    var btnPressed = e.button;

    if(btnPressed == 0) {
        // Left button clicked
        nextImage();
    }
})

// HTML element control
//      These functions never directly access state vars.
function updateImageDiv(img_ele) {
    $("imageDiv").innerHTML = "";
    $("imageDiv").append(img_ele);
}

function createFullscreenImg(img_path) {
    return createImg(img_path, $("imageDiv").clientHeight, $("imageDiv").clientWidth);
}

// Content management
function updateNowImage() {
    var img_path = gPicList[gNowIndex];
    var img_ele = createFullscreenImg(img_path);
    updateImageDiv(img_ele);
}

function nextImage() {
    gNowIndex++;
    if(gNowIndex >= gPicList.length) {
        // TODO tell the user the last image has reached
        if(gPicList.length == 0)
            throw "gPicList is empty, something error.";
        gNowIndex = gPicList.length - 1;
        return;
    }
    updateNowImage();
}

function addBookmark() {
    // TODO add info to tell bookmark setting status
    // TODO Here we need a lock because metafile may be changed by several threads

    var metapath = path.join(gDirPath, "meta.comicviewermeta");
    var metadata = {};
    if(fs.existsSync(metapath)) {
        // Load if exists
        var filedata = fs.readFileSync(metapath);
        metadata = JSON.parse(filedata.toString());
    }

    metadata.bookmark = gPicList[gNowIndex];

    var metastr = JSON.stringify(metadata);
    fs.writeFileSync(metapath, metastr);

    console.log("Bookmark added.");
}