var iframe = document.getElementById('hyperfocus');

iframe.onload = function() {

var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

var iframeContent;

if (iframeDocument) {
    iframeContent = iframeDocument.getElementById('entries').innerHTML;
}

var container = document.getElementById('iframeContent');

if (container && iframeContent) {
    container.innerHTML = iframeContent;
}
};