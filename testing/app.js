function changePage(page, changeHistory) {
    console.log("Loading page " + page);
    if(!config[page]) {
        window.history.pushState({}, "", page.replace("/index.html", ""));
        if(!config["/404.html"]) document.body.innerHTML = "<h1>404 not found</h1><p>If your an administrator, make sure to compile a 404.html too!</p>";
        else changePage("/404.html", false);
    } else {
        let root = config[page].root;
        let file = config[page].file;

        if(changeHistory) window.history.pushState({}, "", base+root);

        var xhttp = new XMLHttpRequest();
        xhttp.responseType = "arraybuffer";
        xhttp.onreadystatechange = ()=>{
            if (xhttp.readyState == 4) {
                if(xhttp.status == 200) {
                    loadMHtml(new Uint8Array(xhttp.response));
                } else document.body.innerHTML = "<h1>ERROR</h1><p>Page registered but not found on Server! Please contact an administrator!</p>";
            } 
        };
        xhttp.open("GET", base + file, true);
        xhttp.send();
    }
}

function loadMHtml(mhtml) {
    document.body.innerHTML = "";

    state = 0;
    let el = [document.body];
    for(let i = 0; i < mhtml.length; i++) {
        let c = mhtml[i];

        if(c == 0) {
            c = mhtml[++i];
            if(c==0xFF) el.pop();
            else if(c==0xFE) {
                let a = attr[mhtml[++i]];
                let l = mhtml[++i];
                let v = String.fromCharCode(...mhtml.slice(++i, i+l));
                el[el.length-1].setAttribute(a, v);
                i += l;
            } else {
                let nel = document.createElement(sel[c]);
                el[el.length-1].appendChild(nel);
                el.push(nel);
            };
        } else {
            let txt = document.createTextNode(String.fromCharCode(...mhtml.slice(++i, i+c)));
            el[el.length-1].appendChild(txt);
            i += c-1;
        }
    }

    addAListeners();
}

function addAListeners() {
    for(let el of document.querySelectorAll("a")) {
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            let p = e.target.pathname;
            p = p.replace("//", "/");
            if(p.startsWith(base)) {
                changePage(p.substring(base.length).replace("index.html", "") + "index.html", true);
            } else window.location = e.target.href;
        });
    }
}

document.addEventListener("DOMContentLoaded", ()=>{
    let path = window.location.pathname;
    if(path.startsWith(base)) changePage(path.substring(base.length).replace("index.html", "") + "index.html", true);
});