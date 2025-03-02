let player;
let enemies = [];
let bullets = [];
let powerUps = [];
let score = 0;
let level = 1;
let gameState = "playing";
let enemiesKilled = 0;
let enemiesPerLevel = 10;
let blastCooldown = 0;
let particles = [];
let screenShake = 0;
let flashAlpha = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  player = new Player(width / 2, height / 2);
  
  // Prevent context menu on right-click
  document.addEventListener('contextmenu', event => event.preventDefault());
}

function draw() {
  // Apply screen shake if active
  if (screenShake > 0) {
    translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
    screenShake *= 0.9;
    if (screenShake < 0.5) screenShake = 0;
  }
  
  drawBarnBackground();
  
  if (gameState === "playing") {
    player.update();
    player.show();
    
    if (frameCount % (40 - level * 3) === 0 && random(1) > 0.2) {
      spawnEnemy();
    }
    if (frameCount % 100 === 0 && random(1) > 0.5) {
      spawnPowerUp();
    }
    
    if (blastCooldown > 0) {
      blastCooldown--;
    }
    
    // Draw blast particles
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.x += (p.targetX - p.x) * 0.1;
      p.y += (p.targetY - p.y) * 0.1;
      p.life--;
      
      fill(p.color);
      noStroke();
      ellipse(p.x, p.y, p.life / 3, p.life / 3);
      
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
    
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].update();
      bullets[i].show();
      if (bullets[i].offscreen()) {
        bullets.splice(i, 1);
      }
    }
    
    for (let i = enemies.length - 1; i >= 0; i--) {
      enemies[i].update();
      enemies[i].show();
      
      for (let j = bullets.length - 1; j >= 0; j--) {
        if (enemies[i].hits(bullets[j])) {
          enemies[i].health -= 1;
          bullets.splice(j, 1);
          if (enemies[i].health <= 0) {
            score += enemies[i].isBoss ? 50 : 10;
            enemies.splice(i, 1);
            enemiesKilled++;
            
            if (enemiesKilled >= enemiesPerLevel) {
              levelUp();
              enemiesKilled = 0;
            }
            break;
          }
          break;
        }
      }
      
      if (enemies[i] && enemies[i].hitsPlayer(player)) {
        if (!player.shield) gameState = "gameover";
      }
    }
    
    for (let i = powerUps.length - 1; i >= 0; i--) {
      powerUps[i].update();
      powerUps[i].show();
      if (powerUps[i].hits(player)) {
        powerUps[i].applyEffect(player);
        score += 25;
        powerUps.splice(i, 1);
      }
    }
    
    // Draw flash effect
    if (flashAlpha > 0) {
      fill(255, 255, 200, flashAlpha);
      rect(0, 0, width, height);
      flashAlpha *= 0.8;
    }
    
    showScoreAndLevel();
  } else if (gameState === "gameover") {
    showGameOver();
  }
}

function mousePressed() {
  if (gameState === "playing") {
    if (mouseButton === LEFT) {
      let controllerType = floor(random(3));
      
      if (player.fullAuto) {
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            if (gameState === "playing") {
              bullets.push(new Bullet(player.x, player.y, controllerType, player));
            }
          }, i * 100);
        }
      } else if (player.accurateShot) {
        let bullet = new Bullet(player.x, player.y, controllerType, player);
        bullet.spinSpeed = 0;
        bullets.push(bullet);
      } else {
        bullets.push(new Bullet(player.x, player.y, controllerType, player));
      }
    } else if (mouseButton === RIGHT && blastCooldown <= 0) {
      createBlast();
      blastCooldown = 180;
    }
  }
  
  // Prevent default right-click behavior
  if (mouseButton === RIGHT) {
    return false;
  }
}

