/**************************************************
** GAME VARIABLES
**************************************************/

// TODO: Add a local bullet array such that we only update the bullets that we create.
var canvas,			// Canvas DOM element
	ctx,			// Canvas rendering context
	keys,			// Keyboard input
	localPlayer;	// Local player

var remotePlayers,
	localBullets,
	bullets,
	totalBullets, // Used for ID'ing bullets.
	shootCooldown,
	lastShootTime,
	canShoot;

var socket;

var PORT = 8000;	

/**************************************************
** GAME INITIALISATION
**************************************************/
function init() {
	// Declare the canvas and rendering context
	canvas = document.getElementById("gameCanvas");
	ctx = canvas.getContext("2d");

	/********************/
	//PORT = process.env.PORT || 8000;
	/********************/

	// Maximise the canvas
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	// Initialise keyboard controls
	keys = new Keys();

	// Calculate a random start position for the local player
	// The minus 5 (half a player size) stops the player being
	// placed right on the edge of the screen
	var startX = Math.round(Math.random()*(canvas.width-5)),
		startY = Math.round(Math.random()*(canvas.height-5));

	// Initialise the local player
	localPlayer = new Player(startX, startY);

	socket = io.connect("http://localhost:" + PORT, {port: PORT, transports: ["websocket"]});

	remotePlayers = [];
	localBullets = [];
	bullets = [];
	totalBullets = 0;

	shootCooldown = 1;
	lastShootTime = 0;
	canShoot = true;

	// Start listening for events
	setEventHandlers();
};


/**************************************************
** GAME EVENT HANDLERS
**************************************************/
var setEventHandlers = function() {
	// Keyboard
	window.addEventListener("keydown", onKeydown, false);
	window.addEventListener("keyup", onKeyup, false);

	// Mouse click
	window.addEventListener("click", onMouseClick, false);

	// Window resize
	window.addEventListener("resize", onResize, false);

	socket.on("connect", onSocketConnected);
	socket.on("disconnect", onSocketDisconnect);

	socket.on("new player", onNewPlayer);
	socket.on("move player", onMovePlayer);
	socket.on("remove player", onRemovePlayer);

	socket.on('new bullet', onNewBullet);
	socket.on('move bullet', onMoveBullet);
	socket.on('remove bullet', onRemoveBullet);
	socket.on ('add bullet', onAddLocalBullet);

};

// Keyboard key down
function onKeydown(e) {
	if (localPlayer) {
		keys.onKeyDown(e);
	};
};

// Keyboard key up
function onKeyup(e) {
	if (localPlayer) {
		keys.onKeyUp(e);
	};
};

// Mouse Click
function onMouseClick(e) {
	if (localPlayer && canShoot) {
		socket.emit('new bullet', {startX: localPlayer.getX (), startY: localPlayer.getY (), endX: e.x, endY: e.y, speed: 2.5, lifetime: 50, count: totalBullets});
		totalBullets ++;
		lastShootTime = new Date().getTime();
		canShoot = false;
	};
}

// Browser window resize
function onResize(e) {
	// Maximise the canvas
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
};

function onSocketConnected() {
    console.log("Connected to socket server");

    socket.emit("new player", {x: localPlayer.getX(), y: localPlayer.getY()});
};

function onSocketDisconnect() {
    console.log("Disconnected from socket server");
};

function onNewPlayer(data) {
    console.log("New player connected: " + data.id);

	var newPlayer = new Player(data.x, data.y);
	newPlayer.id = data.id;
	remotePlayers.push(newPlayer);
};

function onMovePlayer(data) {
	var movePlayer = playerById(data.id);

	if (!movePlayer) {
	    console.log("Player not found: " + data.id);
	    return;
	};

	movePlayer.setX(data.x);
	movePlayer.setY(data.y);
};

function onRemovePlayer(data) {
	var removePlayer = playerById(data.id);

	if (!removePlayer) {
	    console.log("Player not found: " + data.id);
	    return;
	};

	remotePlayers.splice(remotePlayers.indexOf(removePlayer), 1);
};

function onNewBullet (data) {
	var newBullet = new Projectile (data.startX, data.startY, data.endX, data.endY, data.speed, data.lifetime);
	newBullet.id = data.id;

	bullets.push (newBullet);
};

function onMoveBullet (data) {
	var moveBullet = bulletById(data.id);
	console.log ('move bullet: ' + data.id);

	if (!moveBullet) {
	    console.log("Projectile not found: " + data.id);
	    return;
	};

	moveBullet.setX(data.x);
	moveBullet.setY(data.y);
};

function onAddLocalBullet (data) {
	for (var i = 0; i < bullets.length; i++) {
		if (bullets[i].id === data.id) {
			localBullets.push (bullets[i]);			
		}
	}
}

function onRemoveBullet (data) {
	var removeBullet = bulletById(data.id);
	var removeLocalBullet = localBulletById (data.id);

	if (!removeBullet && !removeLocalBullet) {
	    console.log("Projectile not found: " + data.id);
	    return;
	} else if (!removeBullet) {
		localBullets.splice(localBullets.indexOf(removeBullet), 1);
	} else if (!removeLocalBullet) {
		bullets.splice(bullets.indexOf(removeBullet), 1);
	} else {
		localBullets.splice(localBullets.indexOf(removeBullet), 1);
		bullets.splice(bullets.indexOf(removeBullet), 1);
	};

};

/**************************************************
** GAME ANIMATION LOOP
**************************************************/
function animate() {
	update();
	draw();

	// Request a new animation frame using Paul Irish's shim
	window.requestAnimFrame(animate);
};


/**************************************************
** GAME UPDATE
**************************************************/
function update() {
	if (localPlayer.update(keys)) {
    	socket.emit("move player", {x: localPlayer.getX(), y: localPlayer.getY()});
	};

	if (!canShoot && new Date ().getTime () - lastShootTime >= shootCooldown * 1000) {
		canShoot = true;
	}

	for (var i = 0; i < localBullets.length; i++) {
		if (localBullets[i].update ()) {
			socket.emit ('move bullet', {x: localBullets[i].getX (), y: localBullets[i].getY (), id: localBullets[i].id});
		} else {
			console.log ('Destroy the bullet!');
			socket.emit ('remove bullet', {id: localBullets[i].id});
		}
	}
};


/**************************************************
** GAME DRAW
**************************************************/
function draw() {
	// Wipe the canvas clean
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Draw the local player
	ctx.fillStyle='#FF0000';
	localPlayer.draw(ctx);
	ctx.fillStyle='#000000';

	for (var i = 0; i < remotePlayers.length; i++) {
	    remotePlayers[i].draw(ctx);
	};

	for (var i = 0; i < bullets.length; i++) {
		ctx.fillStyle='#0000FF';
	    bullets[i].draw(ctx);
		ctx.fillStyle='#000000';
	};
};

function playerById(id) {
    var i;
    for (i = 0; i < remotePlayers.length; i++) {
        if (remotePlayers[i].id == id)
            return remotePlayers[i];
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

function localBulletById(id) {
    var i;
    for (i = 0; i < localBullets.length; i++) {
        if (localBullets[i].id == id)
            return localBullets[i];
    };

    return false;
};