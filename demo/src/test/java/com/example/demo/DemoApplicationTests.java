package com.example.demo;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class DemoApplicationTests {

    @org.springframework.beans.factory.annotation.Autowired
    private com.example.demo.repository.DashboardRepository dashboardRepository;

    @Test
    @org.springframework.transaction.annotation.Transactional
    void testDashboardRepository() {
        var dashboards = dashboardRepository.findByOwnerUsernameIsNullOrderByIdAsc();
        System.out.println("DASHBOARDS COUNT: " + dashboards.size());
    }
}
