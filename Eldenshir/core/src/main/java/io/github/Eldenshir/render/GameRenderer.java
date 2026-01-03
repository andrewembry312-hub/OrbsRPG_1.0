package io.github.Eldenshir.render;

import com.badlogic.gdx.graphics.Camera;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import io.github.Eldenshir.entity.Player;
import io.github.Eldenshir.world.World;

public class GameRenderer {
    private SpriteBatch batch;
    private ShapeRenderer shapeRenderer;
    private World world;
    private Player player;
    private Camera camera;

    public GameRenderer(World world, Player player, Camera camera) {
        this.world = world;
        this.player = player;
        this.camera = camera;
        this.batch = new SpriteBatch();
        this.shapeRenderer = new ShapeRenderer();
    }

    public void render() {
        batch.setProjectionMatrix(camera.combined);
        shapeRenderer.setProjectionMatrix(camera.combined);

        batch.begin();
        renderMap();
        renderPlayer();
        batch.end();
    }

    private void renderMap() {
        int[][] tiles = world.getTiles();
        
        for (int y = 0; y < World.HEIGHT; y++) {
            for (int x = 0; x < World.WIDTH; x++) {
                int tile = tiles[y][x];
                float px = x * World.TILE_SIZE;
                float py = y * World.TILE_SIZE;

                // Draw based on tile type
                if (tile == 0) {
                    // Grass - light green
                    shapeRenderer.begin(ShapeRenderer.ShapeType.Filled);
                    shapeRenderer.setColor(0.2f, 0.5f, 0.2f, 1f);
                    shapeRenderer.rect(px, py, World.TILE_SIZE, World.TILE_SIZE);
                    shapeRenderer.end();
                    
                    batch.setColor(Color.WHITE);
                } else if (tile == 1) {
                    // Tree/obstacle - brown
                    shapeRenderer.begin(ShapeRenderer.ShapeType.Filled);
                    shapeRenderer.setColor(0.4f, 0.25f, 0.1f, 1f);
                    shapeRenderer.rect(px, py, World.TILE_SIZE, World.TILE_SIZE);
                    shapeRenderer.end();
                }

                // Draw grid
                shapeRenderer.begin(ShapeRenderer.ShapeType.Line);
                shapeRenderer.setColor(0.1f, 0.1f, 0.1f, 0.3f);
                shapeRenderer.rect(px, py, World.TILE_SIZE, World.TILE_SIZE);
                shapeRenderer.end();
            }
        }
    }

    private void renderPlayer() {
        float x = player.getX();
        float y = player.getY();
        float w = player.width;
        float h = player.height;

        // Draw player as blue rectangle
        shapeRenderer.begin(ShapeRenderer.ShapeType.Filled);
        shapeRenderer.setColor(0.2f, 0.5f, 1f, 1f);
        shapeRenderer.rect(x, y, w, h);
        shapeRenderer.end();

        // Draw player outline
        shapeRenderer.begin(ShapeRenderer.ShapeType.Line);
        shapeRenderer.setColor(0.1f, 0.3f, 0.8f, 1f);
        shapeRenderer.rect(x, y, w, h);
        shapeRenderer.end();
    }

    public void dispose() {
        batch.dispose();
        shapeRenderer.dispose();
    }
}
