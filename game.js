var express = require ('express'),
	app = express ();

var util = require ('util'),
	io = require ('socket.io'),
	Player = require ('./Player').Player,
	Projectile = require ('./Projectile').Projectile;

var socket,
	players,
	bullets;

app.use(express.static(__dirname + '/public'));

app.set('port', (process.env.PORT || 8000));

function init () {
	players = [];
	bullets = [];

	socket = io.listen (app.get('port'));

	setEventHandlers ();
}

app.get('/', function(request, response) {
  response.sendFile('index.html');
  console.log ('Redirect?');
});

var setEventHandlers = function () {
	socket.sockets.on ('connection', onSocketConnection);
};

function onSocketConnection (client) {
	util.log ('New player has connected: ' + client.id);

	client.on ('disconnect', onClientDisconnect);
	client.on ('new player', onNewPlayer);
	client.on ('move player', onMovePlayer);

	client.on('new bullet', onNewBullet);
	client.on('move bullet', onMoveBullet);
	client.on('remove bullet', onRemoveBullet);
}

function onClientDisconnect() {
	util.log ('Player has disconnected: ' + this.id);
	
	var removePlayer = playerById(this.id);

	if (!removePlayer) {
	    util.log("Player not found: "+this.id);
	    return;
	};

	players.splice(players.indexOf(removePlayer), 1);
	this.broadcast.emit("remove player", {id: this.id});
};

function onNewPlayer(data) {
	var newPlayer = new Player (data.x, data.y);
	newPlayer.id = this.id;

	this.broadcast.emit("new player", {id: newPlayer.id, x: newPlayer.getX(), y: newPlayer.getY()});

	var i, existingPlayer;
	for (i = 0; i < players.length; i++) {
		existingPlayer = players[i];

		this.emit("new player", {id: existingPlayer.id, x: existingPlayer.getX(), y: existingPlayer.getY()});
	};

	players.push (newPlayer);
};

function onMovePlayer(data) {
	var movePlayer = playerById(this.id);

	if (!movePlayer) {
	    util.log("Player not found: " + this.id);
	    return;
	};

	movePlayer.setX(data.x);
	movePlayer.setY(data.y);

	this.broadcast.emit("move player", {id: movePlayer.id, x: movePlayer.getX(), y: movePlayer.getY()});
};

function onNewBullet (data) {
	util.log ('New bullet: ' + data.id);
	var newBullet = new Projectile (data.startX, data.startY);
	newBullet.id = this.id + '-BULLET:' + data.count;
	this.emit("new bullet", {startX: newBullet.getX (), startY: newBullet.getY (), endX: data.endX, endY: data.endY, lifetime: data.lifetime, speed: data.speed, id: newBullet.id});
	this.broadcast.emit("new bullet", {startX: newBullet.getX (), startY: newBullet.getY (), endX: data.endX, endY: data.endY, lifetime: data.lifetime, speed: data.speed, id: newBullet.id});

	this.emit ('add bullet', {id: newBullet.id});
	bullets.push (newBullet);
};

function onMoveBullet (data) {
	util.log ('Move bullet: ' + data.id);
	var moveBullet = bulletById(data.id);

	if (!moveBullet) {
	    util.log("Projectile not found: " + data.id);
	    return;
	};

	moveBullet.setX(data.x);
	moveBullet.setY(data.y);

	this.emit("move bullet", {id: moveBullet.id, x: moveBullet.getX(), y: moveBullet.getY()});
	this.broadcast.emit("move bullet", {id: moveBullet.id, x: moveBullet.getX(), y: moveBullet.getY()});
};

function onRemoveBullet (data) {
	util.log ('Removed bullet: ' + data.id);
	var removeBullet = bulletById(data.id);

	if (!removeBullet) {
	    util.log("Projectile not found: " + data.id);
	    return;
	};
		
	this.emit("remove bullet", {id: data.id});
	this.broadcast.emit("remove bullet", {id: data.id});

	bullets.splice(bullets.indexOf(removeBullet), 1);
};

init ();

function playerById(id) {
    var i;
    for (i = 0; i < players.length; i++) {
        if (players[i].id == id)
            return players[i];
    };

    return false;
};

function bulletById(id) {
    var i;
    for (i = 0; i < bullets.length; i++) {
        if (bullets[i].id == id)
            return bullets[i];
    };

    return false;
};