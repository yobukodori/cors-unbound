let debug = true;

function alert(msg){
	const id = "alert";
	let e = document.getElementById(id);
	if(! e){
		e = document.createElement("div");
		e.id = id;
		setTimeout(function(e){
			document.addEventListener("click", function handler(ev){
				document.removeEventListener("click", handler);
				e.remove(); 
			});
		}, 0, e);
		document.body.appendChild(e);
	}
	let m = document.createElement("div");
	m.classList.add("message");
	msg.split("\n").forEach((line,i) =>{
		if (i > 0){ m.appendChild(document.createElement("br")); }
		let span = document.createElement("span");
		span.appendChild(document.createTextNode(line));
		m.appendChild(span);
	});
	e.appendChild(m);
}

function clearLog(){
	let log = document.querySelector('#log');
	log.innerHTML = "";
	log.appendChild(document.createElement("span"));
}

let dummy_log_cleared;

function log(s)
{
	let log = document.querySelector('#log');
	if (! dummy_log_cleared){
		log.innerHTML = "";
		log.appendChild(document.createElement("span"));
		dummy_log_cleared = true;
	}
	if (! (s = s.replace(/\s+$/, ""))){
		return;
	}
	let className = /^[a-z]*error\b/i.test(s) ? "error" : /^warning\b/i.test(s) ? "warning" : "";
	let a = s.split("\n");
	for (let i = a.length - 1 ; i >= 0 ; i--){
		let s = a[i].replace(/\s+$/, "");
		let e = document.createElement("span");
		let col = 0, indent = 0;
		while (s[0] === '\t' || s[0] === ' '){
			indent += s[0] === ' ' ? 1 : col === 0 ? 4 : (4 - col % 4);
			s = s.substring(1);
		}
		e.appendChild(document.createTextNode((indent > 0 ? "\u00A0".repeat(indent) : "") + s));
		e.appendChild(document.createElement("br"));
		if (className){ e.classList.add(className); }
		log.insertBefore(e, log.firstElementChild);
	}
}

function resourceTypeToId(type){
	return "id-type-" + type;
}

function idToResourceType(id){
	return id.split("-").at(-1);
}

function updateListItems(list, startIndex = 0){
	const length = list.children.length;
	for (let i = startIndex ; i < length ; i++){
		const item = list.children[i];
        item.querySelector('.index').textContent = i + 1;
		item.querySelector('.remove-btn').disabled = length === 1;
		const upBtn = item.querySelector('.up-btn');
		if (upBtn){
			upBtn.disabled = i === 0;
			item.querySelector('.down-btn').disabled = i === length - 1;
		}
    }
}

function onListItemUpBtnClick(item){
	const list = item.parentElement,
		index = Array.from(list.children).findIndex(e => e === item);
	list.insertBefore(item, item.previousElementSibling);
	updateListItems(list, index > 0 ? index - 1 : index);
}

function onListItemDownBtnClick(item){
	const list = item.parentElement,
		index = Array.from(list.children).findIndex(e => e === item);
	list.insertBefore(item.nextElementSibling, item);
	updateListItems(list, index);
}

function onListItemRemoveBtnClick(item){
	const list = item.parentElement;
	item.remove();
	updateListItems(list);
}

function appendListItem(list, item){
	const index = list.children.length;
	list.appendChild(item);
	updateListItems(list, index > 0 ? index - 1 : 0);
}

function addAction(target, data){
	const tpl = document.getElementById("action-template");
	const clone = tpl.content.firstElementChild.cloneNode(true),
		selectType = clone.querySelector(".select-type");
		selectAction = clone.querySelector(".select-action");
	if (data){
		selectType.value = data.type;
		selectAction.value = data.name;
		clone.querySelector('.header-name input').value = data.headerName;
		clone.querySelector('.header-value input').value = data.headerValue;
	}
	clone.querySelector(".add-btn").addEventListener("click", ev =>{
		addAction(ev.currentTarget.closest(".target"));
	});
	clone.querySelector(
	".remove-btn").addEventListener("click", ev =>{
		onListItemRemoveBtnClick(ev.currentTarget.closest('.action'));
	});
	selectAction.addEventListener("change", ev =>{
		const action = ev.currentTarget.closest('.action'),
			headerValue = action.querySelector('.header-value');
		if (ev.currentTarget.value === "set"){
			headerValue.classList.remove("hide");
		}
		else { // remove
			headerValue.classList.add("hide");
		}
	});
	clone.querySelectorAll('input[type="text"]').forEach(input => {
        input.addEventListener("click", ev => {
            showEditBoxForInput(ev.currentTarget);
        });
    });
	appendListItem(target.querySelector(".header-action > .list"), clone);
	selectAction.dispatchEvent(new Event("change"));
}