function createBlast() {
  // Create more bullets in a tighter pattern for better coverage
  for (let angle = 0; angle < TWO_PI; angle += PI/16) { // Increased from PI/8 to PI/16 (twice as many bullets)
    let bullet = new Bullet(player.x, player.y, floor(random(3)), player);
    bullet.angle = angle;
    bullet.speed *= 1.5; // Faster bullets for better reach
    bullet.size *= 1.2; // Larger bullets for better hit chance
    bullets.push(bullet);
  }
  
  // Add a second ring of bullets for better coverage
  for (let angle = PI/32; angle < TWO_PI; angle += PI/16) {
    let bullet = new Bullet(player.x, player.y, floor(random(3)), player);
    bullet.angle = angle;
    bullet.speed *= 1.2; // Slightly slower than the first ring
    bullets.push(bullet);
  }
  
  // Visual effect for the blast
  for (let i = 0; i < 20; i++) {
    let angle = random(TWO_PI);
    let dist = random(50, 200);
    let x = player.x + cos(angle) * dist;
    let y = player.y + sin(angle) * dist;
    
    // Create a particle effect (implemented in draw function)
    if (!particles) particles = [];
    particles.push({
      x: player.x,
      y: player.y,
      targetX: x,
      targetY: y,
      life: 30,
      color: color(255, random(100, 255), 0, 200)
    });
  }
  
  // Add screen shake effect
  screenShake = 15;
  
  // Add flash effect
  flashAlpha = 150;
  
  // Increased blast radius and damage to enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    let d = dist(player.x, player.y, enemies[i].x, enemies[i].y);
    if (d < 250) { // Increased from 150 to 250
      // Damage falls off with distance
      let damage = enemies[i].isBoss ? 1 : (d < 100 ? 2 : 1);
      enemies[i].health -= damage;
      
      if (enemies[i].health <= 0) {
        score += enemies[i].isBoss ? 50 : 10;
        enemies.splice(i, 1);
        enemiesKilled++;
      }
    }
  }
}

function keyPressed() {
  if (gameState === "gameover" && keyCode === 32) { // 32 is the keyCode for SPACE
    resetGame();
  } else if (gameState === "playing" && keyCode === 32 && blastCooldown <= 0) { // SPACE for blast during gameplay
    createBlast();
    blastCooldown = 180;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 40;
    this.speed = 5;
    this.baseBulletSpeed = 8;
    this.baseBulletSize = 20;
    this.baseFireRate = 5;
    this.bulletSpeed = this.baseBulletSpeed;
    this.bulletSize = this.baseBulletSize;
    this.fireRate = this.baseFireRate;
    this.powerUpTimer = 0;
    this.shield = false;
    this.fullAuto = false;
    this.accurateShot = false;
  }
  
  update() {
    if (keyIsDown(65)) this.x -= this.speed;
    if (keyIsDown(68)) this.x += this.speed;
    if (keyIsDown(87)) this.y -= this.speed;
    if (keyIsDown(83)) this.y += this.speed;
    
    this.x = constrain(this.x, 25, width-25);
    this.y = constrain(this.y, 25, height-25);
    
    if (this.powerUpTimer > 0) {
      this.powerUpTimer--;
      if (this.powerUpTimer === 0) {
        this.bulletSpeed = this.baseBulletSpeed;
        this.bulletSize = this.baseBulletSize;
        this.fireRate = this.baseFireRate;
        this.shield = false;
        this.fullAuto = false;
        this.accurateShot = false;
      }
    }
  }
  
  show() {
    push();
    translate(this.x, this.y);
    
    fill(50, 50, 150);
    ellipse(0, 10, this.size, this.size);
    
    stroke(30, 30, 100);
    strokeWeight(2);
    noFill();
    arc(0, 10, this.size+5, this.size+5, PI+0.4, TWO_PI-0.4);
    noStroke();
    
    fill(255, 218, 185);
    ellipse(0, -5, 25, 30);
    
    fill(50, 30, 10);
    arc(0, -15, 30, 20, PI, TWO_PI);
    rect(-15, -15, 30, 10);
    
    fill(30);
    rect(-15, -12, 5, 15, 2);
    rect(10, -12, 5, 15, 2);
    ellipse(-15, -5, 10, 15);
    ellipse(15, -5, 10, 15);
    
    stroke(0);
    strokeWeight(1);
    fill(255);
    rect(-12, -8, 24, 8, 3);
    line(0, -8, 0, 0);
    noStroke();
    fill(0);
    ellipse(-5, -4, 4, 4);
    ellipse(5, -4, 4, 4);
    
    fill(20, 20, 20);
    rect(-15, 15, 30, 20, 5);
    
    fill(255);
    ellipse(0, 25, 10, 6);
    rect(-5, 23, 10, 4, 2);
    
    pop();
  }
}

