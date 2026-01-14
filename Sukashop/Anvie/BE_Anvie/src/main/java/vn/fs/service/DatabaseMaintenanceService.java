package vn.fs.service;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class DatabaseMaintenanceService {

    private static final Set<String> ALLOWED_TABLES = new HashSet<>(
            Arrays.asList("products", "categories", "users"));

    @Autowired
    JdbcTemplate jdbcTemplate;

    public void resetAutoIncrementIfEmpty(String tableName, long count) {
        if (count != 0) {
            return;
        }
        if (!ALLOWED_TABLES.contains(tableName)) {
            return;
        }
        jdbcTemplate.execute("ALTER TABLE " + tableName + " AUTO_INCREMENT = 1");
    }
}