function addTarget(rule, data){
	const tpl = document.getElementById("target-template");
	const clone = tpl.content.firstElementChild.cloneNode(true);
	if (data){
		clone.querySelector('.url-box input').value = data.targetUrls;
		data.actions.length > 0 ? data.actions.forEach(action => addAction(clone, action)) : addAction(clone);
		data.types.forEach(type => clone.querySelector('.resource-type input#' + resourceTypeToId(type)).checked = true);
	}
	else {
		addAction(clone);
		["xmlhttprequest"].forEach(type => clone.querySelector('.resource-type input#' + resourceTypeToId(type)).checked = true);
	}
	clone.querySelector('.resource-type #id-check-all').addEventListener("click", ev =>{
		const clone = ev.currentTarget.closest('.resource-type'),
			nn = clone.querySelectorAll('.item input');
		Array.from(nn).forEach(e => e.checked = ev.currentTarget.checked);
	});
	clone.querySelector(".toggle-details-btn").addEventListener("click", ev =>{
		const details = ev.currentTarget.closest(".target").querySelector(".details");
		details.classList.toggle("hide");
		ev.currentTarget.textContent = details.classList.contains("hide") ? "▸" : "▾" ;
	});
	clone.querySelector('.up-btn').addEventListener("click", ev =>{
		onListItemUpBtnClick(ev.currentTarget.closest('.target'));
	});
	clone.querySelector('.down-btn').addEventListener("click", ev =>{
		onListItemDownBtnClick(ev.currentTarget.closest('.target'));
	});
	clone.querySelector(".add-btn").addEventListener("click", ev =>{
		addTarget(ev.currentTarget.closest(".rule"));
	});
	clone.querySelector('.remove-btn').addEventListener("click", ev =>{
		onListItemRemoveBtnClick(ev.currentTarget.closest('.target'));
	});
	clone.querySelectorAll('input[type="text"]').forEach(input => {
        input.addEventListener("click", ev => {
            showEditBoxForInput(ev.currentTarget);
        });
    });
	appendListItem(rule.querySelector(".target-list"), clone);
}

function addRule(data){
	const tpl = document.getElementById("rule-template");
	const clone = tpl.content.firstElementChild.cloneNode(true);
	if (data){
		clone.querySelector('.url-box input').value = data.originUrls;
		data.targets.length > 0 ? data.targets.forEach(targetData => addTarget(clone, targetData)) : addTarget(clone);
	}
	else {
		addTarget(clone);
	}
	clone.querySelector('.up-btn').addEventListener("click", ev =>{
		onListItemUpBtnClick(ev.currentTarget.closest('.rule'));
	});
	clone.querySelector('.down-btn').addEventListener("click", ev =>{
		onListItemDownBtnClick(ev.currentTarget.closest('.rule'));
	});
	clone.querySelector(".add-btn").addEventListener("click", ev =>{
		addRule();
	});
	clone.querySelector(".remove-btn").addEventListener("click", ev =>{
		onListItemRemoveBtnClick(ev.currentTarget.closest('.rule'));
	});
	clone.querySelectorAll('input[type="text"]').forEach(input => {
        input.addEventListener("click", ev => {
            showEditBoxForInput(ev.currentTarget);
        });
    });
	appendListItem(document.querySelector('.rule-list'), clone);
}

function onSendMessageError(type, err){
	const name = `Error while sending "${type}" message`;
	alert(`${name}: ${err}`); 
	// if (err instanceof Error && err.stack) "See the console for details."
}

