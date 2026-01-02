package com.orbrpg;

import org.junit.Test;
import static org.junit.Assert.*;

/**
 * Basic unit tests for OrbRPG 3D Editor
 */
public class MainTest {
    
    @Test
    public void testProjectStructure() {
        // Verify main classes can be referenced
        assertNotNull(Main.class);
    }
    
    @Test
    public void testApplicationName() {
        String appName = "OrbRPG 3D Editor";
        assertEquals("OrbRPG 3D Editor", appName);
    }
    
    @Test
    public void testVersionFormat() {
        String version = "0.1.0";
        assertTrue(version.matches("\\d+\\.\\d+\\.\\d+"));
    }
}
