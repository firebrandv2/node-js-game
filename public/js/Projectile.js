var Projectile = function (startX, startY, endX, endY, speed, lifetime) {
	var x = startX,
		y = startY,
		startX = startX,
		startY = startY,
		endX = endX,
		endY = endY,
		speed  = speed,
		lifetime = lifetime

	var elapsedTime = 0,
		alive = true;

	var id;

	var dirX = endX - startX,
		dirY = endY - startY;

	var mag = Math.sqrt(dirX * dirX + dirY * dirY);

	var velocityX = (dirX / mag) * speed,
		velocityY = (dirY / mag) * speed; 

	var getX = function() {
	    return x;
	};

	var getY = function() {
	    return y;
	};

	var setX = function(newX) {
	    x = newX;
	};

	var setY = function(newY) {
	    y = newY;
	};

	var update = function () {
		alive = true;
		elapsedTime ++;
		
		if (elapsedTime >= lifetime) {
			alive = false;
			return false;
		}

		x += velocityX;
		y += velocityY;


		return true;
	};

	var draw = function (ctx) {			
		ctx.fillRect(x-5, y-5, 10, 10);
	};


	return {
		getX: getX,
		getY: getY,
		setX: setX,
		setY: setY,
		elapsedTime: elapsedTime,

		update: update,
		draw: draw
	}
} 