function applySettings(fSave)
{
	const data = {rules: []},
		ruleList = document.querySelectorAll('.rule');
	for (let i = 0 ; i < ruleList.length ; i++){
		const rule = ruleList[i],
			ruleIndex = i + 1,
			originUrls = rule.querySelector(".url-box > input").value.trim(),
			urls = parseUrls(originUrls);;
		if (urls.length === 0){
			log(`error: rule${ruleIndex} missing origin URL`);
			return;
		}
		if (debug) console.log("rule origin", ruleIndex, urls);
		for (const url of urls){
			if (! isSupportedUrlPattern(url)){
				log(`error: rule${ruleIndex} invalid origin URL pattern: "${url}"`);
				return;
			}
		}
		const targetList = rule.querySelectorAll(".target"),
			targets = [];
		for (let i = 0 ; i < targetList.length ; i++){
			const target = targetList[i],
				targetIndex = i + 1,
				targetUrls = target.querySelector(".url-box > input").value,
				urls = parseUrls(targetUrls);
			if (urls.length === 0){
				log(`error: rule${ruleIndex}-target${targetIndex} missing target URL`);
				return;
			}
			if (debug) console.log(" ".repeat(2)+"target", targetIndex, urls);
			for (const url of urls){
				if (! isSupportedUrlPattern(url)){
					log(`error: rule${ruleIndex}-target${targetIndex} invalid target URL pattern: "${url}"`);
					return;
				}
			}
			const actionList = target.querySelectorAll('.action'),
				actions = [], hdr = { request: new Set(), response: new Set()};
			for (let i = 0 ; i < actionList.length ; i++){
				const action = actionList[i],
					actionIndex = i + 1,
					type = action.querySelector('.select-type').value,
					name = action.querySelector('.select-action').value,
					headerName = action.querySelector('.header-name input').value.trim(),
					headerValue = action.querySelector('.header-value input').value.trim();
				if (! headerName && ! headerValue) continue;
				if (debug) console.log(" ".repeat(4)+"action", actionIndex, type, name, headerName, headerValue);
				if (headerName){
					if (hdr[type].has(headerName)){
						log(`error: rule${ruleIndex}-target${targetIndex}-action${actionIndex} header name "${headerName}" already has an action assigned`);
						return 
					}
					hdr[type].add(headerName);
				}
				if (name === "set"){
					if (! headerName || ! headerValue){
						log(`error: rule${ruleIndex}-target${targetIndex}-action${actionIndex} missing header name or header value`);
						return;
					}
				}
				else { // if (name === "remove"){
					if (! headerName){
						log(`error: rule${ruleIndex}-target${targetIndex}-action${actionIndex} missing header name`);
						return;
					}
				}
				actions.push({type, name, headerName, headerValue});
			}
			const typeList = target.querySelectorAll(".resource-type input"),
				types = Array.from(typeList).filter(e => e.checked).map(e=> idToResourceType(e.id));
			if (types.length === 0){
				log(`error: rule${ruleIndex}-target${targetIndex} missing resource type`);
				return;
			}
			if (debug) console.log(" ".repeat(4)+"types:", types);
			targets.push({targetUrls, actions, types});
		}
		data.rules.push({originUrls, targets});
	}
	if (debug) console.log("rules:", data.rules);
	let pref = {
		enableAtStartup : document.querySelector('#enableAtStartup').checked,
		printDebugInfo : document.querySelector('#printDebugInfo').checked,
		colorScheme: document.querySelector('#colorScheme').value,
		rules : data.rules,
	};
	if (fSave){
		browser.storage.local.set(pref);
		log("Settings saved.");
	}
	log("Apllying settings.");
	browser.runtime.sendMessage({type:"updateSettings",pref:pref})
	.catch(err => onSendMessageError("updateSettings", err));
}

function onStatusChange(fEnabled){
	let e = document.querySelector('#toggle');
	e.className = (fEnabled ? "on" : "off");
	e.innerText = fEnabled ? "Off (Now On)" : "On (Now Off)";
}

function onMessage(m, sender, sendResponse)
{
	if (m.type === "log"){
		log(m.str);
	}
	else if (m.type === "status"){
		let s = m["status"];
		log("enabled:" + s.enabled + " debug:" + s.debug + " request:" + s.requestCounter
			+" applied:" + s.appliedCounter + "\n"
			+ "filterUrls:[" + s.filterUrls.join(", ") + "]\n"
			+ "filterTypes:[" + s.filterTypes.join(", ") + "]"
			/*
			+ "appliedUrls: "+s.appliedUrls+"\n"
			+ "userAgent: "+s.userAgent
			*/
		);
		onStatusChange(s.enabled);
	}
	else if (m.type === "statusChange"){
		onStatusChange(m.enabled);
		log(m.enabled ? "Enabled" : "Disabled");
	}
}

function getBackgroundStatus(){
	browser.runtime.sendMessage({type: "getStatus"})
	.catch(err => onSendMessageError("getStatus", err));
}

