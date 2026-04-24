package com.quiz.config;

import com.quiz.service.PollOrchestrator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class StartupRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StartupRunner.class);
    private final PollOrchestrator pollOrchestrator;

    public StartupRunner(PollOrchestrator pollOrchestrator) {
        this.pollOrchestrator = pollOrchestrator;
    }

    @Override
    public void run(ApplicationArguments args) {
        String regNo = args.getOptionValues("regNo") != null && !args.getOptionValues("regNo").isEmpty()
                ? args.getOptionValues("regNo").get(0)
                : System.getenv("REG_NO");
        if (regNo != null && !regNo.isBlank()) {
            String jobId = pollOrchestrator.startRun(regNo);
            log.info("startup_run_started regNo={} jobId={}", regNo, jobId);
        }
    }
}
