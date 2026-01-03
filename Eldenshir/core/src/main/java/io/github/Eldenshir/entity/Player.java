package io.github.Eldenshir.entity;

import com.badlogic.gdx.math.Vector2;

public class Player {
    public Vector2 position;
    public Vector2 velocity;
    public float speed = 150f; // pixels per second
    public float width = 32f;
    public float height = 48f;

    public Player(float startX, float startY) {
        position = new Vector2(startX, startY);
        velocity = new Vector2(0, 0);
    }

    public void update(float delta) {
        // Update position based on velocity
        position.x += velocity.x * speed * delta;
        position.y += velocity.y * speed * delta;
        
        // Reset velocity each frame (will be set by input)
        velocity.set(0, 0);
    }

    public void moveUp() {
        velocity.y = 1;
    }

    public void moveDown() {
        velocity.y = -1;
    }

    public void moveLeft() {
        velocity.x = -1;
    }

    public void moveRight() {
        velocity.x = 1;
    }

    public float getX() {
        return position.x;
    }

    public float getY() {
        return position.y;
    }

    public float getCenterX() {
        return position.x + width / 2;
    }

    public float getCenterY() {
        return position.y + height / 2;
    }
}
