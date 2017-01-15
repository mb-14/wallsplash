const electron = require('electron')
const {app, Tray, Menu, BrowserWindow, globalShortcut, ipcMain} = electron;
const request = require('request');
const path = require('path');
const wallpaper = require('wallpaper');
const fs = require('fs');
const Configstore = require('configstore');
const pkg = require('./package.json');
const conf = new Configstore(pkg.name, {autostart : true, interval : '00:02:00', resolution : '2560x1600'});

const assetsPath = __dirname + '/images';
const logoIconPath = path.join(assetsPath , 'logo.png');
const logoHighlightIconPath = path.join(assetsPath, 'logoHighlight.png');
const refreshIconPath = path.join(assetsPath, 'refresh.png');
const settingsIconPath = path.join(assetsPath, 'settings.png');
const closeIconPath = path.join(assetsPath, 'close.png');
let appTray = null;
let settingsWindow = null;
let contextMenu = null;
let intervalId = null;
app.on('ready', function(){
	app.dock.hide();
	if(conf.get('autostart') == true) {
		app.setLoginItemSettings({openAtLogin: true, openAsHidden: true});
	}
	else{
		app.setLoginItemSettings({openAtLogin: false, openAsHidden: false});	
	}
	appTray = new Tray(logoIconPath);
	appTray.setPressedImage(logoHighlightIconPath);  
	contextMenu = Menu.buildFromTemplate([
	{
		label: 'Change wallpaper',
		icon: refreshIconPath,
		click : changeWallpaper
	},
	{
		label: 'Settings',
		icon: settingsIconPath,
		click : function() {
			settingsWindow = new BrowserWindow({width: 400, height: 500, show : false});
			settingsWindow.show();
			settingsWindow.loadURL('file://' + __dirname + '/settings.html');
		}
	},
	{
		label: 'Quit',
		icon: closeIconPath,
		click : function() {
			app.quit();
		}
	}
	]);
	appTray.setContextMenu(contextMenu);
	var intervalTime = conf.get('interval');
	intervalId = setInterval(changeWallpaper, intervalInMs(intervalTime));
	globalShortcut.register('CommandOrControl+Alt+W', changeWallpaper);
});

app.on('window-all-closed', function(event){
	event.preventDefault();
});

ipcMain.on('set-interval', function(event, arg) {
  console.log(arg);
  clearInterval(intervalId);
  intervalId = setInterval(changeWallpaper, intervalInMs(arg));
});


var changeWallpaper = function(){
	contextMenu.items[0].enabled = false;
	var resolution = conf.get('resolution');
	var suffix = Math.floor(1000 + Math.random() * 9000);
	var filename = "wallpaper" + suffix + ".png";
	var fileStream = fs.createWriteStream(__dirname + "/" +filename);
	fileStream.on('close', function(err){
		wallpaper.set(__dirname + "/" + filename).then(() => {
			contextMenu.items[0].enabled = true;
			fs.unlink(__dirname + "/" +filename);
			console.log("Wallpaper set");
		});
	});
	console.log("Downloading wallpaper...");
	request('https://source.unsplash.com/featured/' + conf.get('resolution')).pipe(fileStream);
}

var intervalInMs = function(intervalString){
	var arr = intervalString.split(':');
	var intervalInSec = Number(arr[0])*3600 + Number(arr[1])*60 + Number(arr[2]);
	var downloadOffset = 3000;
	return intervalInSec*1000 + downloadOffset;
}