class Enemy {
  constructor(x, y, isBoss = false) {
    this.x = x;
    this.y = y;
    this.size = isBoss ? 80 : 40;
    this.speed = isBoss ? 1.5 : 2 + level * 0.1;
    this.isBoss = isBoss;
    this.health = isBoss ? 5 : 1;
    
    // Assign a type for visual variety
    if (isBoss) {
      // Boss types: 0 = TV, 1 = Lamp, 2 = Mattress, 3 = Refrigerator, 4 = Washing Machine
      this.type = floor(random(5));
    } else {
      // Regular enemy types: 0 = TV, 1 = Radio, 2 = Toaster
      this.type = floor(random(3));
    }
    
    // Special behaviors based on type
    if (isBoss) {
      if (this.type === 1) { // Lamp boss moves faster
        this.speed *= 1.3;
      } else if (this.type === 2) { // Mattress boss has more health
        this.health += 2;
      } else if (this.type === 3) { // Refrigerator boss is slower but tougher
        this.speed *= 0.7;
        this.health += 3;
      } else if (this.type === 4) { // Washing Machine occasionally changes direction
        this.directionChangeTimer = 0;
        this.directionChangeInterval = floor(random(60, 120));
      }
    }
  }
  
  update() {
    let angle = atan2(player.y - this.y, player.x - this.x);
    
    // Special movement patterns for certain boss types
    if (this.isBoss && this.type === 4) { // Washing Machine
      this.directionChangeTimer++;
      if (this.directionChangeTimer >= this.directionChangeInterval) {
        angle += random(-PI/2, PI/2); // Change direction randomly
        this.directionChangeTimer = 0;
        this.directionChangeInterval = floor(random(60, 120));
      }
    }
    
    this.x += cos(angle) * this.speed;
    this.y += sin(angle) * this.speed;
  }
  
