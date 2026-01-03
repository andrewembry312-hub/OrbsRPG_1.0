package io.github.Eldenshir.world;

public class World {
    public static final int TILE_SIZE = 32;
    public static final int WIDTH = 50;  // tiles
    public static final int HEIGHT = 50; // tiles

    private int[][] tiles;

    public World() {
        tiles = new int[HEIGHT][WIDTH];
        generateBasicMap();
    }

    private void generateBasicMap() {
        // Fill with grass (tile 0)
        for (int y = 0; y < HEIGHT; y++) {
            for (int x = 0; x < WIDTH; x++) {
                tiles[y][x] = 0; // grass
            }
        }
        
        // Add some trees (tile 1) as obstacles
        for (int i = 0; i < 20; i++) {
            int x = (int) (Math.random() * WIDTH);
            int y = (int) (Math.random() * HEIGHT);
            if (x > 5 && y > 5) { // avoid spawn area
                tiles[y][x] = 1; // tree
            }
        }
    }

    public int getTile(int x, int y) {
        if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) {
            return 1; // boundary is solid
        }
        return tiles[y][x];
    }

    public boolean isWalkable(int x, int y) {
        return getTile(x, y) == 0;
    }

    public int getPixelWidth() {
        return WIDTH * TILE_SIZE;
    }

    public int getPixelHeight() {
        return HEIGHT * TILE_SIZE;
    }

    public int[][] getTiles() {
        return tiles;
    }
}
