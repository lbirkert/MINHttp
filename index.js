const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const fs = require("fs-extra");
const path = require("path");
const nm = require("node-minify");

const crypto = require("crypto");

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

function success(msg) {
    console.log("\033[38;2;120;120;255m[SUCCESS] \033[38;2;150;150;255m" + msg + "\033[0m");
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
const outputDir = getArg("output", "testing");

const baseUrl = getArg("baseurl", "/testing");

info("MINHttp started...\n");

requireExists(configFile, configFile);

requireDirectory(pagesDir, pagesDir);

requireDirectory(publicDir, publicDir);

if(fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

(async ()=>{
    try {
        info("Parsing config...\n");
        const config = JSON.parse(fs.readFileSync(configFile));

        if(typeof config != "object") fatal("Config must be a json Object!");

        if(!config.pages) fatal("Config must contain pages!");

        console.log("");
        
        let tags = [];
        let attrs = [];
        let pages = {};

        for(let page of Object.keys(config.pages)) {
            const pagePath =  path.join(pagesDir, page);

            info("Minifying " + page);
            requireExists(pagePath, page);
            const newpage = page.replace(".html", ".mhtml");
            let { title } = await minifyHtml(fs.readFileSync(pagePath), path.join(outputDir, newpage), tags, attrs);

            let pg = config.pages[page];
            pages["/" + page] = {"root": pg.root, "file": "/" + newpage, "exact": pg.exact, "title": title};
        }

        info("Generating config...\n");

        let conf = "const sel = ";
        conf += JSON.stringify(tags);
        conf += "; const attr = ";
        conf += JSON.stringify(attrs);
        conf += "; const base = \"" + baseUrl + "\"; const config = ";
        conf += JSON.stringify(pages);
        conf += ";";


        const configPath = path.join(outputDir, "config.js");
        fs.writeFileSync(configPath, conf);
        fs.createReadStream("static/index.html").pipe(fs.createWriteStream(path.join(outputDir, "index.html")));

        info("Bundeling config...\n");
        bundleJS([configPath, "static/app.js"], path.join(outputDir, "app.js"));

        fs.rmSync(configPath);

        copyPublicDirectory();

        success("Successfuly minified!");
    } catch(e) {
        fatal("Error parsing config! (" + e + ")");
    }
})();


async function minifyHtml(html, outfile, tags, attrs) {
    let bytes = [];

    const dom = new JSDOM(html);
    const { document } = dom.window;

    let scripts = [];

    if(document.head.hasChildNodes()) {
        for(let node of document.head.childNodes) {
            if(["META", "LINK", "SCRIPT"].includes(node.tagName)) parseNode(node, bytes, tags, attrs, scripts);
        }
    }

    if(!scripts.length==0) {
        let bundleid = crypto.randomBytes(8).toString("hex");
        info("Bundeling " + bundleid + ".js from " + JSON.stringify(scripts) + "!\n");
        await bundleJS(scripts, path.join(outputDir, bundleid + ".js"));

        parseNode({
            tagName: "SCRIPT", 
            hasAttributes: ()=>true,
            hasChildNodes: ()=>false,
            attributes: [{name: "src", value: bundleid + ".js"}]
        }, bytes, tags, attrs, scripts);
    }

    if(document.body.hasChildNodes()) for(let node of document.body.childNodes) parseNode(node, bytes, tags, attrs, scripts);


    fs.writeFileSync(outfile, new Uint8Array(bytes));

    success("Minified " + outfile + "!\n\n");

    return { title: document.title };
}

function parseNode(node, bytes, tags, attrs, scripts) {
    if(node.tagName) {
        if(node.tagName == "SCRIPT" && node.src && !node.spc) {
            if(!node.src.includes("://")) {
                const p = path.join(publicDir, node.src);
                requireExists(p, p);
                scripts.push(p);
            }
        } else {
            if(!tags.includes(node.tagName)) tags.push(node.tagName);
            bytes.push(tags.indexOf(node.tagName));

            if(node.hasAttributes()) {
                for(let attr of node.attributes) {
                    bytes.push(0xFE);
                    if(!attrs.includes(attr.name)) attrs.push(attr.name);
                    bytes.push(attrs.indexOf(attr.name));
                    bytes.push(attr.value.length);
                    attr.value.split("").forEach(e=>bytes.push(e.charCodeAt(0)));
                }
            }

            if(node.hasChildNodes()) {
                for(let el of node.childNodes) {
                    parseNode(el, bytes, tags);
                }
            }

            bytes.push(0xFF);
        }
    } else {
        if(node.nodeValue.replace(" ", "").length == 0) return;
        bytes.push(0xFD);
        bytes.push(node.nodeValue.length);
        node.nodeValue.split("").forEach(e=>bytes.push(e.charCodeAt(0)));
    }
}

async function bundleJS(files, out) {
    await nm.minify({
        compressor: 'uglify-es',
        input: files,
        output: out
    });
}

function copyPublicDirectory() {
    info("Copying public directory...");
    fs.copy(publicDir, outputDir, {
        clobber: true,
        filter: n=>!n.endsWith("js")
    });
    success("Copied public directory!\n");
}