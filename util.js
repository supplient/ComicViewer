const {remote} = require("electron");
const {dialog} = remote;
const fs = require("fs");
const path = require("path");
const { dir } = require("console");
const { getPriority } = require("os");

//
// Constant configs
//

const META_FILENAME = "comicviewermeta.json";
const THUMB_FILENAME = "comicviewerthumb.thumb";
const PREVIEW_FILENAME = "comicviewerpreviewer.thumb";
const READ_DIR = "(0";
const FOLDER_THUMB_PATH = "folder.png";

//
// HTML concerned
//

function $(id) {
    return document.getElementById(id);
}

//
// Image concerned
//

function createImg(img_path, max_height, max_width, callback) {
    var canvas = document.createElement("canvas");
    canvas.width = max_width;
    canvas.height = max_height;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var img = new Image(max_width, max_height);
    img.src = urlEscape(img_path);
    img.onload = ()=>{
        var nat_height = img.naturalHeight;
        var nat_width = img.naturalWidth;
        var tmp = adjustWidthHeight(nat_width, nat_height, max_width, max_height);
        var dwidth = tmp[0];
        var dheight = tmp[1];
        canvas.width = dwidth;
        canvas.height = dheight;
        ctx.drawImage(img, 0, 0, dwidth, dheight); // TODO draw in center
        if(callback)
            callback(canvas, img);
    };
    return canvas;
}

function adjustWidthHeight(nat_width, nat_height, max_width, max_height) {
    var max_ratio = max_height / max_width;
    var width, height;
    if(nat_height <= max_height && nat_width <= max_width)
        return [nat_width, nat_height];

    var nat_ratio = nat_height / nat_width;
    if(nat_ratio > max_ratio) {
        height = max_height;
        width = max_height / nat_ratio;
    }
    else {
        width = max_width;
        height = max_width * nat_ratio;
    }
    return [width, height];
}

//
// Path concerned
//

function urlEscape(url) {
    url = url.replace("%", "%25");
    url = url.replace("+", "%2B");
    url = url.replace(" ", "%20");
    url = url.replace("#", "%23");
    url = url.replace("&", "%26");
    url = url.replace("=", "%3D");
    return url;
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

function getDirsAndPicsSync(dirpath) {
    var alldirents = fs.readdirSync(dirpath, {withFileTypes:true});
    var dirs = [];
    var pics = [];
    for(var dirent of alldirents) {
        var filepath = path.join(dirpath, dirent.name);
        if(dirent.isDirectory())
            dirs.push(filepath);
        else if(isPicture(dirent.name))
            pics.push(filepath);
    }
    return [dirs, pics];
}

function getFirstPicSync(dirpath) {
    var alldirents = fs.readdirSync(dirpath, {withFileTypes:true});
    for(var dirent of alldirents) {
        if(isPicture(dirent.name)) {
            var filepath = path.join(dirpath, dirent.name);
            return filepath;
        }
    }
}

//
// Metadata concerned
//

/*
metadata = {
    bookmark: string. path of the bookmark picture
    read: boolean. flag for has read up
}
*/
function getMetapath(dirpath) {
    return path.join(dirpath, META_FILENAME); 
}

function loadMeta(dirpath) {
    var metapath = getMetapath(dirpath);
    var metadata = {};
    if(fs.existsSync(metapath)) {
        // Load if exists
        var filedata = fs.readFileSync(metapath);
        metadata = JSON.parse(filedata.toString());
    }
    return metadata;
}

function saveMeta(dirpath, metadata) {
    var metapath = getMetapath(dirpath);
    var metastr = JSON.stringify(metadata);
    fs.writeFileSync(metapath, metastr);
}

/*
thumb
    just a compressed jpg
*/

function getThumbPath(dirpath) {
    return path.join(dirpath, THUMB_FILENAME);
}

function checkThumbExists(dirpath) {
    var thumbpath = getThumbPath(dirpath);
    return fs.existsSync(thumbpath);
}

function saveCanvas(canvas, filepath, quality) {
    var data = canvas.toDataURL("image/jpeg", quality);
    data = data.replace(/^data:image\/\w+;base64,/, "");
    var buf = new Buffer(data, "base64");
    fs.writeFile(filepath, buf, (err) => {
        if(err)
            throw err;
    });
}

function saveThumb(dirpath, canvas) {
    saveCanvas(canvas, getThumbPath(dirpath), 0.6);
}

/*
preview
    just a compressed jpg
*/

function getPreviewPath(dirpath) {
    return path.join(dirpath, PREVIEW_FILENAME);
}

function checkPreviewExists(dirpath) {
    var previewpath = getPreviewPath(dirpath);
    return fs.existsSync(previewpath);
}

function savePreview(dirpath, canvas) {
    saveCanvas(canvas, getPreviewPath(dirpath), 0.7);
}

//
// Infomation concerned
//
function showInfoAndUpdateInfoText(container_obj, text_obj, info_text) {
    text_obj.innerText = info_text;

    var infoContainer = container_obj;
    infoContainer.classList.add("infoShow");

    infoContainer.addEventListener("transitionend", (ev) => {
        var nowOpacity = window.getComputedStyle(infoContainer).opacity;
        if(nowOpacity == 1) {
            if(infoContainer.classList.contains("infoShow"))
                infoContainer.classList.remove("infoShow");
        }
    });
}

function askForCheck(check_str, title) {
    var msgBoxOptions = {
        type: "question",
        buttons: [
            "Yes", "No"
        ],
        message: check_str,
        cancelId: 1
    }
    if(title)
        msgBoxOptions.title = title;
    var checkReplay = dialog.showMessageBoxSync(msgBoxOptions);

    if(checkReplay == 0)
        return true;
    else if(checkReplay == 1)
        return false;
    else
        throw "Error, invalid checkReply: " + checkReplay.toString();
}