function setupSettings(v){
	let colorScheme = ["light", "dark"].includes(v.colorScheme) ? v.colorScheme : "auto";
	document.querySelector('#colorScheme').value = colorScheme;
	setupColorScheme(colorScheme);
	document.querySelector('#enableAtStartup').checked = !! v.enableAtStartup;
	document.querySelector('#printDebugInfo').checked = !! v.printDebugInfo;
	document.querySelector('.rule-list').replaceChildren();
	(v.rules && v.rules.length > 0) ? v.rules.forEach(ruleData => addRule(ruleData)) : addRule();
}

function getAppInfo(){
	const man = browser.runtime.getManifest(),
		name = man.name,
		app = {};
	if (name.toLowerCase().endsWith(" beta")){
		app.name = name.slice(0, -5).trim();
		app.beta = true;
	}
	else {
		app.name = name.trim();
		app.beta = false;
	}
	app.version = man.version;
	return app;
}

function onDOMContentLoaded(platformInfo){
	const man = browser.runtime.getManifest(), 
		appName = man.name, // man.browser_action.default_title, 
		appVer = "v." + man.version;
	document.querySelector('#appName').textContent = appName;
	document.querySelector('#appVer').textContent = appVer;
	
	document.querySelector('#colorScheme').addEventListener('change', ev=>{
		setupColorScheme(ev.target.value);
	});

	getBackgroundStatus();
	document.querySelector('#save').addEventListener('click', ev=>{
		applySettings(true);
	});
	document.querySelector('#apply').onclick = function (){
		applySettings();
	};
	document.querySelector('#getStatus').onclick = function (){
		getBackgroundStatus();
	};
	document.querySelector('#toggle').onclick = function (){
		browser.runtime.sendMessage({type: "toggle"})
		.catch(err => onSendMessageError("toggle", err));
	};
	document.querySelector('#clearLog').addEventListener('click', ev=>{
		clearLog();
	});

	document.querySelector('#exportSettings').addEventListener('click', ev=>{
		browser.runtime.sendMessage({type: "getSettings"})
		.then(v=>{
			if (v.error){
				alert(`Error while retrieving settings: ${v.error}`);
			}
			else {
				const date2str = function(){
					const f = n => ("0" + n).slice(-2);
					let d = new Date();
					return d.getFullYear() + f(d.getMonth() + 1) + f(d.getDate()) + "-" + f(d.getHours()) + f(d.getMinutes()) + f(d.getSeconds());
				};
				v.app = getAppInfo();
				let settingsData = JSON.stringify(v);
				let e = document.createElement("a");
				e.href = URL.createObjectURL(new Blob([settingsData], {type:"application/json"}));
				e.download = appName.toLowerCase().replace(/\s/g, "-") + "-" + date2str() + ".json";
				e.click();
			}
		})
		.catch(err => onSendMessageError("getSettings", err));
	});

	document.querySelector('#importSettings').addEventListener('click', ev=>{
		let e = document.createElement("input");
		e.type = "file";
		e.accept = "application/json";
		e.addEventListener("change", ev =>{
			let file = ev.target?.files[0];
			if (file){
				const reader = new FileReader();
				reader.addEventListener("load", ev =>{
					try {
						const v = JSON.parse(reader.result);
						var app = getAppInfo(), name, version, beta;
						if (v.app === "CORS Unbound Beta v.0.9.0"){
							name = "CORS Unbound";
							version = "0.9.0";
							beta = true;
						}
						else {
							name = v.app.name ?? "";
							version = v.app.version ?? "";
							beta = v.app.beta ?? null;
						}
						if (name !== app.name){
							throw Error("invalid settings data");
						}
						setupSettings(v);
						applySettings();
						log("Setting data successfully imported.");
					}
					catch (e){
						const msg = e.name + ": " + e.message;
						log(msg), alert(msg);
					}
				});
				reader.readAsText(file);
			}
		});
		e.click();
	});

	document.body.classList.add(platformInfo.os === "android" ? "mobile" : "pc");
	
	browser.runtime.sendMessage({type: "getSettings"})
	.then(v=>{
		if (v.error){
			alert(`Error while retrieving settings: ${v.error}`);
		}
		else {
			setupSettings(v);
			window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ev=> onPrefersColorSchemeDarkChange(ev));
		}
	})
	.catch(err => onSendMessageError("getSettings", err));
}

document.addEventListener('DOMContentLoaded', ev => {
	browser.runtime.getPlatformInfo().then(onDOMContentLoaded);
});
browser.runtime.onMessage.addListener(onMessage);
