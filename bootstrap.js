/* global Components, Services, Zotero */
"use strict";

var chromeHandle;

function log(msg) {
	Zotero.debug("JournalLens: " + msg);
}

function install() {
	log("Installed");
}

async function startup({ id, version, rootURI }) {
	log("Starting " + version);

	var aomStartup = Components.classes["@mozilla.org/addons/addon-manager-startup;1"]
		.getService(Components.interfaces.amIAddonManagerStartup);
	var manifestURI = Services.io.newURI(rootURI + "manifest.json");
	chromeHandle = aomStartup.registerChrome(manifestURI, [
		["content", "journallens", rootURI + "content/"]
	]);

	Services.scriptloader.loadSubScript(rootURI + "content/journallens.js");
	JournalLens.init({ id, version, rootURI });

	Zotero.PreferencePanes.register({
		pluginID: id,
		src: rootURI + "content/preferences.xhtml",
		scripts: [rootURI + "content/preferences.js"],
		image: rootURI + "icons/icon48.png"
	});

	// Add UI to any windows that are already open
	var windows = Zotero.getMainWindows();
	for (let win of windows) {
		JournalLens.addToWindow(win);
	}
}

function onMainWindowLoad({ window }) {
	JournalLens.addToWindow(window);
}

function onMainWindowUnload({ window }) {
	JournalLens.removeFromWindow(window);
}

function shutdown() {
	log("Shutting down");
	if (typeof JournalLens !== "undefined") {
		JournalLens.shutdown();
	}
	if (chromeHandle) {
		chromeHandle.destruct();
		chromeHandle = null;
	}
}

function uninstall() {
	log("Uninstalled");
}