  show() {
    push();
    translate(this.x, this.y);
    
    if (this.isBoss) {
      // Boss designs
      switch(this.type) {
        case 0: // TV Boss
          fill('red');
          rect(-this.size/2, -this.size/2, this.size, this.size * 0.8, 5);
          fill(20);
          rect(-this.size * 0.4, -this.size * 0.4, this.size * 0.8, this.size * 0.6);
          
          // Antenna
          stroke(0);
          strokeWeight(2);
          line(-this.size * 0.2, -this.size/2, -this.size * 0.3, -this.size * 0.75);
          line(this.size * 0.2, -this.size/2, this.size * 0.3, -this.size * 0.75);
          noStroke();
          
          // Stand
          fill(139, 69, 19);
          rect(-this.size/2, this.size * 0.3, this.size, this.size * 0.2);
          
          // Screen static
          for (let i = 0; i < 20; i++) {
            fill(255, random(150, 255));
            let x = random(-this.size * 0.35, this.size * 0.35);
            let y = random(-this.size * 0.35, this.size * 0.35);
            ellipse(x, y, 5, 5);
          }
          break;
          
        case 1: // Lamp Boss
          // Lampshade
          fill(255, 200, 0);
          beginShape();
          vertex(-this.size/3, -this.size/2);
          vertex(this.size/3, -this.size/2);
          vertex(this.size/2, this.size/4);
          vertex(-this.size/2, this.size/4);
          endShape(CLOSE);
          
          // Lamp base
          fill(150);
          rect(-this.size/6, this.size/4, this.size/3, this.size/4);
          ellipse(0, this.size/2, this.size/2, this.size/8);
          
          // Light bulb glow
          for (let i = 0; i < 5; i++) {
            fill(255, 255, 200, 150 - i * 30);
            ellipse(0, -this.size/4, (this.size/3) + i * 10, (this.size/3) + i * 10);
          }
          break;
          
        case 2: // Mattress Boss
          // Mattress body
          fill(200, 200, 255);
          rect(-this.size/2, -this.size/4, this.size, this.size/2, 10);
          
          // Pillow
          fill(255);
          rect(-this.size/2, -this.size/4, this.size/3, this.size/4, 5);
          
          // Mattress pattern
          stroke(150, 150, 200);
          strokeWeight(2);
          for (let i = -this.size/2 + 10; i < this.size/2; i += 15) {
            line(i, -this.size/4 + 5, i, this.size/4 - 5);
          }
          noStroke();
          
          // Angry eyes
          fill(255, 0, 0);
          ellipse(-this.size/4, 0, this.size/10, this.size/10);
          ellipse(this.size/4, 0, this.size/10, this.size/10);
          break;
          
        case 3: // Refrigerator Boss
          // Fridge body
          fill(220);
          rect(-this.size/2, -this.size/2, this.size, this.size, 5);
          
          // Door line
          stroke(180);
          strokeWeight(2);
          line(0, -this.size/2, 0, this.size/2);
          noStroke();
          
          // Handles
          fill(50);
          rect(this.size/8, -this.size/4, this.size/10, this.size/20);
          rect(this.size/8, this.size/4, this.size/10, this.size/20);
          
          // Ice dispenser
          fill(200);
          rect(-this.size/3, -this.size/6, this.size/4, this.size/4);
          
          // Angry face
          fill(255, 0, 0);
          ellipse(-this.size/4, -this.size/4, this.size/8, this.size/8);
          ellipse(-this.size/4, this.size/4, this.size/8, this.size/8);
          stroke(255, 0, 0);
          strokeWeight(3);
          line(-this.size/3, 0, -this.size/6, 0);
          noStroke();
          break;
          
        case 4: // Washing Machine Boss
          // Machine body
          fill(240);
          rect(-this.size/2, -this.size/2, this.size, this.size, 10);
          
          // Door/window
          fill(200);
          ellipse(0, 0, this.size * 0.6, this.size * 0.6);
          fill(150, 200, 255, 150);
          ellipse(0, 0, this.size * 0.5, this.size * 0.5);
          
          // Control panel
          fill(50);
          rect(-this.size/2 + 10, -this.size/2 + 10, this.size - 20, this.size/6);
          
          // Buttons
          fill(255, 0, 0);
          ellipse(-this.size/4, -this.size/2 + 20, this.size/10, this.size/10);
          fill(0, 255, 0);
          ellipse(0, -this.size/2 + 20, this.size/10, this.size/10);
          fill(0, 0, 255);
          ellipse(this.size/4, -this.size/2 + 20, this.size/10, this.size/10);
          
          // Spinning clothes effect
          push();
          rotate(frameCount * 0.1);
          for (let i = 0; i < 5; i++) {
            fill(random(100, 255), random(100, 255), random(100, 255), 150);
            let angle = TWO_PI / 5 * i;
            let x = cos(angle) * this.size/6;
            let y = sin(angle) * this.size/6;
            ellipse(x, y, this.size/8, this.size/8);
          }
          pop();
          break;
      }
    } else {
      // Regular enemy designs
      switch(this.type) {
        case 0: // TV
          fill('green');
          rect(-this.size/2, -this.size/2, this.size, this.size * 0.8, 5);
          fill(50);
          rect(-this.size * 0.4, -this.size * 0.4, this.size * 0.8, this.size * 0.6);
          
          // Antenna
          stroke(0);
          strokeWeight(2);
          line(-this.size * 0.2, -this.size/2, -this.size * 0.3, -this.size * 0.75);
          line(this.size * 0.2, -this.size/2, this.size * 0.3, -this.size * 0.75);
          noStroke();
          
          // Stand
          fill(139, 69, 19);
          rect(-this.size/2, this.size * 0.3, this.size, this.size * 0.2);
          break;
          
        case 1: // Radio
          fill(100, 100, 100);
          rect(-this.size/2, -this.size/3, this.size, this.size/1.5, 5);
          
          // Speaker grille
          fill(50);
          for (let i = -3; i <= 3; i++) {
            for (let j = -3; j <= 3; j++) {
              ellipse(i * 5, j * 5, 2, 2);
            }
          }
          
          // Knobs
          fill(0);
          ellipse(-this.size/3, this.size/6, this.size/10, this.size/10);
          ellipse(this.size/3, this.size/6, this.size/10, this.size/10);
          
          // Antenna
          stroke(0);
          strokeWeight(1);
          line(0, -this.size/3, 0, -this.size/1.5);
          noStroke();
          break;
          
        case 2: // Toaster
          fill(180);
          rect(-this.size/2, -this.size/4, this.size, this.size/2, 5);
          
          // Slots
          fill(30);
          rect(-this.size/3, -this.size/6, this.size/4, this.size/10);
          rect(this.size/12, -this.size/6, this.size/4, this.size/10);
          
          // Lever
          fill(100);
          rect(this.size/3, 0, this.size/10, this.size/4);
          
          // Base
          fill(150);
          rect(-this.size/2, this.size/6, this.size, this.size/10);
          break;
      }
    }
    
    // Health bar for bosses
    if (this.isBoss) {
      let maxHealth = this.type === 2 ? 7 : (this.type === 3 ? 8 : 5);
      let healthWidth = (this.size * 0.8) * (this.health / maxHealth);
      fill(100);
      rect(-this.size * 0.4, -this.size * 0.6, this.size * 0.8, 5);
      fill(255, 0, 0);
      rect(-this.size * 0.4, -this.size * 0.6, healthWidth, 5);
    }
    
    pop();
  }
  
