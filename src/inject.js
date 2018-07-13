var browser = browser || chrome;

function addScript(url) {
    var elem = document.createElement('script');
    elem.src = browser.extension.getURL(url);
    document.body.appendChild(elem);
}

function addCss(url) {
    var elem = document.createElement('link');
    elem.rel = 'stylesheet';
    elem.type = 'text/css';
    elem.href = browser.extension.getURL(url);
    document.head.appendChild(elem);
}

addCss('style.css');
addScript('dygraph.js');
// addScript('synchronizer.js');
addScript('creeptd-stats.js');
