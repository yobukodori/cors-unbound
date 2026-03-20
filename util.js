const utilData = {};

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
