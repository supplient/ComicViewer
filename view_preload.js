const { remote } = require("electron");
const { Menu, MenuItem } = remote;

var gNowImgPath;

function updateImageDiv(img_ele) {
    $("imageDiv").innerHTML = "";
    $("imageDiv").append(img_ele);
}

function createFullscreenImg(img_path) {
    return createImg(img_path, $("imageDiv").clientHeight, $("imageDiv").clientWidth);
}

window.addEventListener('DOMContentLoaded', () => {
    var args = process.argv.slice(-1);
    var img_path = args[0];
    gNowImgPath = img_path;

    onResize();
});

window.addEventListener("resize", onResize);

function onResize() {
    var img_ele = createFullscreenImg(gNowImgPath);
    updateImageDiv(img_ele);
}

// Build right menu
const right_menu = new Menu();
right_menu.append(new MenuItem({
    label: "Exit",
    click: function() {
        console.log("clicked");
        remote.getCurrentWindow().close();
    }
}));
window.addEventListener("contextmenu", function(e) {
    e.preventDefault();
    right_menu.popup({window: remote.getCurrentWindow()});
});