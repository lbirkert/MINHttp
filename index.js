const fs = require("fs");

function fatal(msg) {
    console.log("\033[38;2;255;50;50m[FATAL] \033[38;2;255;100;100m" + msg + "\033[0m");
    process.exit(1);
}

function info(msg) {
    console.log("\033[38;2;100;255;100m[INFO] \033[38;2;180;255;110m" + msg + "\033[0m");
}

function found(msg) {
    console.log("\033[38;2;230;230;80m[FOUND] \033[38;2;255;255;110m" + msg + "\033[0m");
}

function search(msg) {
    console.log("\033[38;2;255;200;100m[SEARCH] \033[38;2;255;220;100m" + msg + "\033[0m");
}


function requireExists(filename, displayname) {
    search("Looking for " + displayname + "...");
    if(fs.existsSync(filename)) {
        found(displayname + " found!\n");
    } else fatal(displayname + " doesn't exist!");
}

function requireDirectory(directory, displayname) {
    search("Looking for directory " + displayname + "...");
    if(fs.existsSync(directory) && fs.statSync(directory).isDirectory) {
        found("Directory " + directory + " found!\n");
    } else fatal("Directory " + displayname + " doesn't exist!");
}

function getArg(name, def) {
    const argv = process.argv;
    const argc = argv.length;
    for(let i = 0; i < argc; i++) {
        if(argv[i] == "-" + name) {
            console.log(argv[i+1]);
            return argv[i+1];
        }
    }
    return def;
}

const configFile = getArg("config", "config.mhttp");
const pagesDir = getArg("pages", "pages");
const publicDir = getArg("public", "public");

// \e[38;2;255;50;50m
info("MINHttp started...\n");

requireExists(configFile, configFile);

requireDirectory(pagesDir, pagesDir);

requireDirectory(publicDir, publicDir);

try {
    info("Parsing config...");
    const config = JSON.parse(fs.readFileSync(configFile));

    if(typeof config != "object") fatal("Config must be a json Object!");

    if(!config.pages) fatal("Config must contain pages!");

    console.log("");
    
    for(let page of Object.keys(config.pages)) {
        info("Minifying " + page);
        requireExists("pages/" + page, page);

    }
} catch(e) {
    fatal("Error parsing config! (" + e + ")");
}
