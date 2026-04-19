const utilData = {};

browser.runtime.getPlatformInfo().then(platformInfo => {
	utilData.platformInfo = platformInfo;
	utilData.isAndroid = platformInfo.os === "android";
});

function isMobileBrowser() {
	return utilData.isAndroid ?? false;
}

function stringifyError(err) {
	return err instanceof Error ?`${err.name || "UnknownError"}: ${err.message || "(no message)"}\n${err.stack}` : "stringifyError: arg is not Error";
}

function parseUrls(strUrls)
{
	return typeof strUrls === "string" ? 
		strUrls.split(",").map(e => e.trim()).filter(e => e.length > 0) : [];
}

function convertMatchPatternToRegExpLiteral(pattern){
	if (pattern === "<all_urls>"){
		return new RegExp("^((https?|wss?|ftps?|data)://[^/]+|file://[^/]*)/.*");
	}
	const ng = "(?!)";
	try {
		let r = pattern.match(/^(\*|https?|wss?|ftps?|data|file):\/\/(\*|\*\.[^*\/]+|[^*\/]+)?(\/.*)/);
		if (! r){
			return ng;
		}
		let scheme = r[1], host = r[2], path = r[3], rs;
		// scheme
		if (scheme === "*"){
			rs = "(https?|wss?)";
		}
		else if (/^(https?|wss?|ftps?|data|file)$/.test(scheme)){
			rs = scheme;
		}
		else {
			return ng;
		}
		rs = "^" + rs + "://";
		// host
		if (typeof host === "undefined"){
			if (scheme != "file"){
				return ng;
			}
		}
		else if (host === "*"){
			rs += "[^/]" + (scheme === "file" ?  "*" : "+");
		}
		else if (/^\*\.[^*]+$/.test(host)){
			rs += "([^\\/\\.]+\\.)*" + host.substring(2).replace(/\./g, "\\.");
		}
		else if (/^[^*]+$/.test(host)){
			rs += host.replace(/\./g, "\\.");
		}
		else {
			return ng;
		}
		// path
		rs += path.replace(/\*/g, ".*") + "$";
		// 
		return rs;
	}
	catch(e){
		return ng;
	}
}

function isSupportedUrlPattern(pattern){
	const ng = "(?!)";
	return convertMatchPatternToRegExpLiteral(pattern) !== ng;
}

function convertMatchPatternToRegExp(pattern){
	return new RegExp(convertMatchPatternToRegExpLiteral(pattern));
}

function convertMatchPatternListToRegExp(patternList){
	return new RegExp(patternList.map(pattern => "(" + convertMatchPatternToRegExpLiteral(pattern) + ")").join("|"));
}

function onPrefersColorSchemeDarkChange(ev){
	if (utilData.colorScheme === "auto"){
		document.body.classList[ev.matches ? "add" : "remove"]("dark-mode");
	}
}

function setupColorScheme(colorScheme){
	utilData.colorScheme = colorScheme;
	if (colorScheme === "auto"){
		document.body.style.colorScheme = "light dark";
		document.body.classList[window.matchMedia("(prefers-color-scheme: dark)").matches ? "add" : "remove"]("dark-mode");
	}
	else {
		document.body.style.colorScheme = colorScheme;
		document.body.classList[colorScheme === "dark" ? "add" : "remove"]("dark-mode");
	}
}

function injectEditBoxCss() {
    if (utilData.editCssInjected) return;
    utilData.editCssInjected = true;

    const css = `
    .edit-overlay {
        position: absolute;
        z-index: 1000;
        background: Canvas;
        color: CanvasText;
        border: 1px solid;
        padding: 4px;
        border-radius: 4px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        box-sizing: border-box;
    }
    .edit-overlay textarea {
        width: 100%;
        height: 6em;
        font-size: inherit;
        box-sizing: border-box;
    }
    .edit-overlay .btn-area {
        margin-top: 4px;
        text-align: right;
    }
    .edit-overlay button {
        margin-left: 4px;
        font-size: inherit;
        padding: 0.1em 0.5em;
    }
    `;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
}

function showEditBoxForInput(input) {
    if (input.editInProgress) return;
    if (input.scrollWidth <= input.clientWidth) return;
    injectEditBoxCss();
    input.editInProgress = true;

	const rect = input.getBoundingClientRect();
	input.style.visibility = "hidden";

	const overlay = document.createElement("div");
	overlay.className = "edit-overlay";
	if (isMobileBrowser()) {
		const rule = input.closest(".rule"),
			ruleRect = rule.getBoundingClientRect();
		overlay.style.left = ruleRect.left + window.scrollX + "px";
		overlay.style.top = rect.top + window.scrollY + "px";
		overlay.style.width = ruleRect.width + "px";
	}
	else {
		overlay.style.left = rect.left + window.scrollX + "px";
		overlay.style.top = rect.top + window.scrollY + "px";
		overlay.style.width = rect.width + "px";
	}

    const ta = document.createElement("textarea");
    ta.value = input.value;
    overlay.appendChild(ta);

    const btnArea = document.createElement("div");
    btnArea.className = "btn-area";

    const btnCancel = document.createElement("button");
    btnCancel.textContent = "Cancel";

    const btnSave = document.createElement("button");
    btnSave.textContent = "Save";

    btnArea.appendChild(btnCancel);
    btnArea.appendChild(btnSave);
    overlay.appendChild(btnArea);

    document.body.appendChild(overlay);
    ta.focus();

    const close = () => {
        overlay.remove();
        input.style.visibility = "";
        //input.focus();
        input.editInProgress = false;
    };

    btnSave.addEventListener("click", () => {
        input.value = ta.value;
        close();
    });

    btnCancel.addEventListener("click", close);

    ta.addEventListener("keydown", ev => {
        if (ev.key === "Escape") {
            ev.preventDefault();
            close();
        }
    });
}
