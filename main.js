const electron = require('electron')
const {app, Tray, Menu, BrowserWindow, globalShortcut, ipcMain} = electron;
const request = require('request');
const path = require('path');
const wallpaper = require('wallpaper');
const fs = require('fs');
const Configstore = require('configstore');
const pkg = require('./package.json');
const exec = require('child_process').exec;

const conf = new Configstore(pkg.name, {autostart : true, interval : '00:02:00', resolution : '2560x1600'});
const assetsPath = __dirname + '/images';
const logoIconPath = path.join(assetsPath , 'logo.png');
const logoHighlightIconPath = path.join(assetsPath, 'logoHighlight.png');
const refreshIconPath = path.join(assetsPath, 'refresh.png');
const settingsIconPath = path.join(assetsPath, 'settings.png');
const closeIconPath = path.join(assetsPath, 'close.png');
const wallpaperPath = __dirname + '/wallpaper';
let appTray = null;
let settingsWindow = null;
let contextMenu = null;
let intervalId = null;
app.on('ready', function(){
	//Set up app
	app.dock.hide();
	if(conf.get('autostart') == true) {
		app.setLoginItemSettings({openAtLogin: true, openAsHidden: true});
	}
	else{
		app.setLoginItemSettings({openAtLogin: false, openAsHidden: false});	
	}

	//Setup tray
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

	// Create dirs
	if (!fs.existsSync(wallpaperPath)){
    	fs.mkdirSync(wallpaperPath);
    } 
	// Set schedule
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
	
	// Add random suffix to downloaded wallpaper.
	// We have to do this because OSX does not change
	// the wallpaper instantly if the file name is same
	var suffix = Math.floor(1000 + Math.random() * 9000);

	// Delete files in wallpaper directory
	// TODO: Delete after download is complete

	var filename = "wallpaper" + suffix + ".png";
	var fileStream = fs.createWriteStream(wallpaperPath + "/" +filename);
	fileStream.on('close', function(err){
		exec('sh '+ __dirname + '/wallpaper.sh ' + wallpaperPath + '/'+filename, function (error, stdout, stderr) {
			console.log(stderr);
			console.log(stdout);
			if(err){
				console.log(err);
			}
			var files = fs.readdirSync(wallpaperPath);
			files.forEach(function(file){
				if(file !== filename){
					fs.unlink(wallpaperPath + "/" + file);
				}
			});
			contextMenu.items[0].enabled = true;
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