  hits(bullet) {
    let d = dist(this.x, this.y, bullet.x, bullet.y);
    return d < this.size/2 + bullet.size/2;
  }
  
  hitsPlayer(player) {
    let d = dist(this.x, this.y, player.x, player.y);
    return d < this.size/2 + player.size/2;
  }
}

class Bullet {
  constructor(x, y, type, player) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.speed = player.bulletSpeed;
    this.size = player.bulletSize;
    this.angle = atan2(mouseY - y, mouseX - x);
    this.spinAngle = 0;
    this.spinSpeed = 0.2;
    this.trail = [];
    this.maxTrailLength = 5;
  }
  
  update() {
    // Add current position to trail
    this.trail.push({x: this.x, y: this.y});
    
    // Keep trail at max length
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
    
    this.x += cos(this.angle) * this.speed;
    this.y += sin(this.angle) * this.speed;
    this.angle += sin(this.spinAngle) * 0.05;
    this.spinAngle += this.spinSpeed;
  }
  
  show() {
    // Draw trail
    noStroke();
    for (let i = 0; i < this.trail.length; i++) {
      let alpha = map(i, 0, this.trail.length, 50, 200);
      let size = map(i, 0, this.trail.length, this.size * 0.3, this.size * 0.8);
      
      if (this.type === 0) {
        fill(0, 255, 0, alpha);
      } else if (this.type === 1) {
        fill(0, 100, 255, alpha);
      } else {
        fill(255, 50, 50, alpha);
      }
      
      ellipse(this.trail[i].x, this.trail[i].y, size, size);
    }
    
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    
    // Draw glow effect
    if (this.type === 0) {
      for (let i = 3; i > 0; i--) {
        fill(0, 255, 0, 50 / i);
        ellipse(0, 0, this.size * 1.5 * i, this.size * i);
      }
    } else if (this.type === 1) {
      for (let i = 3; i > 0; i--) {
        fill(0, 100, 255, 50 / i);
        ellipse(0, 0, this.size * 1.5 * i, this.size * i);
      }
    } else {
      for (let i = 3; i > 0; i--) {
        fill(255, 50, 50, 50 / i);
        ellipse(0, 0, this.size * 1.5 * i, this.size * i);
      }
    }
    
    if (this.type === 0) { // Xbox-style controller
      // Main body
      fill(0, 200, 0);
      rect(-this.size/2, -this.size/3, this.size, this.size/1.5, this.size/5);
      
      // D-pad
      fill(50);
      ellipse(-this.size/4, 0, this.size/3, this.size/3);
      fill(30);
      rect(-this.size/4 - this.size/12, -this.size/20, this.size/6, this.size/10);
      rect(-this.size/4 - this.size/20, -this.size/12, this.size/10, this.size/6);
      
      // Buttons
      fill(255, 255, 0);
      ellipse(this.size/4, -this.size/10, this.size/8);
      fill(0, 0, 255);
      ellipse(this.size/3, this.size/15, this.size/8);
      fill(255, 0, 0);
      ellipse(this.size/6, this.size/10, this.size/8);
      fill(0, 255, 0);
      ellipse(this.size/2.5, -this.size/20, this.size/8);
      
      // Joysticks
      fill(30);
      ellipse(-this.size/4, 0, this.size/10);
      ellipse(this.size/4, 0, this.size/10);
    } 
    else if (this.type === 1) { // PlayStation-style controller
      // Main body
      fill(50, 50, 200);
      rect(-this.size/2, -this.size/3, this.size, this.size/1.5, this.size/5);
      
      // D-pad
      fill(30);
      rect(-this.size/3, -this.size/10, this.size/5, this.size/5);
      
      // Buttons
      fill(255, 100, 255);
      ellipse(this.size/4, -this.size/10, this.size/8);
      fill(0, 200, 255);
      ellipse(this.size/3, this.size/15, this.size/8);
      fill(255, 50, 50);
      ellipse(this.size/6, this.size/10, this.size/8);
      fill(50, 255, 50);
      ellipse(this.size/2.5, -this.size/20, this.size/8);
      
      // PlayStation logo
      fill(255);
      ellipse(0, 0, this.size/6, this.size/6);
      
      // Joysticks
      fill(30);
      ellipse(-this.size/5, this.size/10, this.size/10);
      ellipse(this.size/5, -this.size/10, this.size/10);
    }
    else { // Nintendo-style controller
      // Main body
      fill(255, 50, 50);
      rect(-this.size/2, -this.size/3, this.size, this.size/1.5, this.size/5);
      
      // D-pad
      fill(30);
      ellipse(-this.size/3, 0, this.size/4, this.size/4);
      fill(50);
      rect(-this.size/3 - this.size/12, -this.size/20, this.size/6, this.size/10);
      rect(-this.size/3 - this.size/20, -this.size/12, this.size/10, this.size/6);
      
      // Buttons
      fill(0);
      ellipse(this.size/4, 0, this.size/6);
      ellipse(this.size/2.5, 0, this.size/6);
      
      // Nintendo logo
      fill(255);
      rect(-this.size/10, -this.size/15, this.size/5, this.size/7.5, 2);
    }
    
    pop();
  }
  
  offscreen() {
    return (this.x < 0 || this.x > width || this.y < 0 || this.y > height);
  }
}

