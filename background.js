let my = {
	os : "n/a", // mac|win|android|cros|linux|openbsd
	defaultTitle: "CORS for Me",
	initialized: null,
	settings: {},
	enableAtStartup: false,
	enabled : false,
	debug: false,
	requests : {},
	rules: [],
	rulesString: "[]",
	userAgent: "",
	filterUrls: [],
	filterTypes: ["xmlhttprequest"],
	requestCounter: 0,
	appliedCounter: 0,
	//====================================================
	init : function(platformInfo)
	{
		my.initialized = new Promise((resolve, reject)=>{
			try {
				let man = browser.runtime.getManifest();
				if (man.browser_action && man.browser_action.default_title)
					my.defaultTitle = man.browser_action.default_title;
				my.os = platformInfo.os;

				browser.browserAction.onClicked.addListener(function(){
					my.toggle();
				});
				my.updateButton();
				browser.runtime.onMessage.addListener(my.onMessage);

				browser.storage.local.get(["enableAtStartup","printDebugInfo","colorScheme", "rules"])
				.then((pref) => {
					my.updateSettings(pref, pref.enableAtStartup);
					resolve();
				})
				.catch(err=>{
					reject(err);
				});
			}
			catch(e){
				reject(e.message);
			}
		});
	},
	//====================================================
	updateSettings : function(pref, fEnable)
	{
		my.settings = pref;
		my.enableAtStartup = pref.enableAtStartup || false;
		my.debug = pref.printDebugInfo || false;
		my.rules = pref.rules || [];
		const rulesString = JSON.stringify(my.rules);
		let filterUrls = [], filterTypes = [];
		my.rules.forEach(rule =>{
			const ng = "(?!)";
			const urls = [... new Set(parseUrls(rule.originUrls))];
			if (my.debug) my.log("origin urls: [" + urls + "]");
			rule.originUrlsRegExp = convertMatchPatternListToRegExp(urls);
			if (rule.originUrlsRegExp.toString().includes(ng)){
				my.log(`warning: invalid origin URL pattern: [${urls}]`);
			}
			else if (my.debug) my.log("rule.originUrlsRegExp: "+rule.originUrlsRegExp);
			rule.targets.forEach(target =>{
				const urls = [... new Set(parseUrls(target.targetUrls))];
				if (my.debug) my.log("target urls: [" + urls + "]");
				target.urlsRegExp = convertMatchPatternListToRegExp(urls);
				if (target.urlsRegExp.toString().includes(ng)){
					my.log(`warning: invalid target URL pattern: [${urls}]`);
				}
				else if (my.debug) my.log("target.urlsRegExp: "+target.urlsRegExp);
				target.typeSet = new Set(target.types);
				filterUrls = filterUrls.concat(urls);
				filterTypes = filterTypes.concat(target.types);
			});
		});
		filterUrls = [... new Set(filterUrls)];
		if (my.filterUrls.length !== filterUrls.length || my.filterUrls.some((v,i)=> v !== filterUrls[i])){
			my.filterUrls = filterUrls;
			my.log("filterUrls changed to ["+my.filterUrls + "]");
		}
		filterTypes = [... new Set(filterTypes)];
		if (my.filterTypes.length !== filterTypes.length || my.filterTypes.some((v,i)=> v !== filterTypes[i])){
			my.filterTypes = filterTypes;
			my.log("filterTypes changed to ["+my.filterTypes + "]");
		}
		if (rulesString !== my.rulesString){
			 my.rulesString = rulesString;
			let prev_enabled = my.enabled;
			if (my.enabled)
				my.toggle(false);
			if (my.filterUrls.length > 0){
				if (prev_enabled || fEnable)
					my.toggle(true);
			}
			my.log("rules changed to "+my.rulesString);
		}
	},
	//====================================================
	log : function(str)
	{
		browser.runtime.sendMessage({type:"log",str:str}).catch(err=>{});
	},
	//====================================================
	onMessage : function(message, sender, sendResponse)
	{
		try {
			if (message.type === "getStatus"){
				browser.runtime.sendMessage({
					type: "status",
					"status": {
						enabled: my.enabled,
						debug: my.debug,
						filterUrls: my.filterUrls,
						filterTypes: my.filterTypes,
						requestCounter: my.requestCounter,
						appliedCounter: my.appliedCounter,
					}
				});
			}
			else if (message.type === "getSettings"){
				if (my.initialized){
					my.initialized.then(()=>{
						sendResponse({
							enableAtStartup: my.enableAtStartup,
							printDebugInfo: my.debug,
							colorScheme: my.settings.colorScheme,
							rules: my.rules,
						});
					})
					.catch(err=>{
						my.log(stringifyError(err));
						sendResponse({error: err});
					});
					return true;
				}
				else {
					sendResponse({
						error: "background.js has not been initialized yet.",
					});
				}
			}
			else if (message.type === "updateSettings"){
				my.updateSettings(message.pref);
			}
			else if (message.type === "toggle"){
				my.toggle();
			}
			else if (message.type === "getEnabled"){
				sendResponse({
					enabled: my.enabled,
					canEnable: my.filterUrls.length > 0,
				});
			}
		}
		catch (err){
			my.log(stringifyError(err));
		}
	},
	//====================================================
	toggle : function(state) 
	{
		if (typeof state === 'boolean') {
			my.enabled = state;
		}
		else {
			if (my.enabled = ! my.enabled){
				if (my.filterUrls.length === 0){
					my.enabled = false;
					my.log("Error: No URL applied");
					return;
				}
			}
		}

		my.updateButton();
		my.requests = {};
		if(my.enabled) {
			browser.webRequest.onBeforeSendHeaders.addListener(
				my.onBeforeSendHeaders,
				{urls: my.filterUrls, types: my.filterTypes},
				["blocking" ,"requestHeaders"]
			);
			browser.webRequest.onHeadersReceived.addListener(
				my.onHeadersReceived,
				{urls: my.filterUrls, types: my.filterTypes},
				["blocking" ,"responseHeaders"]
			);
		}
		else {
			browser.webRequest.onBeforeSendHeaders.removeListener(
				my.onBeforeSendHeaders
			);
			browser.webRequest.onHeadersReceived.removeListener(
				my.onHeadersReceived
			);
		}
		browser.runtime.sendMessage({type:"statusChange", enabled:my.enabled }).catch(e=>{});
	},
	//====================================================
	updateButton : function()
	{
		let buttonStatus = my.enabled ? 'on' : 'off';
		if (browser.browserAction.setIcon !== undefined)
			browser.browserAction.setIcon({path:{48:'icons/button-48-'+buttonStatus+'.png'}});
		if (browser.browserAction.setTitle !== undefined)
			browser.browserAction.setTitle({title: my.defaultTitle + " ("+buttonStatus+")"});
	},
	//====================================================
	findHeaderActions(origin, url, resourcetype){
		let count = 0, ruleIndex = 0, targetIndex = 0;
		const actions = { request: new Map(), response: new Map() };
		for (const rule of my.rules){
			ruleIndex++;
			if (! rule.originUrlsRegExp.test(origin)) continue;
			for (const target of rule.targets){
				targetIndex++;
				if (! target.urlsRegExp.test(url)) continue;
				if (target.typeSet.has(resourcetype)){
					count++;
					if (my.debug) my.log(`[match] Rule ${ruleIndex} → Target ${targetIndex} (types: ${target.types.join(", ")})\n    Origin patterns: ${rule.originUrls}\n    Target patterns: ${target.targetUrls}`);
					target.actions.forEach(action =>{
						const name = action.headerName.toLowerCase();
						if (! actions[action.type].has(name)){
							actions[action.type].set(name, action);
							if (my.debug) my.log(`[add action] ${action.name} ${action.type} header ${action.headerName}${action.name==="set" ? ' to ' + action.headerValue : ""}`);
						}
					});
				}
			}
		}
		if (count > 0) return actions;
	},
	//====================================================
	onBeforeSendHeaders : function(request)
	{
		try {
			my.requestCounter++;
			if (my.debug){
				let msg = `[reQ] resource type: ${request.type}\n    url: ${request.url}\n    originUrl: ${request.originUrl}`;
				if (request.documentUrl !== request.originUrl){
					msg +=`\n  documentUrl: ${request.documentUrl}`;
				}
				my.log(msg);
			}
			const actions = my.findHeaderActions(request.originUrl, request.url, request.type);
			if (! actions) return;
			
			let cors = {
				"origin": null,
				"access-control-request-method": null,
				"access-control-request-headers": null
			};
			const requestHeaders = [];
			let modified;
			for (const header of request.requestHeaders){
				const name = header.name.toLowerCase(),
					action = actions.request.get(name);
				if (cors.hasOwnProperty(name)){
					cors[name] = header.value;
					if (my.debug) my.log("[reQ] " + header.name + ": " + header.value);
				}
				if (action){
					if (action.name === "set"){
						if (header.value !== action.headerValue){
							modified = true;
							header.value = action.headerValue;
							if (my.debug) my.log("[reQ] Set! " + header.name + " to " + action.headerValue);
						}
						actions.request.delete(name)
					}
					else if (action.name === "remove"){
						modified = true;
						if (my.debug) my.log(`[reQ] Remove! ${header.name}: ${header.value}`);
						actions.request.delete(name)
						continue;
					}
				}
				requestHeaders.push(header);
			}
			actions.request.forEach((action, k)=>{
				if (action.name === "set"){
					modified = true;
					requestHeaders.push({name: action.headerName, value: action.headerValue});
					if (my.debug) my.log("[reQ] Set! " + action.headerName + " to " + action.headerValue);
				}
			});
			my.appliedCounter++;
			if (cors.origin || actions.response.size > 0){
				if (my.debug) my.log("pass data to onHeadersReceived");
				my.requests[request.requestId] = { cors, actions };
			}
			if (modified){
				return {requestHeaders};
			}
		}
		catch (err){
			my.log(stringifyError(err));
		}
	},
	//====================================================
	onHeadersReceived (response){
		try {
			const req = my.requests[response.requestId];
			if (! req) return;
			delete my.requests[response.requestId];
			
			if (my.debug) my.log("[reS] " + response.url);
			let modified;
			if (req.cors.origin){
				const headerMap = new Map(),
					corsHeaderSet = new Set([
						"access-control-allow-origin",
						"access-control-allow-credentials",
						"access-control-expose-headers",
						"access-control-max-age",
						"access-control-allow-methods",
						"access-control-allow-headers",
						"vary",
					]);
				response.responseHeaders.forEach((header, i)=>{
					const name = header.name.toLowerCase(),
						data = headerMap.get(name);
					data ? data.push(i) : headerMap.set(name, [i]);
					if (corsHeaderSet.has(name)){
						if (my.debug) my.log("[reS] " + header.name + ": " + header.value);
					}
				});
				const acao = "access-control-allow-origin";
				if (! headerMap.has(acao)){
					const header = {name: acao, value: req.cors.origin};
					response.responseHeaders.push(header);
					modified = true;
					if (my.debug) my.log("[reS] Add! " + header.name + ": " + header.value);
					const name = "vary", value = "origin", data = headerMap.get(name);
					if (! data){
						const header = {name, value};
						response.responseHeaders.push(header);
						if (my.debug) my.log("[reS] Add! " + header.name + ": " + header.value);
					}
					else {
						const header = response.responseHeaders[data[0]];
						header.value += `, ${value}`;
						if (my.debug) my.log("[reS] Mod! " + header.name + ": " + header.value);
					}
				}
				const addCORS = {
					"access-control-allow-credentials": "true",
					"access-control-allow-methods": req.cors["access-control-request-method"],
					"access-control-allow-headers": req.cors["access-control-request-headers"],
				};
				for (const [name, value] of Object.entries(addCORS)) {
					if (! headerMap.has(name)){
						if (value){
							const header = {name, value};
							response.responseHeaders.push(header);
							modified = true;
							if (my.debug) my.log("[reS] Add! " + header.name + ": " + header.value);
						}
					}
				}
			}
			if (req.actions.response.size === 0){
				if (modified) return {responseHeaders: response.responseHeaders};
				return;
			}
			const responseHeaders = [];
			for (const header of response.responseHeaders){
				const name = header.name.toLowerCase(),
					action = req.actions.response.get(name);
				if (action){
					if (action.name === "set"){
						if (header.value !== action.headerValue){
							modified = true;
							header.value = action.headerValue;
							if (my.debug) my.log("[reS] Set! " + header.name + " to " + action.headerValue);
						}
						req.actions.response.delete(name)
					}
					else if (action.name === "remove"){
						modified = true;
						if (my.debug) my.log("[reS] Remove! " + header.name + ": " + header.value);
						req.actions.response.delete(name)
						continue;
					}
				}
				responseHeaders.push(header);
			}
			req.actions.response.forEach((action, k)=>{
				if (action.name === "set"){
					modified = true;
					responseHeaders.push({name: action.headerName, value: action.headerValue});
					if (my.debug) my.log("[reS] Set! " + action.headerName + " to " + action.headerValue);
				}
			});
			if (modified){
				return {responseHeaders};
			}
		}
		catch (err){
			my.log(stringifyError(err));
		}
	}
};

browser.runtime.getPlatformInfo().then(my.init);
