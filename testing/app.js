function changePage(page, changeHistory) {
    console.log(page);
    if(!config[page]) {
        if(!config["/404.html"]) document.body.innerHTML = "<h1>404 not found</h1><p>If your an administrator, make sure to compile a 404.html too!</p>";
        else changePage("/404.html", false);
    } else {
        let root = config[page].root;
        let file = config[page].file;
        if(changeHistory) window.history.pushState({}, "", base+root);

        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = ()=>{
            if (xhttp.readyState == 4 && xhttp.status == 200) loadMHtml(xhttp.responseText);
        };
        xhttp.open("GET", file, true);
        xhttp.send();
    }
}

function loadMHtml(mhtml) {
    console.log(mhtml);
}

function addAListener() {
    for(let el of document.querySelectorAll("a")) {
        console.log(el);
    }
}

document.addEventListener("DOMContentLoaded", ()=>changePage(window.location.pathname.substring(base.length).replace("index.html", "") + "index.html", true));