class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 20;
    this.type = floor(random(6));
  }
  
  update() {
    this.y += sin(frameCount * 0.1) * 0.5;
  }
  
  show() {
    push();
    translate(this.x, this.y);
    
    let pulseSize = this.size + sin(frameCount * 0.1) * 3;
    
    if (this.type === 0) {
        fill(255, 165, 0);
        ellipse(0, 0, pulseSize);
        fill(255);
        textAlign(CENTER);
        textSize(12);
        text("BS", 0, 4);
    } else if (this.type === 1) {
        fill(255, 0, 0);
        rect(-pulseSize/2, -pulseSize/2, pulseSize, pulseSize);
        fill(255);
        text("RF", 0, 4);
    } else if (this.type === 2) {
        fill(0, 255, 255);
        triangle(0, -pulseSize, pulseSize/2, pulseSize, -pulseSize/2, pulseSize);
        fill(255);
        text("BZ", 0, 4);
    } else if (this.type === 3) {
        fill(100, 100, 255);
        ellipse(0, 0, pulseSize);
        fill(200, 200, 255);
        ellipse(0, 0, pulseSize * 0.7);
        fill(255);
        text("SH", 0, 4);
    } else if (this.type === 4) {
        fill(255, 50, 50);
        rect(-pulseSize/2, -pulseSize/2, pulseSize, pulseSize, 5);
        fill(255);
        text("FA", 0, 4);
    } else {
        fill(50, 255, 50);
        beginShape();
        for (let i = 0; i < 5; i++) {
          let angle = TWO_PI / 5 * i - HALF_PI;
          let x1 = cos(angle) * pulseSize/2;
          let y1 = sin(angle) * pulseSize/2;
          vertex(x1, y1);
          angle += TWO_PI / 10;
          let x2 = cos(angle) * pulseSize/4;
          let y2 = sin(angle) * pulseSize/4;
          vertex(x2, y2);
        }
        endShape(CLOSE);
        fill(255);
        text("AS", 0, 4);
    }
    pop();
  }
  
  hits(player) {
    let d = dist(this.x, this.y, player.x, player.y);
    return d < this.size/2 + player.size/2;
  }
  
  applyEffect(player) {
    player.powerUpTimer = 300;
    
    if (this.type === 0) {
      player.bulletSpeed = player.baseBulletSpeed * 2;
    } else if (this.type === 1) {
      player.fireRate = 2;
    } else if (this.type === 2) {
      player.bulletSize = player.baseBulletSize * 1.5;
    } else if (this.type === 3) {
      player.shield = true;
    } else if (this.type === 4) {
      player.fullAuto = true;
    } else {
      player.accurateShot = true;
    }
  }
}

