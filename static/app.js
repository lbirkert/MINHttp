let cache = {};

function changePage(pathname, changeHistory) {
    console.log("Loading page " + pathname);

    for(let pagename of Object.keys(config)) {
        let page = config[pagename];
        if(pathname == base + pagename || pathname == base + page.root || !page.exact && pathname.startsWith(base + page.root)) {
            if(changeHistory) window.history.pushState({}, "", base + page.root);

            if(cache[page.file]) loadMHtml(cache[page.file], page);
            else {
                var xhttp = new XMLHttpRequest();
                xhttp.responseType = "arraybuffer";
                xhttp.onreadystatechange = ()=>{
                    if (xhttp.readyState == 4) {
                        if(xhttp.status == 200) {
                            cache[page.file] = new Uint8Array(xhttp.response);
                            loadMHtml(cache[page.file], page);
                        } else document.body.innerHTML = "<h1>ERROR</h1><p>Page registered but not found on Server! Please contact an administrator!</p>";
                    } 
                };
                xhttp.open("GET", base + page.file, true);
                xhttp.send();
            }
            return;
        }
    }

    window.history.pushState({}, "", pathname);
    
    if(!config["/404.html"]) document.body.innerHTML = "<h1>404 not found</h1><p>If your an administrator, make sure to compile a 404.html too!</p>";
    else changePage("/404.html", false);
}

function loadMHtml(mhtml, page) {
    document.body.innerHTML = "";
    document.title = page.title;

    state = 0;
    let el = [document.body];
    for(let i = 0; i < mhtml.length; i++) {
        let c = mhtml[i];

        if(c==0xFF) el.pop();
        else if(c==0xFE) {
            let a = attr[mhtml[++i]];
            let l = mhtml[++i];
            let v = String.fromCharCode(...mhtml.slice(++i, i+l));
            el[el.length-1].setAttribute(a, v);
            i += l-1;
        } else if(c==0xFD) {
            c = mhtml[++i];
            let txt = document.createTextNode(String.fromCharCode(...mhtml.slice(++i, i+c)));
            el[el.length-1].appendChild(txt);
            i += c-1;
        } else {
            let nel = document.createElement(sel[c]);
            el[el.length-1].appendChild(nel);
            el.push(nel);
        }
    }

    addAListeners();
}

function addAListeners() {
    for(let el of document.querySelectorAll("a")) 
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            changePage(e.target.pathname, true);
        });
}

document.addEventListener("DOMContentLoaded", ()=>changePage(window.location.pathname, true));


window.onpopstate = (e)=>changePage(window.location.pathname);