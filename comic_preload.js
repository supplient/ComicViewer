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
    var tmp = getDirsAndPicsSync(gDirPath);
    gPicList = tmp[1];
    gNowIndex = gPicList.indexOf(img_path);
    if(gNowIndex == -1)
        throw "gNowImgPath does not exist in gPicList, something error.";

    updateNowImage();

    var metadata = loadMeta(gDirPath);
    if(metadata.read)
        switchToUnreadMenuItem();
    else
        switchToReadMenuItem();
});

// Window concerned
window.addEventListener("resize", updateNowImage);

// Build right menu
const right_menu = new Menu();
right_menu.append(new MenuItem({
    label: "Previous",
    click: prevImage
}));
right_menu.append(new MenuItem({
    label: "Add Bookmark",
    click: addBookmark
}));
var read_menu_item = new MenuItem({
    label: "Mark Read",
    click: markRead
});
var unread_menu_item = new MenuItem({
    label: "Mark Unread",
    click: markUnread
});
right_menu.append(read_menu_item);
right_menu.append(unread_menu_item);
right_menu.append(new MenuItem({
    label: "Exit",
    click: function() {
        remote.getCurrentWindow().close();
    }
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
});
window.addEventListener("wheel", (ev) => {
    if(ev.deltaY>0)
        prevImage();
    else
        nextImage();
});
window.addEventListener("keyup", (ev) => {
    if(ev.key == "ArrowUp")
        prevImage();
    else if(ev.key == "ArrowDown")
        nextImage();
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

function switchToReadMenuItem() {
    read_menu_item.enabled = true;
    unread_menu_item.enabled = false;
}

function switchToUnreadMenuItem() {
    unread_menu_item.enabled = true;
    read_menu_item.enabled = false;
}

// Content management
function updateNowImage() {
    var img_path = gPicList[gNowIndex];
    var img_ele = createFullscreenImg(img_path);
    updateImageDiv(img_ele);
}

function prevImage() {
    gNowIndex--;
    if(gNowIndex < 0) {
        updateInfo("已到第一页");
        if(gPicList.length == 0)
            throw "gPicList is empty, something error.";
        gNowIndex = 0;
        return;
    }
    updateNowImage();
}

function nextImage() {
    gNowIndex++;
    if(gNowIndex >= gPicList.length) {
        updateInfo("已到最后一页");
        if(gPicList.length == 0)
            throw "gPicList is empty, something error.";
        gNowIndex = gPicList.length - 1;
        return;
    }
    updateNowImage();
}

function addBookmark() {
    // TODO Here we need a lock because metafile may be changed by several threads
    var metadata = loadMeta(gDirPath);
    var prevImgPath = metadata.bookmark;
    var nowImgPath = gPicList[gNowIndex];
    if(prevImgPath) {
        var messageStr = "";
        messageStr = "将书签从\"" + prevImgPath + "\"更新为\"" + nowImgPath + "\"?";
        if(!askForCheck(messageStr))
            return;
    }
    metadata.bookmark = nowImgPath;
    saveMeta(gDirPath, metadata);
    updateInfo("添加书签：" + nowImgPath);
}

function updateRead(hasRead) {
    // TODO Here we need a lock because metafile may be changed by several threads
    var metadata = loadMeta(gDirPath);
    metadata.read = hasRead;
    saveMeta(gDirPath, metadata);
}

function markRead() {
    updateRead(true);
    switchToUnreadMenuItem();
    updateInfo("标记为已读");
}

function markUnread() {
    updateRead(false);
    switchToReadMenuItem();
    updateInfo("标记为未读");
}

// Utils
function updateInfo(info_str) {
    showInfoAndUpdateInfoText($("infoContainer"), $("infoText"), info_str);
}