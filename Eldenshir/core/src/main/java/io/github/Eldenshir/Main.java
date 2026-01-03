package io.github.Eldenshir;

import com.badlogic.gdx.ApplicationAdapter;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.utils.ScreenUtils;
import io.github.Eldenshir.entity.Player;
import io.github.Eldenshir.input.InputHandler;
import io.github.Eldenshir.render.GameRenderer;
import io.github.Eldenshir.world.World;

/** Top-down RPG game implementation. */
public class Main extends ApplicationAdapter {
    private World world;
    private Player player;
    private InputHandler inputHandler;
    private GameRenderer renderer;
    private OrthographicCamera camera;

    @Override
    public void create() {
        // Initialize world
        world = new World();
        
        // Create player at spawn position
        player = new Player(256, 256);
        
        // Setup camera (1280x720 viewport)
        camera = new OrthographicCamera();
        camera.setToOrtho(false, 1280, 720);
        
        // Setup input
        inputHandler = new InputHandler(player);
        Gdx.input.setInputProcessor(inputHandler);
        
        // Setup renderer
        renderer = new GameRenderer(world, player, camera);
    }

    @Override
    public void render() {
        // Update
        float delta = Gdx.graphics.getDeltaTime();
        inputHandler.update();
        player.update(delta);
        
        // Update camera to follow player
        camera.position.x = player.getCenterX();
        camera.position.y = player.getCenterY();
        camera.update();
        
        // Clear screen
        ScreenUtils.clear(0.1f, 0.1f, 0.1f, 1f);
        
        // Render
        renderer.render();
    }

    @Override
    public void resize(int width, int height) {
        // If the window is minimized on a desktop (LWJGL3) platform, width and height are 0, which causes problems.
        // In that case, we don't resize anything, and wait for the window to be a normal size before updating.
        if(width <= 0 || height <= 0) return;

        camera.viewportWidth = width;
        camera.viewportHeight = height;
        camera.update();
    }

    @Override
    public void dispose() {
        renderer.dispose();
    }
}