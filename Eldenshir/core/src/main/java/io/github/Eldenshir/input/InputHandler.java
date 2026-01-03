package io.github.Eldenshir.input;

import com.badlogic.gdx.Input;
import com.badlogic.gdx.InputAdapter;
import io.github.Eldenshir.entity.Player;

public class InputHandler extends InputAdapter {
    private Player player;
    private boolean upPressed;
    private boolean downPressed;
    private boolean leftPressed;
    private boolean rightPressed;

    public InputHandler(Player player) {
        this.player = player;
    }

    @Override
    public boolean keyDown(int keycode) {
        switch (keycode) {
            case Input.Keys.W:
            case Input.Keys.UP:
                upPressed = true;
                return true;
            case Input.Keys.S:
            case Input.Keys.DOWN:
                downPressed = true;
                return true;
            case Input.Keys.A:
            case Input.Keys.LEFT:
                leftPressed = true;
                return true;
            case Input.Keys.D:
            case Input.Keys.RIGHT:
                rightPressed = true;
                return true;
        }
        return false;
    }

    @Override
    public boolean keyUp(int keycode) {
        switch (keycode) {
            case Input.Keys.W:
            case Input.Keys.UP:
                upPressed = false;
                return true;
            case Input.Keys.S:
            case Input.Keys.DOWN:
                downPressed = false;
                return true;
            case Input.Keys.A:
            case Input.Keys.LEFT:
                leftPressed = false;
                return true;
            case Input.Keys.D:
            case Input.Keys.RIGHT:
                rightPressed = false;
                return true;
        }
        return false;
    }

    public void update() {
        // Handle continuous movement
        if (upPressed) {
            player.moveUp();
        }
        if (downPressed) {
            player.moveDown();
        }
        if (leftPressed) {
            player.moveLeft();
        }
        if (rightPressed) {
            player.moveRight();
        }
    }
}
