package com.quiz.controller;

import com.quiz.dto.AuditEvent;
import com.quiz.dto.RunRequest;
import com.quiz.model.LeaderboardResult;
import com.quiz.model.SubmitResponse;
import com.quiz.service.PollOrchestrator;
import com.quiz.service.QuizService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/quiz")
public class QuizController {

    private final PollOrchestrator pollOrchestrator;
    private final QuizService quizService;

    public QuizController(PollOrchestrator pollOrchestrator, QuizService quizService) {
        this.pollOrchestrator = pollOrchestrator;
        this.quizService = quizService;
    }

    @PostMapping("/run")
    public Map<String, String> run(@Valid @RequestBody RunRequest request) {
        String jobId = pollOrchestrator.startRun(request.regNo());
        return Map.of("jobId", jobId, "status", "started");
    }

    @PostMapping("/replay")
    public Map<String, String> replay(@Valid @RequestBody RunRequest request) {
        String jobId = pollOrchestrator.startReplay(request.regNo());
        return Map.of("jobId", jobId, "status", "replay_started");
    }

    @GetMapping(value = "/progress/{jobId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<?> progress(@PathVariable String jobId) {
        return pollOrchestrator.progressStream(jobId);
    }

    @GetMapping("/audit/{jobId}")
    public List<AuditEvent> audit(@PathVariable String jobId) {
        return pollOrchestrator.getAuditLog(jobId);
    }

    @GetMapping("/result")
    public Map<String, Object> result(@RequestParam(required = false) String jobId) {
        LeaderboardResult result = jobId == null ? quizService.getLastResult() : pollOrchestrator.getResult(jobId);
        SubmitResponse submit = jobId == null ? quizService.getLastSubmitResponse() : pollOrchestrator.getSubmitResponse(jobId);
        Map<String, Object> response = new HashMap<>();
        response.put("leaderboardResult", result);
        response.put("submitResponse", submit);
        return response;
    }

    @PostMapping("/submit")
    public Mono<SubmitResponse> submit() {
        LeaderboardResult result = quizService.getLastResult();
        if (result == null) {
            return Mono.just(new SubmitResponse(false, false, 0, 0, "No leaderboard result available"));
        }
        return Mono.just(quizService.submitLeaderboard(result));
    }
}