function drawBarnBackground() {
  // Create a dynamic arcade-style grid background
  let gridSize = 50;
  let time = frameCount * 0.01;
  
  // Dark background with gradient
  background(20, 20, 40);
  
  // Draw animated grid
  stroke(0, 100, 255, 50);
  strokeWeight(1);
  
  // Horizontal lines
  for (let y = 0; y < height; y += gridSize) {
    let alpha = map(sin(time + y * 0.01), -1, 1, 30, 100);
    stroke(0, 100, 255, alpha);
    line(0, y, width, y);
  }
  
  // Vertical lines
  for (let x = 0; x < width; x += gridSize) {
    let alpha = map(sin(time + x * 0.01), -1, 1, 30, 100);
    stroke(0, 100, 255, alpha);
    line(x, 0, x, height);
  }
  
  // Add some floating particles in the background
  noStroke();
  for (let i = 0; i < 20; i++) {
    let x = (frameCount * 0.5 + i * 100) % width;
    let y = (noise(i, frameCount * 0.01) * height);
    let size = noise(i * 2, frameCount * 0.01) * 5 + 2;
    let alpha = map(sin(frameCount * 0.05 + i), -1, 1, 100, 200);
    
    fill(100, 200, 255, alpha);
    ellipse(x, y, size, size);
  }
  
  // Add some glow effects at the corners
  drawGlowEffect(100, 100, color(0, 100, 255, 50));
  drawGlowEffect(width - 100, 100, color(255, 100, 0, 50));
  drawGlowEffect(100, height - 100, color(255, 0, 100, 50));
  drawGlowEffect(width - 100, height - 100, color(100, 255, 0, 50));
  
  noStroke();
}

function drawGlowEffect(x, y, glowColor) {
  for (let i = 5; i > 0; i--) {
    let size = 100 + sin(frameCount * 0.05) * 20;
    fill(red(glowColor), green(glowColor), blue(glowColor), alpha(glowColor) / i);
    ellipse(x, y, size * i, size * i);
  }
}

function spawnEnemy() {
  let side = floor(random(4));
  let x, y;
  switch(side) {
    case 0: x = random(width); y = -20; break;
    case 1: x = width + 20; y = random(height); break;
    case 2: x = random(width); y = height + 20; break;
    case 3: x = -20; y = random(height); break;
  }
  
  // Determine if this should be a boss
  let isBoss = (level % 5 === 0) || (level > 1 && level % 2 === 0 && random(1) > 0.8);
  
  // Create the enemy
  enemies.push(new Enemy(x, y, isBoss));
}

function spawnPowerUp() {
  let x = random(50, width-50);
  let y = random(50, height-50);
  powerUps.push(new PowerUp(x, y));
}

