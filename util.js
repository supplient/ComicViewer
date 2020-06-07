const fs = require("fs");
const path = require("path");

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

function getDirsAndPics(dir_path) {
    var allpaths = fs.readdirSync(dir_path);
    var dirs = [];
    var pics = [];
    for(var filepath of allpaths) {
        filepath = path.join(dir_path, filepath);
        
        if(isDirectory(filepath))
            dirs.push(filepath);
        else if(isPicture(filepath))
            pics.push(filepath);
        else
            continue;
    }
    return [dirs, pics];
}

function $(id) {
    return document.getElementById(id);
}

function createImg(img_path, max_height, max_width, callback) {
    var img = new Image(max_width, max_height);
    img.src = urlEscape(img_path);
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

function urlEscape(url) {
    url = url.replace("+", "%2B");
    url = url.replace(" ", "%20");
    url = url.replace("%", "%25");
    url = url.replace("#", "%23");
    url = url.replace("&", "%26");
    url = url.replace("=", "%3D");
    return url;
}

function getMetapath(dirpath) {
    return path.join(dirpath, "meta.comicviewermeta"); 
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