function levelUp() {
  level++;
  
  if (level > 1) {
    let side = floor(random(4));
    let x, y;
    switch(side) {
      case 0: x = random(width); y = -20; break;
      case 1: x = width + 20; y = random(height); break;
      case 2: x = random(width); y = height + 20; break;
      case 3: x = -20; y = random(height); break;
    }
    
    // Create a boss with a type based on the level
    let boss = new Enemy(x, y, true);
    boss.type = (level % 5); // Cycle through boss types
    
    // Adjust boss properties based on type
    if (boss.type === 1) { // Lamp boss moves faster
      boss.speed *= 1.3;
    } else if (boss.type === 2) { // Mattress boss has more health
      boss.health += 2;
    } else if (boss.type === 3) { // Refrigerator boss is slower but tougher
      boss.speed *= 0.7;
      boss.health += 3;
    } else if (boss.type === 4) { // Washing Machine occasionally changes direction
      boss.directionChangeTimer = 0;
      boss.directionChangeInterval = floor(random(60, 120));
    }
    
    enemies.push(boss);
  }
  
  // Increase enemies needed for next level
  enemiesPerLevel = 10 + level * 2;
}

function showScoreAndLevel() {
  // Draw a semi-transparent header bar
  fill(0, 0, 30, 200);
  rect(0, 0, width, 80);
  
  // Score with glow effect
  drawTextWithGlow(`Score: ${score}`, 60, 40, 24, color(255), color(0, 200, 255, 150));
  
  // Level with glow effect
  drawTextWithGlow(`Level: ${level}`, width-60, 40, 24, color(255), color(255, 100, 0, 150));
  
  // Enemies counter with glow effect
  drawTextWithGlow(`Enemies: ${enemiesKilled}/${enemiesPerLevel}`, width/2, 40, 24, color(255), color(255, 50, 255, 150));
  
  // Blast cooldown
  if (blastCooldown > 0) {
    drawTextWithGlow(`Blast: ${Math.ceil(blastCooldown/60)}s`, width/2, 70, 24, color(255, 0, 0), color(255, 50, 0, 150));
  } else {
    drawTextWithGlow(`Blast Ready (Right-Click or SPACE)`, width/2, 70, 24, color(0, 255, 0), color(0, 255, 50, 150));
  }
}

function drawTextWithGlow(txt, x, y, size, textColor, glowColor) {
  textSize(size);
  
  // Draw glow
  fill(glowColor);
  for (let i = 0; i < 5; i++) {
    text(txt, x + cos(i) * 2, y + sin(i) * 2);
    text(txt, x - cos(i) * 2, y - sin(i) * 2);
  }
  
  // Draw main text
  fill(textColor);
  text(txt, x, y);
}

function showGameOver() {
  // Create a pulsing dark overlay
  let alpha = map(sin(frameCount * 0.05), -1, 1, 150, 200);
  fill(0, alpha);
  rect(0, 0, width, height);
  
  // Draw a glowing game over text
  let pulseSize = map(sin(frameCount * 0.1), -1, 1, 48, 56);
  
  // Glow effect
  for (let i = 5; i > 0; i--) {
    fill(255, 0, 0, 150 / i);
    textSize(pulseSize + i * 2);
    textAlign(CENTER);
    text("Game Over", width/2, height/2 - 20);
  }
  
  // Main text
  fill(255);
  textSize(pulseSize);
  text("Game Over", width/2, height/2 - 20);
  
  // Score and level info with glow
  drawTextWithGlow(`Final Score: ${score}`, width/2, height/2 + 40, 28, color(255), color(0, 200, 255, 150));
  drawTextWithGlow(`Level Reached: ${level}`, width/2, height/2 + 80, 28, color(255), color(255, 100, 0, 150));
  
  // Restart prompt with pulsing effect
  let promptSize = map(sin(frameCount * 0.1), -1, 1, 24, 30);
  drawTextWithGlow("Press Space to restart", width/2, height/2 + 130, promptSize, color(255), color(0, 255, 0, 150));
}

function resetGame() {
  enemies = [];
  bullets = [];
  powerUps = [];
  score = 0;
  level = 1;
  enemiesKilled = 0;
  enemiesPerLevel = 10;
  blastCooldown = 0;
  gameState = "playing";
  player = new Player(width/2, height/2);
}